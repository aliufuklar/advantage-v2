"""
AdVantage API v3 - Production Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class BOMItem(BaseModel):
    productId: Optional[str] = None
    productName: str
    quantity: float
    unit: str = "adet"
    unitCost: float = 0.0


class BOM(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    productId: Optional[str] = None
    productName: Optional[str] = None
    items: List[BOMItem] = []
    version: int = 1
    totalCost: float = 0.0
    isActive: bool = True
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True


class BOMCreate(BaseModel):
    name: str
    productId: Optional[str] = None
    productName: Optional[str] = None
    items: List[BOMItem] = []


class BOMUpdate(BaseModel):
    name: Optional[str] = None
    productId: Optional[str] = None
    productName: Optional[str] = None
    items: Optional[List[BOMItem]] = None
    version: Optional[int] = None
    isActive: Optional[bool] = None


class ProductionOrder(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    orderNumber: str
    orderId: Optional[str] = None  # link to sales order
    bomId: Optional[str] = None
    bomName: Optional[str] = None
    status: str = "planning"  # planning, in_progress, completed, cancelled
    quantity: float = 1
    producedQuantity: float = 0
    unitCost: float = 0.0
    totalCost: float = 0.0
    dueDate: Optional[str] = None
    completedAt: Optional[str] = None
    notes: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True


class ProductionOrderCreate(BaseModel):
    orderId: Optional[str] = None
    bomId: Optional[str] = None
    bomName: Optional[str] = None
    quantity: float = 1
    dueDate: Optional[str] = None
    notes: Optional[str] = None


class ProductionOrderUpdate(BaseModel):
    bomId: Optional[str] = None
    bomName: Optional[str] = None
    status: Optional[str] = None
    quantity: Optional[float] = None
    producedQuantity: Optional[float] = None
    dueDate: Optional[str] = None
    notes: Optional[str] = None


class ProjectTask(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    assigneeId: Optional[str] = None
    assigneeName: Optional[str] = None
    dueDate: Optional[str] = None
    priority: str = "normal"  # low, normal, high, urgent
    stage: str = "planning"  # planning, in_progress, qa, done
    order: int = 0
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class Project(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    description: Optional[str] = None
    customerId: Optional[str] = None
    customerName: Optional[str] = None
    status: str = "active"  # active, completed, on_hold, cancelled
    tasks: List[ProjectTask] = []
    progress: float = 0.0
    startDate: Optional[str] = None
    dueDate: Optional[str] = None
    completedAt: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    customerId: Optional[str] = None
    customerName: Optional[str] = None
    startDate: Optional[str] = None
    dueDate: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    customerId: Optional[str] = None
    customerName: Optional[str] = None
    status: Optional[str] = None
    startDate: Optional[str] = None
    dueDate: Optional[str] = None


class ProjectTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigneeId: Optional[str] = None
    assigneeName: Optional[str] = None
    dueDate: Optional[str] = None
    priority: str = "normal"
    stage: str = "planning"


class ProjectTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigneeId: Optional[str] = None
    assigneeName: Optional[str] = None
    dueDate: Optional[str] = None
    priority: Optional[str] = None
    stage: Optional[str] = None
    order: Optional[int] = None
