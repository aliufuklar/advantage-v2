"""
AdVantage API v3 - Inventory Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class Product(BaseModel):
    sku: str
    name: str
    category: str = "general"
    unit: str = "adet"
    minStock: float = 0
    currentStock: float = 0
    location: Optional[str] = None
    unitCost: float = 0
    batchNumber: Optional[str] = None
    serialNumber: Optional[str] = None
    expiryDate: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class ProductCreate(BaseModel):
    sku: str
    name: str
    category: str = "general"
    unit: str = "adet"
    minStock: float = 0
    currentStock: float = 0
    location: Optional[str] = None
    unitCost: float = 0
    batchNumber: Optional[str] = None
    serialNumber: Optional[str] = None
    expiryDate: Optional[str] = None


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    minStock: Optional[float] = None
    currentStock: Optional[float] = None
    location: Optional[str] = None
    unitCost: Optional[float] = None
    batchNumber: Optional[str] = None
    serialNumber: Optional[str] = None
    expiryDate: Optional[str] = None


class ProductResponse(Product):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True


class StockMovement(BaseModel):
    productId: str
    type: str  # in, out, adjustment
    quantity: float
    reason: str
    date: str
    reference: Optional[str] = None
    batchNumber: Optional[str] = None
    serialNumber: Optional[str] = None
    createdBy: Optional[str] = None
    createdAt: Optional[str] = None


class StockMovementCreate(BaseModel):
    productId: str
    type: str
    quantity: float
    reason: str
    date: Optional[str] = None
    reference: Optional[str] = None
    batchNumber: Optional[str] = None
    serialNumber: Optional[str] = None


class StockMovementResponse(StockMovement):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True


class Warehouse(BaseModel):
    code: str
    name: str
    location: Optional[str] = None
    isActive: bool = True
    createdAt: Optional[str] = None


class WarehouseCreate(BaseModel):
    code: str
    name: str
    location: Optional[str] = None
    isActive: bool = True


class WarehouseResponse(Warehouse):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True


class StockTakeItem(BaseModel):
    productId: str
    productName: str
    sku: str
    countedQuantity: float
    systemQuantity: float
    variance: float
    notes: Optional[str] = None


class StockTake(BaseModel):
    reference: str
    date: str
    status: str = "in_progress"  # in_progress, completed, cancelled
    items: List[StockTakeItem] = []
    notes: Optional[str] = None
    createdBy: Optional[str] = None
    createdAt: Optional[str] = None
    completedAt: Optional[str] = None


class StockTakeCreate(BaseModel):
    reference: str
    date: Optional[str] = None
    notes: Optional[str] = None


class StockTakeResponse(StockTake):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True


class StockAlert(BaseModel):
    productId: str
    productName: str
    currentStock: float
    minStock: float
    alertLevel: str = "warning"


# Legacy models for backward compatibility
class InventoryItem(BaseModel):
    productId: Optional[str] = None
    productName: str
    sku: str
    quantity: float = 0
    unit: str = "adet"
    location: Optional[str] = None


class InventoryBase(BaseModel):
    category: str = "general"
    items: List[InventoryItem] = []


class InventoryCreate(InventoryBase):
    pass


class InventoryUpdate(BaseModel):
    category: Optional[str] = None
    items: Optional[List[InventoryItem]] = None


class InventoryResponse(InventoryBase):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True
