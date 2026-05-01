"""
AdVantage API v3 - E-Invoice Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class EInvoiceSettings(BaseModel):
    provider: str = "parasut"  # parasut, kolaysoft
    apiKey: Optional[str] = None
    apiSecret: Optional[str] = None
    companyTitle: str = ""
    taxId: str = ""
    address: str = ""


class EInvoiceItem(BaseModel):
    description: str
    quantity: float = 1
    unit: str = "adet"
    unitPrice: float = 0
    total: float = 0


class EInvoiceBase(BaseModel):
    orderId: Optional[str] = None
    invoiceNumber: Optional[str] = None
    issueDate: Optional[str] = None
    customerTaxId: str = ""
    customerTitle: str = ""
    items: List[EInvoiceItem] = []
    subtotal: float = 0
    taxAmount: float = 0
    total: float = 0
    status: str = "draft"  # draft, sent, delivered, read, error
    providerInvoiceId: Optional[str] = None
    sentAt: Optional[str] = None
    deliveredAt: Optional[str] = None
    errorMessage: Optional[str] = None


class EInvoiceCreate(BaseModel):
    orderId: Optional[str] = None
    customerTaxId: str = ""
    customerTitle: str = ""
    items: List[EInvoiceItem] = []
    issueDate: Optional[str] = None


class EInvoiceUpdate(BaseModel):
    customerTaxId: Optional[str] = None
    customerTitle: Optional[str] = None
    items: Optional[List[EInvoiceItem]] = None
    issueDate: Optional[str] = None
    status: Optional[str] = None


class EInvoiceResponse(EInvoiceBase):
    id: str = Field(..., alias="_id")
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True


class EInvoiceListResponse(BaseModel):
    einvoices: List[EInvoiceResponse]
    total: int