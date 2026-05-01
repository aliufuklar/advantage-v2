"""
AdVantage API v3 - Design Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
from app.api.schemas.design import (
    DesignTemplateCreate, DesignTemplateUpdate, DesignTemplateResponse,
    AISketchAnalysisRequest, AISketchAnalysisResponse
)
from app.api.routes.auth import get_current_user, require_permissions
from app.core.database import db
from app.core.permissions import Permission

router = APIRouter()


@router.get("/", response_model=List[DesignTemplateResponse])
async def list_designs(
    current_user: dict = Depends(require_permissions([Permission.QUOTES_READ.value]))
):
    """List all design templates"""
    cursor = db.db.designs.find({"isDeleted": {"$ne": True}}).sort("createdAt", -1)
    designs = await cursor.to_list(length=100)
    return designs


@router.post("/", response_model=DesignTemplateResponse)
async def create_design(
    design: DesignTemplateCreate,
    current_user: dict = Depends(require_permissions([Permission.QUOTES_CREATE.value]))
):
    """Create a new design template"""
    count = await db.db.designs.count_documents({})

    design_doc = design.model_dump()
    design_doc["templateNumber"] = f"DES-{count + 1:04d}"
    design_doc["createdBy"] = str(current_user["_id"])
    design_doc["createdAt"] = datetime.utcnow().isoformat()
    design_doc["updatedAt"] = datetime.utcnow().isoformat()
    design_doc["versions"] = [{
        "version": 1,
        "canvasData": design_doc.get("objects", "[]"),
        "createdAt": datetime.utcnow().isoformat(),
        "createdBy": str(current_user["_id"])
    }]
    design_doc["currentVersion"] = 1

    result = await db.db.designs.insert_one(design_doc)
    design_doc["_id"] = result.inserted_id
    return design_doc


@router.get("/{design_id}", response_model=DesignTemplateResponse)
async def get_design(
    design_id: str,
    current_user: dict = Depends(require_permissions([Permission.QUOTES_READ.value]))
):
    """Get design by ID"""
    design = await db.db.designs.find_one({"_id": design_id})
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    return design


@router.put("/{design_id}", response_model=DesignTemplateResponse)
async def update_design(
    design_id: str,
    design: DesignTemplateUpdate,
    current_user: dict = Depends(require_permissions([Permission.QUOTES_UPDATE.value]))
):
    """Update design template"""
    existing = await db.db.designs.find_one({"_id": design_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Design not found")

    update_data = design.model_dump(exclude_unset=True)
    update_data["updatedAt"] = datetime.utcnow().isoformat()

    # If objects changed, create a new version
    if "objects" in update_data:
        new_version = len(existing.get("versions", [])) + 1
        update_data["versions"] = existing.get("versions", []) + [{
            "version": new_version,
            "canvasData": update_data["objects"],
            "createdAt": datetime.utcnow().isoformat(),
            "createdBy": str(current_user["_id"])
        }]
        update_data["currentVersion"] = new_version

    await db.db.designs.update_one(
        {"_id": design_id},
        {"$set": update_data}
    )

    updated = await db.db.designs.find_one({"_id": design_id})
    return updated


@router.delete("/{design_id}")
async def delete_design(
    design_id: str,
    current_user: dict = Depends(require_permissions([Permission.QUOTES_DELETE.value]))
):
    """Delete design (soft delete)"""
    existing = await db.db.designs.find_one({"_id": design_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Design not found")

    await db.db.designs.update_one(
        {"_id": design_id},
        {"$set": {"isDeleted": True, "updatedAt": datetime.utcnow().isoformat()}}
    )
    return {"message": "Design deleted"}


@router.post("/{design_id}/versions", response_model=DesignTemplateResponse)
async def create_version(
    design_id: str,
    canvasData: str,
    current_user: dict = Depends(require_permissions([Permission.QUOTES_UPDATE.value]))
):
    """Create a new version of the design"""
    existing = await db.db.designs.find_one({"_id": design_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Design not found")

    new_version = len(existing.get("versions", [])) + 1
    versions = existing.get("versions", []) + [{
        "version": new_version,
        "canvasData": canvasData,
        "createdAt": datetime.utcnow().isoformat(),
        "createdBy": str(current_user["_id"])
    }]

    await db.db.designs.update_one(
        {"_id": design_id},
        {"$set": {
            "versions": versions,
            "currentVersion": new_version,
            "updatedAt": datetime.utcnow().isoformat()
        }}
    )

    updated = await db.db.designs.find_one({"_id": design_id})
    return updated


@router.get("/{design_id}/versions", response_model=List[dict])
async def list_versions(
    design_id: str,
    current_user: dict = Depends(require_permissions([Permission.QUOTES_READ.value]))
):
    """List all versions of a design"""
    design = await db.db.designs.find_one({"_id": design_id})
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    return design.get("versions", [])


@router.post("/analyze-sketch", response_model=AISketchAnalysisResponse)
async def analyze_sketch(
    request: AISketchAnalysisRequest,
    current_user: dict = Depends(require_permissions([Permission.QUOTES_READ.value]))
):
    """
    Mock AI sketch analysis endpoint.
    Returns structured response for sketch analysis.
    """
    # Mock implementation - in production, this would call an AI service
    return AISketchAnalysisResponse(
        detectedObjects=[
            {"type": "rectangle", "confidence": 0.95, "bounds": {"x": 50, "y": 50, "width": 200, "height": 100}},
            {"type": "circle", "confidence": 0.88, "bounds": {"x": 300, "y": 200, "radius": 50}},
            {"type": "text", "confidence": 0.92, "content": "Sample Text"}
        ],
        suggestedImprovements=[
            "Consider adding a background gradient for better visual appeal",
            "The circle could be positioned more centrally",
            "Add shadows to improve depth perception"
        ],
        estimatedComplexity="medium",
        recommendedTemplates=["DES-0001", "DES-0003"],
        confidence=0.85
    )