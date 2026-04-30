"""
AdVantage API v3 - Inventory Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List


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


class StockAlert(BaseModel):
    productId: str
    productName: str
    currentStock: float
    minStock: float
    alertLevel: str = "warning"