"""
AdVantage API v3 - Discoveries Routes
"""
from fastapi import APIRouter, HTTPException
from typing import List
from app.api.schemas.discoveries import DiscoveryCreate, DiscoveryUpdate, DiscoveryResponse
from app.api.routes.auth import get_current_user
from app.core.database import db

router = APIRouter()


@router.get("/", response_model=List[DiscoveryResponse])
async def list_discoveries(current_user: dict = get_current_user):
    """List all discoveries"""
    cursor = db.db.discoveries.find()
    discoveries = await cursor.to_list(length=100)
    return discoveries


@router.post("/", response_model=DiscoveryResponse)
async def create_discovery(discovery: DiscoveryCreate, current_user: dict = get_current_user):
    """Create a new discovery"""
    count = await db.db.discoveries.count_documents({})
    discovery_doc = discovery.model_dump()
    discovery_doc["discoveryNumber"] = f"KEŞ-{count + 1:04d}"
    discovery_doc["createdBy"] = str(current_user["_id"])
    discovery_doc["createdAt"] = datetime.utcnow().isoformat()
    result = await db.db.discoveries.insert_one(discovery_doc)
    discovery_doc["_id"] = result.inserted_id
    return discovery_doc


@router.get("/{discovery_id}", response_model=DiscoveryResponse)
async def get_discovery(discovery_id: str, current_user: dict = get_current_user):
    """Get discovery by ID"""
    discovery = await db.db.discoveries.find_one({"_id": discovery_id})
    if not discovery:
        raise HTTPException(status_code=404, detail="Discovery not found")
    return discovery


@router.put("/{discovery_id}", response_model=DiscoveryResponse)
async def update_discovery(discovery_id: str, discovery: DiscoveryUpdate, current_user: dict = get_current_user):
    """Update discovery"""
    discovery_doc = discovery.model_dump(exclude_unset=True)
    discovery_doc["updatedAt"] = datetime.utcnow().isoformat()
    result = await db.db.discoveries.update_one(
        {"_id": discovery_id},
        {"$set": discovery_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Discovery not found")
    updated = await db.db.discoveries.find_one({"_id": discovery_id})
    return updated


@router.delete("/{discovery_id}")
async def delete_discovery(discovery_id: str, current_user: dict = get_current_user):
    """Delete discovery (soft delete)"""
    await db.db.discoveries.update_one(
        {"_id": discovery_id},
        {"$set": {"isDeleted": True}}
    )
    return {"message": "Discovery deleted"}