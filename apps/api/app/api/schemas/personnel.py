"""
AdVantage API v3 - Personnel Schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


class PersonnelBase(BaseModel):
    fullName: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    position: str
    department: Optional[str] = None
    salary: float = 0
    startDate: Optional[str] = None
    isActive: bool = True
    roles: List[str] = []


class PersonnelCreate(PersonnelBase):
    pass


class PersonnelUpdate(BaseModel):
    fullName: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    salary: Optional[float] = None
    isActive: Optional[bool] = None
    roles: Optional[List[str]] = None


class PersonnelResponse(PersonnelBase):
    id: str = Field(..., alias="_id")
    personnelNumber: str
    createdAt: Optional[str] = None

    class Config:
        populate_by_name = True


class OvertimeRecord(BaseModel):
    date: str
    hours: float
    reason: Optional[str] = None
    approvedBy: Optional[str] = None
    approvedAt: Optional[str] = None


class LeaveRecord(BaseModel):
    type: str
    startDate: str
    endDate: str
    reason: Optional[str] = None
    status: str = "pending"
    approvedBy: Optional[str] = None
    approvedAt: Optional[str] = None