"""
AdVantage API v3 - Discoveries Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime
from app.api.schemas.discoveries import (
    DiscoveryCreate, DiscoveryUpdate, DiscoveryResponse,
    DiscoveryStageUpdate, DiscoveryStatus, TimelineEntry
)
from app.api.routes.auth import get_current_user, require_permissions
from app.core.database import db
from app.core.permissions import Permission

router = APIRouter()


@router.get("/", response_model=List[DiscoveryResponse])
async def list_discoveries(
    status: Optional[str] = None,
    customerId: Optional[str] = None,
    priority: Optional[str] = None,
    current_user: dict = Depends(require_permissions([Permission.DISCOVERIES_READ.value]))
):
    """List all discoveries with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if customerId:
        query["customerId"] = customerId
    if priority:
        query["priority"] = priority

    cursor = db.db.discoveries.find(query)
    discoveries = await cursor.to_list(length=500)
    return discoveries


@router.post("/", response_model=DiscoveryResponse)
async def create_discovery(
    discovery: DiscoveryCreate,
    current_user: dict = Depends(require_permissions([Permission.DISCOVERIES_CREATE.value]))
):
    """Create a new discovery"""
    count = await db.db.discoveries.count_documents({})
    discovery_doc = discovery.model_dump()
    discovery_doc["discoveryNumber"] = f"KEŞ-{count + 1:04d}"
    discovery_doc["createdBy"] = str(current_user["_id"])
    discovery_doc["createdAt"] = datetime.utcnow().isoformat()
    discovery_doc["status"] = DiscoveryStatus.NEW.value
    discovery_doc["timeline"] = [
        {
            "timestamp": datetime.utcnow().isoformat(),
            "action": "created",
            "userId": str(current_user["_id"]),
            "userName": current_user.get("fullName", "System"),
            "details": f"Discovery created: {discovery.title}"
        }
    ]

    result = await db.db.discoveries.insert_one(discovery_doc)
    discovery_doc["_id"] = result.inserted_id
    return discovery_doc


@router.get("/{discovery_id}", response_model=DiscoveryResponse)
async def get_discovery(
    discovery_id: str,
    current_user: dict = Depends(require_permissions([Permission.DISCOVERIES_READ.value]))
):
    """Get discovery by ID"""
    discovery = await db.db.discoveries.find_one({"_id": discovery_id})
    if not discovery:
        raise HTTPException(status_code=404, detail="Discovery not found")
    return discovery


@router.put("/{discovery_id}", response_model=DiscoveryResponse)
async def update_discovery(
    discovery_id: str,
    discovery: DiscoveryUpdate,
    current_user: dict = Depends(require_permissions([Permission.DISCOVERIES_UPDATE.value]))
):
    """Update discovery with timeline entry"""
    discovery_doc = discovery.model_dump(exclude_unset=True)
    discovery_doc["updatedAt"] = datetime.utcnow().isoformat()

    # Build timeline entry for updates
    changes = []
    for key, value in discovery_doc.items():
        if key not in ["updatedAt"]:
            changes.append(f"{key}: {value}")

    timeline_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "action": "updated",
        "userId": str(current_user["_id"]),
        "userName": current_user.get("fullName", "System"),
        "details": f"Updated: {', '.join(changes)}" if changes else "Discovery updated"
    }

    # Add timeline entry to the update
    result = await db.db.discoveries.update_one(
        {"_id": discovery_id},
        {
            "$set": discovery_doc,
            "$push": {"timeline": timeline_entry}
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Discovery not found")

    updated = await db.db.discoveries.find_one({"_id": discovery_id})
    return updated


@router.patch("/{discovery_id}/stage", response_model=DiscoveryResponse)
async def update_discovery_stage(
    discovery_id: str,
    stage_update: DiscoveryStageUpdate,
    current_user: dict = Depends(require_permissions([Permission.DISCOVERIES_UPDATE.value]))
):
    """Update discovery stage (for Kanban drag-and-drop)"""
    old_discovery = await db.db.discoveries.find_one({"_id": discovery_id})
    if not old_discovery:
        raise HTTPException(status_code=404, detail="Discovery not found")

    old_status = old_discovery.get("status", "new")
    new_status = stage_update.status.value

    # Map Turkish column names to status values
    status_map = {
        "yeni": "new",
        "devam-ediyor": "in_progress",
        "tamamlandı": "completed",
        "new": "new",
        "in_progress": "in_progress",
        "completed": "completed"
    }

    normalized_status = status_map.get(new_status, new_status)

    timeline_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "action": "status_changed",
        "userId": str(current_user["_id"]),
        "userName": current_user.get("fullName", "System"),
        "details": f"Status changed from {old_status} to {normalized_status}"
    }

    result = await db.db.discoveries.update_one(
        {"_id": discovery_id},
        {
            "$set": {
                "status": normalized_status,
                "updatedAt": datetime.utcnow().isoformat()
            },
            "$push": {"timeline": timeline_entry}
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Discovery not found")

    updated = await db.db.discoveries.find_one({"_id": discovery_id})
    return updated


@router.post("/{discovery_id}/convert-to-order", response_model=dict)
async def convert_discovery_to_order(
    discovery_id: str,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_CREATE.value]))
):
    """Convert a completed discovery to an order"""
    discovery = await db.db.discoveries.find_one({"_id": discovery_id})
    if not discovery:
        raise HTTPException(status_code=404, detail="Discovery not found")

    if discovery.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Only completed discoveries can be converted to orders")

    # Check if already converted
    if discovery.get("orderId"):
        raise HTTPException(status_code=400, detail="Discovery already converted to an order")

    # Create order from discovery
    order_count = await db.db.orders.count_documents({})
    order_doc = {
        "orderNumber": f"SIP-{order_count + 1:04d}",
        "title": discovery.get("title", ""),
        "customerId": discovery.get("customerId"),
        "customerName": discovery.get("customerName"),
        "items": [],
        "subtotal": 0,
        "taxRate": 20,
        "taxAmount": 0,
        "total": 0,
        "currency": "TRY",
        "status": "pending",
        "priority": discovery.get("priority", "normal"),
        "dueDate": discovery.get("dueDate"),
        "notes": f"Converted from Discovery: {discovery.get('discoveryNumber')}\n{discovery.get('notes', '')}",
        "checklist": [],
        "timeline": [
            {
                "timestamp": datetime.utcnow().isoformat(),
                "action": "created",
                "userId": str(current_user["_id"]),
                "userName": current_user.get("fullName", "System"),
                "details": f"Order created from Discovery {discovery.get('discoveryNumber')}"
            }
        ],
        "createdBy": str(current_user["_id"]),
        "createdAt": datetime.utcnow().isoformat(),
        "discoveryId": discovery_id,
    }

    result = await db.db.orders.insert_one(order_doc)
    order_id = result.inserted_id

    # Update discovery with order reference
    timeline_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "action": "converted_to_order",
        "userId": str(current_user["_id"]),
        "userName": current_user.get("fullName", "System"),
        "details": f"Converted to Order: {order_doc['orderNumber']}"
    }

    await db.db.discoveries.update_one(
        {"_id": discovery_id},
        {
            "$set": {"orderId": str(order_id)},
            "$push": {"timeline": timeline_entry}
        }
    )

    return {
        "message": "Discovery converted to order successfully",
        "orderId": str(order_id),
        "orderNumber": order_doc["orderNumber"]
    }


@router.delete("/{discovery_id}")
async def delete_discovery(
    discovery_id: str,
    current_user: dict = Depends(require_permissions([Permission.DISCOVERIES_DELETE.value]))
):
    """Delete discovery (soft delete)"""
    result = await db.db.discoveries.update_one(
        {"_id": discovery_id},
        {"$set": {"isDeleted": True, "deletedAt": datetime.utcnow().isoformat()}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Discovery not found")

    return {"message": "Discovery deleted"}


@router.get("/customers/search")
async def search_customers(
    q: str = "",
    current_user: dict = Depends(require_permissions([Permission.DISCOVERIES_READ.value]))
):
    """Search customers for discovery linking"""
    query = {
        "$or": [
            {"legalName": {"$regex": q, "$options": "i"}},
            {"shortName": {"$regex": q, "$options": "i"}},
            {"customerNumber": {"$regex": q, "$options": "i"}}
        ]
    }

    cursor = db.db.customers.find(query).limit(20)
    customers = await cursor.to_list(length=20)

    # Format for frontend
    result = [
        {
            "id": str(c["_id"]),
            "customerNumber": c.get("customerNumber", ""),
            "legalName": c.get("legalName", ""),
            "shortName": c.get("shortName", ""),
            "customerType": c.get("customerType", ""),
        }
        for c in customers
    ]

    return result