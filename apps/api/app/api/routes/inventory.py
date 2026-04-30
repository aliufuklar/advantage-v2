"""
AdVantage API v3 - Inventory Routes
"""
from fastapi import APIRouter, HTTPException
from typing import List
from app.api.schemas.inventory import InventoryCreate, InventoryUpdate, InventoryResponse, StockAlert
from app.api.routes.auth import get_current_user
from app.core.database import db

router = APIRouter()


@router.get("/", response_model=List[InventoryResponse])
async def list_inventory(current_user: dict = get_current_user):
    """List all inventory records"""
    cursor = db.db.inventory.find()
    inventory = await cursor.to_list(length=100)
    return inventory


@router.post("/", response_model=InventoryResponse)
async def create_inventory(inventory: InventoryCreate, current_user: dict = get_current_user):
    """Create or update inventory"""
    inventory_doc = inventory.model_dump()
    existing = await db.db.inventory.find_one({"category": inventory.category})
    if existing:
        result = await db.db.inventory.update_one(
            {"category": inventory.category},
            {"$set": {"items": inventory.items}}
        )
        updated = await db.db.inventory.find_one({"category": inventory.category})
        return updated
    result = await db.db.inventory.insert_one(inventory_doc)
    inventory_doc["_id"] = result.inserted_id
    return inventory_doc


@router.get("/alerts", response_model=List[StockAlert])
async def get_stock_alerts(current_user: dict = get_current_user):
    """Get stock alerts"""
    alerts = []
    cursor = db.db.inventory.find({})
    async for inv in cursor:
        for item in inv.get("items", []):
            min_stock = item.get("minStock", 10)
            if item.get("quantity", 0) < min_stock:
                alerts.append(StockAlert(
                    productId=item.get("productId", ""),
                    productName=item.get("productName", ""),
                    currentStock=item.get("quantity", 0),
                    minStock=min_stock
                ))
    return alerts


@router.put("/{inventory_id}", response_model=InventoryResponse)
async def update_inventory(inventory_id: str, inventory: InventoryUpdate, current_user: dict = get_current_user):
    """Update inventory"""
    inventory_doc = inventory.model_dump(exclude_unset=True)
    result = await db.db.inventory.update_one(
        {"_id": inventory_id},
        {"$set": inventory_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inventory not found")
    updated = await db.db.inventory.find_one({"_id": inventory_id})
    return updated