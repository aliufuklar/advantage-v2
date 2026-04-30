"""
AdVantage API v3 - Orders Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
from app.api.schemas.orders import OrderCreate, OrderUpdate, OrderResponse, ChecklistItemUpdate, TimelineEntry
from app.api.routes.auth import get_current_user, require_permissions
from app.core.database import db
from app.core.permissions import Permission

router = APIRouter()


def calculate_totals(items: List[dict], tax_rate: float) -> dict:
    """Calculate subtotal, tax amount, and total from items"""
    subtotal = sum(item.get("quantity", 1) * item.get("unitPrice", 0) for item in items)
    tax_amount = subtotal * (tax_rate / 100)
    total = subtotal + tax_amount
    return {"subtotal": subtotal, "taxAmount": tax_amount, "total": total}


def build_timeline_entry(action: str, user_id: str, details: str = None) -> dict:
    """Build a timeline entry for order history"""
    entry = {
        "action": action,
        "userId": user_id,
        "timestamp": datetime.utcnow().isoformat()
    }
    if details:
        entry["details"] = details
    return entry


@router.get("/", response_model=List[OrderResponse])
async def list_orders(
    current_user: dict = Depends(require_permissions([Permission.ORDERS_READ.value]))
):
    """List all orders"""
    cursor = db.db.orders.find()
    orders = await cursor.to_list(length=100)
    return orders


@router.post("/", response_model=OrderResponse)
async def create_order(
    order: OrderCreate,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_CREATE.value]))
):
    """Create a new order"""
    count = await db.db.orders.count_documents({})
    order_doc = order.model_dump()

    # Auto-calculate totals
    tax_rate = order_doc.get("taxRate", 20)
    totals = calculate_totals(order_doc.get("items", []), tax_rate)
    order_doc.update(totals)

    order_doc["orderNumber"] = f"SIP-{count + 1:04d}"
    order_doc["createdBy"] = str(current_user["_id"])
    order_doc["createdAt"] = datetime.utcnow().isoformat()
    order_doc["timeline"] = [build_timeline_entry("created", str(current_user["_id"]))]
    order_doc["status"] = order_doc.get("status", "pending")
    order_doc["priority"] = order_doc.get("priority", "normal")

    result = await db.db.orders.insert_one(order_doc)
    order_doc["_id"] = result.inserted_id
    return order_doc


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_READ.value]))
):
    """Get order by ID"""
    order = await db.db.orders.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: str,
    order: OrderUpdate,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_UPDATE.value]))
):
    """Update order"""
    existing = await db.db.orders.find_one({"_id": order_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Order not found")

    order_doc = order.model_dump(exclude_unset=True)

    # Auto-calculate totals if items changed
    if "items" in order_doc or "taxRate" in order_doc:
        items = order_doc.get("items", existing.get("items", []))
        tax_rate = order_doc.get("taxRate", existing.get("taxRate", 20))
        totals = calculate_totals(items, tax_rate)
        order_doc.update(totals)

    order_doc["updatedAt"] = datetime.utcnow().isoformat()

    # Handle status change with timeline
    if "status" in order_doc and order_doc["status"] != existing.get("status"):
        timeline_entry = build_timeline_entry(
            "status_changed",
            str(current_user["_id"]),
            f"Status changed from {existing.get('status')} to {order_doc['status']}"
        )
        order_doc["timeline"] = existing.get("timeline", []) + [timeline_entry]

    # Handle checklist item toggle
    if "checklist" in order_doc:
        updated_checklist = []
        for item in order_doc["checklist"]:
            if isinstance(item, dict) and "completed" in item:
                # Find the existing item to preserve completedAt/completedBy
                existing_item = next(
                    (ei for ei in existing.get("checklist", []) if ei.get("id") == item.get("id")),
                    None
                )
                if existing_item and item["completed"] and not existing_item.get("completed"):
                    # Newly completed
                    item["completedAt"] = datetime.utcnow().isoformat()
                    item["completedBy"] = str(current_user["_id"])
                elif existing_item and not item["completed"] and existing_item.get("completed"):
                    # Uncompleted
                    item["completedAt"] = None
                    item["completedBy"] = None
            updated_checklist.append(item if isinstance(item, dict) else item.model_dump())
        order_doc["checklist"] = updated_checklist

    await db.db.orders.update_one(
        {"_id": order_id},
        {"$set": order_doc}
    )
    updated = await db.db.orders.find_one({"_id": order_id})
    return updated


@router.delete("/{order_id}")
async def delete_order(
    order_id: str,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_DELETE.value]))
):
    """Delete order (soft delete)"""
    await db.db.orders.update_one(
        {"_id": order_id},
        {"$set": {"isDeleted": True}}
    )
    return {"message": "Order deleted"}
