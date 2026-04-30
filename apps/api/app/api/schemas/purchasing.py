"""
AdVantage API v3 - Purchasing Schemas
Supplier, Purchase Order, and Supplier Quote schemas
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime


class ContactPerson(BaseModel):
    id: Optional[str] = None
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None


class Address(BaseModel):
    id: Optional[str] = None
    label: str = "Main"
    street: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    postalCode: Optional[str] = None
    country: str = "Turkey"


class SupplierBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    taxOffice: Optional[str] = None
    taxId: Optional[str] = None
    contacts: List[ContactPerson] = []
    addresses: List[Address] = []
    rating: float = 0.0
    notes: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    taxOffice: Optional[str] = None
    taxId: Optional[str] = None
    rating: Optional[float] = None
    notes: Optional[str] = None
    isActive: Optional[bool] = None
    contacts: Optional[List[ContactPerson]] = None
    addresses: Optional[List[Address]] = None


class SupplierResponse(SupplierBase):
    id: str = Field(..., alias="_id")
    supplierNumber: str
    isActive: bool = True
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True


class SupplierSearchParams(BaseModel):
    search: Optional[str] = None
    page: int = 1
    pageSize: int = 20


# Purchase Order Schemas

class POItem(BaseModel):
    id: Optional[str] = None
    productId: Optional[str] = None
    description: str
    quantity: float
    unit: str = "adet"
    unitPrice: float
    receivedQuantity: float = 0.0
    total: float


class PurchaseOrderBase(BaseModel):
    supplierId: str
    items: List[POItem]
    subtotal: float = 0.0
    taxRate: float = 18.0
    taxAmount: float = 0.0
    total: float = 0.0
    status: str = "draft"  # draft, sent, partial, received, cancelled
    expectedDelivery: Optional[str] = None
    actualDelivery: Optional[str] = None
    notes: Optional[str] = None


class PurchaseOrderCreate(PurchaseOrderBase):
    pass


class PurchaseOrderUpdate(BaseModel):
    supplierId: Optional[str] = None
    items: Optional[List[POItem]] = None
    subtotal: Optional[float] = None
    taxRate: Optional[float] = None
    taxAmount: Optional[float] = None
    total: Optional[float] = None
    status: Optional[str] = None
    expectedDelivery: Optional[str] = None
    actualDelivery: Optional[str] = None
    notes: Optional[str] = None


class PurchaseOrderResponse(PurchaseOrderBase):
    id: str = Field(..., alias="_id")
    poNumber: str
    createdBy: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True


class PurchaseOrderSearchParams(BaseModel):
    search: Optional[str] = None
    status: Optional[str] = None
    supplierId: Optional[str] = None
    page: int = 1
    pageSize: int = 20


class ReceiveItemsRequest(BaseModel):
    items: List[dict]  # [{itemId: str, receivedQuantity: float}]


# Supplier Quote Schemas

class SupplierQuoteBase(BaseModel):
    supplierId: str
    productId: Optional[str] = None
    productName: Optional[str] = None
    unitPrice: float
    minQuantity: float = 1
    currency: str = "TRY"
    validUntil: Optional[str] = None
    leadTimeDays: Optional[int] = None
    notes: Optional[str] = None


class SupplierQuoteCreate(SupplierQuoteBase):
    pass


class SupplierQuoteUpdate(BaseModel):
    unitPrice: Optional[float] = None
    minQuantity: Optional[float] = None
    currency: Optional[str] = None
    validUntil: Optional[str] = None
    leadTimeDays: Optional[int] = None
    notes: Optional[str] = None


class SupplierQuoteResponse(SupplierQuoteBase):
    id: str = Field(..., alias="_id")
    quoteNumber: str
    status: str = "pending"  # pending, accepted, rejected, expired
    createdBy: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True


class SupplierQuoteSearchParams(BaseModel):
    search: Optional[str] = None
    supplierId: Optional[str] = None
    productId: Optional[str] = None
    status: Optional[str] = None
    page: int = 1
    pageSize: int = 20


class QuoteComparisonItem(BaseModel):
    productId: Optional[str] = None
    productName: str
    quantity: float
    quotes: List[dict]  # [{quoteId, supplierId, supplierName, unitPrice, total, leadTimeDays}]


class QuoteComparisonResponse(BaseModel):
    items: List[QuoteComparisonItem]
    bestQuotes: List[dict]  # [{productId, quoteId, supplierId, unitPrice}]
