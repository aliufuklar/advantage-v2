"""
AdVantage API v3 - Discoveries Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class DiscoveryStatus(str, Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class DiscoveryPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"


class Measurement(BaseModel):
    label: str = ""
    value: str = ""
    unit: Optional[str] = None


class SiteVisit(BaseModel):
    date: str = ""
    notes: Optional[str] = None
    photos: List[str] = []


class TimelineEntry(BaseModel):
    timestamp: str
    action: str
    userId: Optional[str] = None
    userName: Optional[str] = None
    details: Optional[str] = None


class DiscoveryBase(BaseModel):
    title: str = ""
    customerId: Optional[str] = None
    customerName: Optional[str] = None
    contactPerson: Optional[str] = None
    contactPhone: Optional[str] = None
    contactEmail: Optional[str] = None
    address: Optional[str] = None
    status: DiscoveryStatus = DiscoveryStatus.NEW
    priority: DiscoveryPriority = DiscoveryPriority.NORMAL
    measurements: List[Measurement] = []
    siteVisits: List[SiteVisit] = []
    notes: Optional[str] = None
    dueDate: Optional[str] = None


class DiscoveryCreate(DiscoveryBase):
    pass


class DiscoveryUpdate(BaseModel):
    title: Optional[str] = None
    customerId: Optional[str] = None
    customerName: Optional[str] = None
    contactPerson: Optional[str] = None
    contactPhone: Optional[str] = None
    contactEmail: Optional[str] = None
    address: Optional[str] = None
    status: Optional[DiscoveryStatus] = None
    priority: Optional[DiscoveryPriority] = None
    measurements: Optional[List[Measurement]] = None
    siteVisits: Optional[List[SiteVisit]] = None
    notes: Optional[str] = None
    dueDate: Optional[str] = None


class DiscoveryResponse(DiscoveryBase):
    id: str = Field(..., alias="_id")
    discoveryNumber: str
    createdBy: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    timeline: List[TimelineEntry] = []

    class Config:
        populate_by_name = True


class DiscoveryStageUpdate(BaseModel):
    status: DiscoveryStatus