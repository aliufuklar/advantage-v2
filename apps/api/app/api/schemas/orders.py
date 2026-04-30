"""
AdVantage API v3 - Orders Schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


class ChecklistItem(BaseModel):
    id: str
    label: str
    completed: bool = False
    completedAt: Optional[str] = None
    completedBy: Optional[str] = None


class ChecklistItemUpdate(BaseModel):
    """Used for updating a single checklist item"""
    id: str
    label: Optional[str] = None
    completed: Optional[bool] = None


class TimelineEntry(BaseModel):
    action: str
    userId: str
    timestamp: str
    details: Optional[str] = None


class OrderItem(BaseModel):
    description: str
    quantity: float = 1
    unit: str = "adet"
    unitPrice: float = 0
    total: float = 0


class OrderBase(BaseModel):
    title: str
    quoteId: Optional[str] = None
    customerId: Optional[str] = None
    customerName: Optional[str] = None
    items: List[OrderItem] = []
    subtotal: float = 0
    taxRate: float = 20
    taxAmount: float = 0
    total: float = 0
    currency: str = "TRY"
    status: str = "pending"
    priority: str = "normal"
    dueDate: Optional[str] = None
    checklist: List[ChecklistItem] = []
    timeline: List[TimelineEntry] = []
    notes: Optional[str] = None


class OrderCreate(OrderBase):
    pass


class OrderUpdate(BaseModel):
    title: Optional[str] = None
    quoteId: Optional[str] = None
    customerId: Optional[str] = None
    customerName: Optional[str] = None
    items: Optional[List[OrderItem]] = None
    subtotal: Optional[float] = None
    taxRate: Optional[float] = None
    taxAmount: Optional[float] = None
    total: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    dueDate: Optional[str] = None
    checklist: Optional[List[ChecklistItem]] = None
    timeline: Optional[List[TimelineEntry]] = None
    notes: Optional[str] = None


class OrderResponse(OrderBase):
    id: str = Field(..., alias="_id")
    orderNumber: str
    createdBy: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    timeline: List[TimelineEntry] = []

    class Config:
        populate_by_name = True