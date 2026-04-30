"""
AdVantage API v3 - Quotes Schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


class QuoteItem(BaseModel):
    description: str
    quantity: float = 1
    unit: str = "adet"
    unitPrice: float = 0
    discount: float = 0
    total: float = 0


class QuoteBase(BaseModel):
    title: str
    customerId: Optional[str] = None
    customerName: Optional[str] = None
    items: List[QuoteItem] = []
    subtotal: float = 0
    taxRate: float = 20
    taxAmount: float = 0
    total: float = 0
    currency: str = "TRY"
    status: str = "draft"
    validUntil: Optional[str] = None
    notes: Optional[str] = None


class QuoteCreate(QuoteBase):
    pass


class QuoteUpdate(BaseModel):
    title: Optional[str] = None
    items: Optional[List[QuoteItem]] = None
    subtotal: Optional[float] = None
    taxRate: Optional[float] = None
    taxAmount: Optional[float] = None
    total: Optional[float] = None
    status: Optional[str] = None
    validUntil: Optional[str] = None
    notes: Optional[str] = None


class QuoteResponse(QuoteBase):
    id: str = Field(..., alias="_id")
    quoteNumber: str
    createdBy: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True