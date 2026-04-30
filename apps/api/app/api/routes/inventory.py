"""
AdVantage API v3 - Inventory Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime
from app.api.schemas.inventory import (
    Product, ProductCreate, ProductUpdate, ProductResponse,
    StockMovement, StockMovementCreate, StockMovementResponse,
    Warehouse, WarehouseCreate, WarehouseResponse,
    StockTake, StockTakeCreate, StockTakeResponse, StockTakeItem,
    StockAlert, InventoryResponse, InventoryCreate, InventoryUpdate
)
from app.api.routes.auth import get_current_user, require_permissions
from app.core.database import db
from app.core.permissions import Permission
from bson import ObjectId

router = APIRouter()


# Product endpoints
@router.get("/products", response_model=List[ProductResponse])
async def list_products(
    category: Optional[str] = None,
    location: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_READ.value]))
):
    """List all products in catalog"""
    query = {}
    if category:
        query["category"] = category
    if location:
        query["location"] = location
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}}
        ]

    cursor = db.db.products.find(query)
    products = await cursor.to_list(length=1000)
    return products


@router.post("/products", response_model=ProductResponse)
async def create_product(
    product: ProductCreate,
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_CREATE.value]))
):
    """Create a new product"""
    product_doc = product.model_dump()
    product_doc["createdAt"] = datetime.utcnow().isoformat()
    product_doc["updatedAt"] = datetime.utcnow().isoformat()

    # Check for duplicate SKU
    existing = await db.db.products.find_one({"sku": product.sku})
    if existing:
        raise HTTPException(status_code=400, detail="Product with this SKU already exists")

    result = await db.db.products.insert_one(product_doc)
    product_doc["_id"] = result.inserted_id
    return product_doc


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_READ.value]))
):
    """Get a single product by ID"""
    try:
        product = await db.db.products.find_one({"_id": ObjectId(product_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID format")

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product: ProductUpdate,
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_UPDATE.value]))
):
    """Update a product"""
    product_doc = product.model_dump(exclude_unset=True)
    product_doc["updatedAt"] = datetime.utcnow().isoformat()

    try:
        result = await db.db.products.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": product_doc}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID format")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    updated = await db.db.products.find_one({"_id": ObjectId(product_id)})
    return updated


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_DELETE.value]))
):
    """Delete a product"""
    try:
        result = await db.db.products.delete_one({"_id": ObjectId(product_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID format")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    return {"message": "Product deleted successfully"}


# Stock Movement endpoints
@router.get("/movements", response_model=List[StockMovementResponse])
async def list_stock_movements(
    productId: Optional[str] = None,
    movementType: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_READ.value]))
):
    """List stock movements with optional filters"""
    query = {}
    if productId:
        query["productId"] = productId
    if movementType:
        query["type"] = movementType
    if startDate or endDate:
        query["date"] = {}
        if startDate:
            query["date"]["$gte"] = startDate
        if endDate:
            query["date"]["$lte"] = endDate

    cursor = db.db.stock_movements.find(query).sort("date", -1)
    movements = await cursor.to_list(length=1000)
    return movements


@router.post("/movements", response_model=StockMovementResponse)
async def create_stock_movement(
    movement: StockMovementCreate,
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_CREATE.value]))
):
    """Record a stock movement (in/out/adjustment)"""
    movement_doc = movement.model_dump()
    movement_doc["createdAt"] = datetime.utcnow().isoformat()
    movement_doc["createdBy"] = current_user.get("username", "unknown")

    # Set date if not provided
    if not movement_doc.get("date"):
        movement_doc["date"] = datetime.utcnow().isoformat()

    # Update product current stock
    quantity_change = movement.quantity if movement.type == "in" else -movement.quantity

    try:
        product_oid = ObjectId(movement.productId)
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID format")

    product = await db.db.products.find_one({"_id": product_oid})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Update stock
    new_stock = product.get("currentStock", 0) + quantity_change
    if new_stock < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock for this operation")

    await db.db.products.update_one(
        {"_id": product_oid},
        {"$set": {"currentStock": new_stock, "updatedAt": datetime.utcnow().isoformat()}}
    )

    result = await db.db.stock_movements.insert_one(movement_doc)
    movement_doc["_id"] = result.inserted_id
    return movement_doc


@router.get("/movements/{movement_id}", response_model=StockMovementResponse)
async def get_stock_movement(
    movement_id: str,
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_READ.value]))
):
    """Get a single stock movement"""
    try:
        movement = await db.db.stock_movements.find_one({"_id": ObjectId(movement_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid movement ID format")

    if not movement:
        raise HTTPException(status_code=404, detail="Stock movement not found")
    return movement


# Warehouse endpoints
@router.get("/warehouses", response_model=List[WarehouseResponse])
async def list_warehouses(
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_READ.value]))
):
    """List all warehouses"""
    cursor = db.db.warehouses.find({})
    warehouses = await cursor.to_list(length=100)
    return warehouses


@router.post("/warehouses", response_model=WarehouseResponse)
async def create_warehouse(
    warehouse: WarehouseCreate,
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_CREATE.value]))
):
    """Create a new warehouse"""
    warehouse_doc = warehouse.model_dump()
    warehouse_doc["createdAt"] = datetime.utcnow().isoformat()

    # Check for duplicate code
    existing = await db.db.warehouses.find_one({"code": warehouse.code})
    if existing:
        raise HTTPException(status_code=400, detail="Warehouse with this code already exists")

    result = await db.db.warehouses.insert_one(warehouse_doc)
    warehouse_doc["_id"] = result.inserted_id
    return warehouse_doc


@router.put("/warehouses/{warehouse_id}", response_model=WarehouseResponse)
async def update_warehouse(
    warehouse_id: str,
    warehouse: WarehouseCreate,
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_UPDATE.value]))
):
    """Update a warehouse"""
    warehouse_doc = warehouse.model_dump(exclude_unset=True)

    try:
        result = await db.db.warehouses.update_one(
            {"_id": ObjectId(warehouse_id)},
            {"$set": warehouse_doc}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid warehouse ID format")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    updated = await db.db.warehouses.find_one({"_id": ObjectId(warehouse_id)})
    return updated


# Stock Take endpoints
@router.get("/stocktakes", response_model=List[StockTakeResponse])
async def list_stocktakes(
    status: Optional[str] = None,
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_READ.value]))
):
    """List all stocktakes"""
    query = {}
    if status:
        query["status"] = status

    cursor = db.db.stocktakes.find(query).sort("date", -1)
    stocktakes = await cursor.to_list(length=100)
    return stocktakes


@router.post("/stocktakes", response_model=StockTakeResponse)
async def create_stocktake(
    stocktake: StockTakeCreate,
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_CREATE.value]))
):
    """Create a new stocktake"""
    stocktake_doc = stocktake.model_dump()
    stocktake_doc["status"] = "in_progress"
    stocktake_doc["createdBy"] = current_user.get("username", "unknown")
    stocktake_doc["createdAt"] = datetime.utcnow().isoformat()

    # Get all products to initialize items
    products = await db.db.products.find({}).to_list(length=1000)
    items = []
    for product in products:
        items.append(StockTakeItem(
            productId=str(product["_id"]),
            productName=product.get("name", ""),
            sku=product.get("sku", ""),
            countedQuantity=0,
            systemQuantity=product.get("currentStock", 0),
            variance=-product.get("currentStock", 0)
        ))

    stocktake_doc["items"] = [item.model_dump() for item in items]

    result = await db.db.stocktakes.insert_one(stocktake_doc)
    stocktake_doc["_id"] = result.inserted_id
    return stocktake_doc


@router.get("/stocktakes/{stocktake_id}", response_model=StockTakeResponse)
async def get_stocktake(
    stocktake_id: str,
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_READ.value]))
):
    """Get a stocktake by ID"""
    try:
        stocktake = await db.db.stocktakes.find_one({"_id": ObjectId(stocktake_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid stocktake ID format")

    if not stocktake:
        raise HTTPException(status_code=404, detail="Stocktake not found")
    return stocktake


@router.put("/stocktakes/{stocktake_id}", response_model=StockTakeResponse)
async def update_stocktake(
    stocktake_id: str,
    stocktake: StockTake,
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_UPDATE.value]))
):
    """Update a stocktake (submit counts)"""
    stocktake_doc = stocktake.model_dump(exclude_unset=True)

    try:
        result = await db.db.stocktakes.update_one(
            {"_id": ObjectId(stocktake_id)},
            {"$set": stocktake_doc}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid stocktake ID format")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Stocktake not found")

    updated = await db.db.stocktakes.find_one({"_id": ObjectId(stocktake_id)})
    return updated


@router.post("/stocktakes/{stocktake_id}/complete", response_model=StockTakeResponse)
async def complete_stocktake(
    stocktake_id: str,
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_UPDATE.value]))
):
    """Complete a stocktake and update inventory"""
    stocktake = await db.db.stocktakes.find_one({"_id": ObjectId(stocktake_id)})
    if not stocktake:
        raise HTTPException(status_code=404, detail="Stocktake not found")

    # Update inventory based on counted quantities
    for item in stocktake.get("items", []):
        product_oid = ObjectId(item["productId"])
        await db.db.products.update_one(
            {"_id": product_oid},
            {"$set": {"currentStock": item["countedQuantity"], "updatedAt": datetime.utcnow().isoformat()}}
        )

    # Mark stocktake as completed
    await db.db.stocktakes.update_one(
        {"_id": ObjectId(stocktake_id)},
        {"$set": {"status": "completed", "completedAt": datetime.utcnow().isoformat()}}
    )

    updated = await db.db.stocktakes.find_one({"_id": ObjectId(stocktake_id)})
    return updated


# Stock Alerts
@router.get("/alerts", response_model=List[StockAlert])
async def get_stock_alerts(
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_READ.value]))
):
    """Get stock alerts for products below min stock level"""
    alerts = []
    cursor = db.db.products.find({})
    async for product in cursor:
        min_stock = product.get("minStock", 0)
        current_stock = product.get("currentStock", 0)
        if current_stock < min_stock:
            # Determine alert level
            if current_stock == 0:
                alert_level = "critical"
            elif current_stock <= min_stock * 0.5:
                alert_level = "critical"
            elif current_stock <= min_stock * 0.75:
                alert_level = "warning"
            else:
                alert_level = "low"

            alerts.append(StockAlert(
                productId=str(product["_id"]),
                productName=product.get("name", ""),
                currentStock=current_stock,
                minStock=min_stock,
                alertLevel=alert_level
            ))
    return alerts


# Inventory Valuation
@router.get("/valuation")
async def get_inventory_valuation(
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_READ.value]))
):
    """Get total inventory valuation"""
    pipeline = [
        {"$group": {
            "_id": None,
            "totalValue": {"$sum": {"$multiply": ["$currentStock", "$unitCost"]}},
            "totalProducts": {"$sum": 1},
            "totalUnits": {"$sum": "$currentStock"}
        }}
    ]
    result = await db.db.products.aggregate(pipeline).to_list(length=1)

    if not result:
        return {"totalValue": 0, "totalProducts": 0, "totalUnits": 0}

    return result[0]


# Legacy inventory endpoints for backward compatibility
@router.get("/", response_model=List[InventoryResponse])
async def list_inventory(
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_READ.value]))
):
    """List all inventory records (legacy)"""
    cursor = db.db.inventory.find()
    inventory = await cursor.to_list(length=100)
    return inventory


@router.post("/", response_model=InventoryResponse)
async def create_inventory(
    inventory: InventoryCreate,
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_CREATE.value]))
):
    """Create or update inventory (legacy)"""
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


@router.put("/{inventory_id}", response_model=InventoryResponse)
async def update_inventory(
    inventory_id: str,
    inventory: InventoryUpdate,
    current_user: dict = Depends(require_permissions([Permission.INVENTORY_UPDATE.value]))
):
    """Update inventory (legacy)"""
    inventory_doc = inventory.model_dump(exclude_unset=True)
    result = await db.db.inventory.update_one(
        {"_id": inventory_id},
        {"$set": inventory_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inventory not found")
    updated = await db.db.inventory.find_one({"_id": inventory_id})
    return updated
