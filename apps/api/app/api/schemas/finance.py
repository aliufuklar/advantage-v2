"""
AdVantage API v3 - Finance Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class Transaction(BaseModel):
    date: str
    description: str
    amount: float
    type: str
    category: Optional[str] = None
    reference: Optional[str] = None


class AccountBase(BaseModel):
    name: str
    type: str = "bank"
    balance: float = 0
    currency: str = "TRY"
    transactions: List[Transaction] = []


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    balance: Optional[float] = None
    transactions: Optional[List[Transaction]] = None


class AccountResponse(AccountBase):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True


class ExpenseCategory(BaseModel):
    name: str
    description: Optional[str] = None
    budget: float = 0


class ExpenseCreate(BaseModel):
    description: str
    amount: float
    category: str
    date: str
    receipt: Optional[str] = None


class IncomeCreate(BaseModel):
    description: str
    amount: float
    source: str
    date: str
    invoice: Optional[str] = None