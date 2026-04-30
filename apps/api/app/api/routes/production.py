"""
AdVantage API v3 - Production Routes
BOM (Bill of Materials), Production Orders, and Project Kanban
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
import uuid

from app.api.schemas.production import (
    BOM, BOMCreate, BOMUpdate,
    ProductionOrder, ProductionOrderCreate, ProductionOrderUpdate,
    Project, ProjectCreate, ProjectUpdate,
    ProjectTask, ProjectTaskCreate, ProjectTaskUpdate
)
from app.api.routes.auth import get_current_user, require_permissions
from app.core.database import db
from app.core.permissions import Permission

router = APIRouter()


# ==================== BOM Routes ====================

@router.get("/bom", response_model=List[BOM])
async def list_boms(
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_READ.value]))
):
    """List all BOM records"""
    cursor = db.db.boms.find({"isActive": True}).sort("updatedAt", -1)
    boms = await cursor.to_list(length=500)
    return boms


@router.get("/bom/{bom_id}", response_model=BOM)
async def get_bom(
    bom_id: str,
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_READ.value]))
):
    """Get a single BOM by ID"""
    bom = await db.db.boms.find_one({"_id": bom_id})
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")
    return bom


@router.post("/bom", response_model=BOM)
async def create_bom(
    bom_data: BOMCreate,
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_CREATE.value]))
):
    """Create a new BOM"""
    # Calculate total cost
    total_cost = sum(item.quantity * item.unitCost for item in bom_data.items)

    bom_doc = bom_data.model_dump()
    bom_doc["totalCost"] = total_cost
    bom_doc["version"] = 1
    bom_doc["isActive"] = True
    bom_doc["createdAt"] = datetime.utcnow().isoformat()
    bom_doc["updatedAt"] = datetime.utcnow().isoformat()

    result = await db.db.boms.insert_one(bom_doc)
    bom_doc["_id"] = result.inserted_id
    return bom_doc


@router.put("/bom/{bom_id}", response_model=BOM)
async def update_bom(
    bom_id: str,
    bom_data: BOMUpdate,
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_UPDATE.value]))
):
    """Update a BOM"""
    existing = await db.db.boms.find_one({"_id": bom_id})
    if not existing:
        raise HTTPException(status_code=404, detail="BOM not found")

    update_data = bom_data.model_dump(exclude_unset=True)

    # Recalculate total cost if items changed
    if "items" in update_data:
        items = update_data["items"]
        update_data["totalCost"] = sum(item.get("quantity", 0) * item.get("unitCost", 0) for item in items)
        # Increment version
        update_data["version"] = existing.get("version", 1) + 1

    update_data["updatedAt"] = datetime.utcnow().isoformat()

    await db.db.boms.update_one(
        {"_id": bom_id},
        {"$set": update_data}
    )

    updated = await db.db.boms.find_one({"_id": bom_id})
    return updated


@router.delete("/bom/{bom_id}")
async def delete_bom(
    bom_id: str,
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_DELETE.value]))
):
    """Soft delete a BOM (set isActive to False)"""
    result = await db.db.boms.update_one(
        {"_id": bom_id},
        {"$set": {"isActive": False, "updatedAt": datetime.utcnow().isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="BOM not found")
    return {"message": "BOM deleted successfully"}


# ==================== Production Order Routes ====================

@router.get("/orders", response_model=List[ProductionOrder])
async def list_production_orders(
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_READ.value]))
):
    """List all production orders"""
    cursor = db.db.production_orders.find().sort("createdAt", -1)
    orders = await cursor.to_list(length=500)
    return orders


@router.get("/orders/{order_id}", response_model=ProductionOrder)
async def get_production_order(
    order_id: str,
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_READ.value]))
):
    """Get a single production order"""
    order = await db.db.production_orders.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Production order not found")
    return order


@router.post("/orders", response_model=ProductionOrder)
async def create_production_order(
    order_data: ProductionOrderCreate,
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_CREATE.value]))
):
    """Create a new production order"""
    # Generate order number
    count = await db.db.production_orders.count_documents({})
    order_number = f"PO-{datetime.utcnow().year}-{str(count + 1).zfill(5)}"

    order_doc = order_data.model_dump()
    order_doc["orderNumber"] = order_number
    order_doc["status"] = "planning"
    order_doc["producedQuantity"] = 0

    # Get BOM cost if bomId provided
    if order_data.bomId:
        bom = await db.db.boms.find_one({"_id": order_data.bomId})
        if bom:
            order_doc["unitCost"] = bom.get("totalCost", 0)
            order_doc["totalCost"] = bom.get("totalCost", 0) * order_data.quantity

    order_doc["createdAt"] = datetime.utcnow().isoformat()
    order_doc["updatedAt"] = datetime.utcnow().isoformat()

    result = await db.db.production_orders.insert_one(order_doc)
    order_doc["_id"] = result.inserted_id
    return order_doc


@router.put("/orders/{order_id}", response_model=ProductionOrder)
async def update_production_order(
    order_id: str,
    order_data: ProductionOrderUpdate,
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_UPDATE.value]))
):
    """Update a production order"""
    existing = await db.db.production_orders.find_one({"_id": order_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Production order not found")

    update_data = order_data.model_dump(exclude_unset=True)

    # Recalculate total cost if quantity changed
    if "quantity" in update_data or "unitCost" in update_data:
        quantity = update_data.get("quantity", existing.get("quantity", 1))
        unit_cost = update_data.get("unitCost", existing.get("unitCost", 0))
        update_data["totalCost"] = quantity * unit_cost

    # Set completedAt if status changed to completed
    if update_data.get("status") == "completed" and existing.get("status") != "completed":
        update_data["completedAt"] = datetime.utcnow().isoformat()

    update_data["updatedAt"] = datetime.utcnow().isoformat()

    await db.db.production_orders.update_one(
        {"_id": order_id},
        {"$set": update_data}
    )

    updated = await db.db.production_orders.find_one({"_id": order_id})
    return updated


@router.delete("/orders/{order_id}")
async def delete_production_order(
    order_id: str,
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_DELETE.value]))
):
    """Delete a production order"""
    result = await db.db.production_orders.delete_one({"_id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Production order not found")
    return {"message": "Production order deleted successfully"}


# ==================== Project Kanban Routes ====================

@router.get("/projects", response_model=List[Project])
async def list_projects(
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_READ.value]))
):
    """List all projects"""
    cursor = db.db.projects.find().sort("updatedAt", -1)
    projects = await cursor.to_list(length=500)
    return projects


@router.get("/projects/{project_id}", response_model=Project)
async def get_project(
    project_id: str,
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_READ.value]))
):
    """Get a single project with tasks"""
    project = await db.db.projects.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/projects", response_model=Project)
async def create_project(
    project_data: ProjectCreate,
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_CREATE.value]))
):
    """Create a new project"""
    project_doc = project_data.model_dump()
    project_doc["status"] = "active"
    project_doc["tasks"] = []
    project_doc["progress"] = 0.0
    project_doc["createdAt"] = datetime.utcnow().isoformat()
    project_doc["updatedAt"] = datetime.utcnow().isoformat()

    result = await db.db.projects.insert_one(project_doc)
    project_doc["_id"] = result.inserted_id
    return project_doc


@router.put("/projects/{project_id}", response_model=Project)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_UPDATE.value]))
):
    """Update a project"""
    existing = await db.db.projects.find_one({"_id": project_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = project_data.model_dump(exclude_unset=True)

    # Set completedAt if status changed to completed
    if update_data.get("status") == "completed" and existing.get("status") != "completed":
        update_data["completedAt"] = datetime.utcnow().isoformat()

    update_data["updatedAt"] = datetime.utcnow().isoformat()

    await db.db.projects.update_one(
        {"_id": project_id},
        {"$set": update_data}
    )

    updated = await db.db.projects.find_one({"_id": project_id})
    return updated


@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_DELETE.value]))
):
    """Delete a project"""
    result = await db.db.projects.delete_one({"_id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully"}


# ==================== Project Task Routes ====================

@router.post("/projects/{project_id}/tasks", response_model=Project)
async def create_project_task(
    project_id: str,
    task_data: ProjectTaskCreate,
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_CREATE.value]))
):
    """Add a task to a project"""
    project = await db.db.projects.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    task_id = str(uuid.uuid4())
    task = task_data.model_dump()
    task["id"] = task_id
    task["createdAt"] = datetime.utcnow().isoformat()
    task["updatedAt"] = datetime.utcnow().isoformat()

    await db.db.projects.update_one(
        {"_id": project_id},
        {
            "$push": {"tasks": task},
            "$set": {"updatedAt": datetime.utcnow().isoformat()}
        }
    )

    # Update project progress
    await _update_project_progress(project_id)

    updated = await db.db.projects.find_one({"_id": project_id})
    return updated


@router.put("/projects/{project_id}/tasks/{task_id}", response_model=Project)
async def update_project_task(
    project_id: str,
    task_id: str,
    task_data: ProjectTaskUpdate,
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_UPDATE.value]))
):
    """Update a task in a project"""
    project = await db.db.projects.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Find task index
    task_index = None
    for i, task in enumerate(project.get("tasks", [])):
        if task.get("id") == task_id:
            task_index = i
            break

    if task_index is None:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_data.model_dump(exclude_unset=True)
    update_data["updatedAt"] = datetime.utcnow().isoformat()

    # Build update query
    task_key = f"tasks.{task_index}"
    update_query = {f"{task_key}.{k}": v for k, v in update_data.items()}

    await db.db.projects.update_one(
        {"_id": project_id},
        {"$set": update_query}
    )

    # Update project progress if stage changed
    if "stage" in update_data:
        await _update_project_progress(project_id)

    updated = await db.db.projects.find_one({"_id": project_id})
    return updated


@router.delete("/projects/{project_id}/tasks/{task_id}", response_model=Project)
async def delete_project_task(
    project_id: str,
    task_id: str,
    current_user: dict = Depends(require_permissions([Permission.PRODUCTION_DELETE.value]))
):
    """Delete a task from a project"""
    project = await db.db.projects.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.db.projects.update_one(
        {"_id": project_id},
        {
            "$pull": {"tasks": {"id": task_id}},
            "$set": {"updatedAt": datetime.utcnow().isoformat()}
        }
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")

    # Update project progress
    await _update_project_progress(project_id)

    updated = await db.db.projects.find_one({"_id": project_id})
    return updated


async def _update_project_progress(project_id: str):
    """Recalculate and update project progress based on tasks"""
    project = await db.db.projects.find_one({"_id": project_id})
    if not project:
        return

    tasks = project.get("tasks", [])
    if not tasks:
        progress = 0.0
    else:
        done_count = sum(1 for t in tasks if t.get("stage") == "done")
        progress = (done_count / len(tasks)) * 100

    await db.db.projects.update_one(
        {"_id": project_id},
        {"$set": {"progress": progress, "updatedAt": datetime.utcnow().isoformat()}}
    )
