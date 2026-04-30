"""
AdVantage API v3 - Orders Routes
"""
from fastapi import APIRouter, HTTPException
from typing import List
from app.api.schemas.orders import OrderCreate, OrderUpdate, OrderResponse
from app.api.routes.auth import get_current_user
from app.core.database import db

router = APIRouter()


@router.get("/", response_model=List[OrderResponse])
async def list_orders(current_user: dict = get_current_user):
    """List all orders"""
    cursor = db.db.orders.find()
    orders = await cursor.to_list(length=100)
    return orders


@router.post("/", response_model=OrderResponse)
async def create_order(order: OrderCreate, current_user: dict = get_current_user):
    """Create a new order"""
    count = await db.db.orders.count_documents({})
    order_doc = order.model_dump()
    order_doc["orderNumber"] = f"SIP-{count + 1:04d}"
    order_doc["createdBy"] = str(current_user["_id"])
    order_doc["createdAt"] = datetime.utcnow().isoformat()
    result = await db.db.orders.insert_one(order_doc)
    order_doc["_id"] = result.inserted_id
    return order_doc


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, current_user: dict = get_current_user):
    """Get order by ID"""
    order = await db.db.orders.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(order_id: str, order: OrderUpdate, current_user: dict = get_current_user):
    """Update order"""
    order_doc = order.model_dump(exclude_unset=True)
    order_doc["updatedAt"] = datetime.utcnow().isoformat()
    result = await db.db.orders.update_one(
        {"_id": order_id},
        {"$set": order_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    updated = await db.db.orders.find_one({"_id": order_id})
    return updated


@router.delete("/{order_id}")
async def delete_order(order_id: str, current_user: dict = get_current_user):
    """Delete order (soft delete)"""
    await db.db.orders.update_one(
        {"_id": order_id},
        {"$set": {"isDeleted": True}}
    )
    return {"message": "Order deleted"}