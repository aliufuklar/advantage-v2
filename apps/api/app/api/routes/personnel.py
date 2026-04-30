"""
AdVantage API v3 - Personnel Routes
"""
from fastapi import APIRouter, HTTPException
from typing import List
from app.api.schemas.personnel import PersonnelCreate, PersonnelUpdate, PersonnelResponse, OvertimeRecord, LeaveRecord
from app.api.routes.auth import get_current_user
from app.core.database import db

router = APIRouter()


@router.get("/", response_model=List[PersonnelResponse])
async def list_personnel(current_user: dict = get_current_user):
    """List all personnel"""
    cursor = db.db.personnel.find({"isActive": True})
    personnel_list = await cursor.to_list(length=100)
    return personnel_list


@router.post("/", response_model=PersonnelResponse)
async def create_personnel(personnel: PersonnelCreate, current_user: dict = get_current_user):
    """Create a new personnel"""
    count = await db.db.personnel.count_documents({})
    personnel_doc = personnel.model_dump()
    personnel_doc["personnelNumber"] = f"PER-{count + 1:04d}"
    personnel_doc["createdAt"] = datetime.utcnow().isoformat()
    result = await db.db.personnel.insert_one(personnel_doc)
    personnel_doc["_id"] = result.inserted_id
    return personnel_doc


@router.get("/{personnel_id}", response_model=PersonnelResponse)
async def get_personnel(personnel_id: str, current_user: dict = get_current_user):
    """Get personnel by ID"""
    personnel = await db.db.personnel.find_one({"_id": personnel_id})
    if not personnel:
        raise HTTPException(status_code=404, detail="Personnel not found")
    return personnel


@router.put("/{personnel_id}", response_model=PersonnelResponse)
async def update_personnel(personnel_id: str, personnel: PersonnelUpdate, current_user: dict = get_current_user):
    """Update personnel"""
    personnel_doc = personnel.model_dump(exclude_unset=True)
    result = await db.db.personnel.update_one(
        {"_id": personnel_id},
        {"$set": personnel_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Personnel not found")
    updated = await db.db.personnel.find_one({"_id": personnel_id})
    return updated


@router.delete("/{personnel_id}")
async def delete_personnel(personnel_id: str, current_user: dict = get_current_user):
    """Soft delete personnel"""
    await db.db.personnel.update_one(
        {"_id": personnel_id},
        {"$set": {"isActive": False}}
    )
    return {"message": "Personnel deactivated"}


@router.post("/{personnel_id}/overtime")
async def add_overtime(personnel_id: str, overtime: OvertimeRecord, current_user: dict = get_current_user):
    """Add overtime record"""
    overtime_doc = overtime.model_dump()
    result = await db.db.personnel.update_one(
        {"_id": personnel_id},
        {"$push": {"overtime": overtime_doc}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Personnel not found")
    return {"message": "Overtime added"}


@router.post("/{personnel_id}/leave")
async def add_leave(personnel_id: str, leave: LeaveRecord, current_user: dict = get_current_user):
    """Add leave record"""
    leave_doc = leave.model_dump()
    result = await db.db.personnel.update_one(
        {"_id": personnel_id},
        {"$push": {"leave": leave_doc}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Personnel not found")
    return {"message": "Leave added"}