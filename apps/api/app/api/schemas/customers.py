"""
AdVantage API v3 - Customer Schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


class ContactPerson(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None


class Address(BaseModel):
    label: str = "Main"
    street: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    postalCode: Optional[str] = None
    country: str = "Turkey"


class BankAccount(BaseModel):
    bankName: str
    branchName: Optional[str] = None
    accountNumber: Optional[str] = None
    iban: Optional[str] = None


class CustomerBase(BaseModel):
    legalName: str
    shortName: Optional[str] = None
    customerType: str = "customer"  # customer or supplier
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    taxOffice: Optional[str] = None
    taxId: Optional[str] = None
    addresses: List[Address] = []
    contacts: List[ContactPerson] = []
    bankAccounts: List[BankAccount] = []


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    legalName: Optional[str] = None
    shortName: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    addresses: Optional[List[Address]] = None
    contacts: Optional[List[ContactPerson]] = None
    bankAccounts: Optional[List[BankAccount]] = None


class CustomerResponse(CustomerBase):
    id: str = Field(..., alias="_id")
    customerNumber: str
    balance: float = 0.0
    isActive: bool = True
    createdAt: Optional[str] = None

    class Config:
        populate_by_name = True
