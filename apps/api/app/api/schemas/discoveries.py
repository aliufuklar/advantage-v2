"""
AdVantage API v3 - Discoveries Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class Measurement(BaseModel):
    label: str
    value: str
    unit: Optional[str] = None


class SiteVisit(BaseModel):
    date: str
    notes: Optional[str] = None
    photos: List[str] = []


class DiscoveryBase(BaseModel):
    title: str
    customerId: Optional[str] = None
    customerName: Optional[str] = None
    contactPerson: Optional[str] = None
    contactPhone: Optional[str] = None
    address: Optional[str] = None
    status: str = "new"
    priority: str = "normal"
    measurements: List[Measurement] = []
    siteVisits: List[SiteVisit] = []
    notes: Optional[str] = None


class DiscoveryCreate(DiscoveryBase):
    pass


class DiscoveryUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    measurements: Optional[List[Measurement]] = None
    siteVisits: Optional[List[SiteVisit]] = None
    notes: Optional[str] = None


class DiscoveryResponse(DiscoveryBase):
    id: str = Field(..., alias="_id")
    discoveryNumber: str
    createdBy: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True