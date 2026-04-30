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

    @property
    def total(self) -> float:
        return (self.quantity * self.unitPrice) - self.discount


class QuoteItemInput(BaseModel):
    description: str
    quantity: float = 1
    unit: str = "adet"
    unitPrice: float = 0
    discount: float = 0


class QuoteHistoryEntry(BaseModel):
    timestamp: str
    action: str
    userId: str
    userName: Optional[str] = None
    changes: Optional[dict] = None


class QuoteBase(BaseModel):
    title: str
    customerId: Optional[str] = None
    customerName: Optional[str] = None
    items: List[QuoteItemInput] = []
    subtotal: float = 0
    taxRate: float = 20
    taxAmount: float = 0
    total: float = 0
    currency: str = "TRY"
    status: str = "draft"  # draft, pending, approved, rejected
    validUntil: Optional[str] = None
    notes: Optional[str] = None
    approvedBy: Optional[str] = None
    approvedAt: Optional[str] = None
    rejectedBy: Optional[str] = None
    rejectedAt: Optional[str] = None
    rejectionReason: Optional[str] = None


class QuoteCreate(QuoteBase):
    pass


class QuoteUpdate(BaseModel):
    title: Optional[str] = None
    customerId: Optional[str] = None
    customerName: Optional[str] = None
    items: Optional[List[QuoteItemInput]] = None
    subtotal: Optional[float] = None
    taxRate: Optional[float] = None
    taxAmount: Optional[float] = None
    total: Optional[float] = None
    status: Optional[str] = None
    validUntil: Optional[str] = None
    notes: Optional[str] = None
    approvedBy: Optional[str] = None
    approvedAt: Optional[str] = None
    rejectedBy: Optional[str] = None
    rejectedAt: Optional[str] = None
    rejectionReason: Optional[str] = None


class QuoteApprovalRequest(BaseModel):
    action: str  # "approve" or "reject"
    reason: Optional[str] = None


class QuoteResponse(QuoteBase):
    id: str = Field(..., alias="_id")
    quoteNumber: str
    createdBy: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    history: List[QuoteHistoryEntry] = []

    class Config:
        populate_by_name = True


class QuotePDFData(BaseModel):
    quoteNumber: str
    title: str
    date: str
    validUntil: Optional[str]
    customerName: Optional[str]
    customerEmail: Optional[str]
    customerPhone: Optional[str]
    customerAddress: Optional[str]
    items: List[dict]
    subtotal: float
    taxRate: float
    taxAmount: float
    total: float
    currency: str
    notes: Optional[str]
    companyName: str = "AdVantage"
    companyAddress: Optional[str] = None
    companyPhone: Optional[str] = None
    companyEmail: Optional[str] = None