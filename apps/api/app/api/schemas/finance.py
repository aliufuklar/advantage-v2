"""
AdVantage API v3 - Finance Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# Transaction Categories

class TransactionCategoryBase(BaseModel):
    name: str
    type: str  # income or expense
    icon: Optional[str] = None
    isSystem: bool = False


class TransactionCategoryCreate(TransactionCategoryBase):
    pass


class TransactionCategoryResponse(TransactionCategoryBase):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True


# Account Transactions

class AccountTransaction(BaseModel):
    date: str
    description: str
    amount: float
    type: str  # income or expense
    category: str
    reference: Optional[str] = None
    createdBy: str
    createdAt: Optional[str] = None


class AccountTransactionCreate(BaseModel):
    date: str
    description: str
    amount: float
    type: str  # income or expense
    category: str
    accountId: str
    reference: Optional[str] = None


# Recurring Transactions

class RecurringTransaction(BaseModel):
    frequency: str  # daily, weekly, monthly, yearly
    description: str
    amount: float
    type: str  # income or expense
    category: str
    accountId: str
    reference: Optional[str] = None
    nextRun: str
    isActive: bool = True
    createdBy: str


class RecurringTransactionCreate(BaseModel):
    frequency: str
    description: str
    amount: float
    type: str
    category: str
    accountId: str
    reference: Optional[str] = None
    nextRun: str
    isActive: bool = True


# Accounts

class AccountBase(BaseModel):
    name: str
    type: str = "bank"  # cash, bank, credit_card
    balance: float = 0
    currency: str = "TRY"


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    balance: Optional[float] = None
    currency: Optional[str] = None


class AccountResponse(AccountBase):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True


# Standalone Transactions (legacy - kept for backwards compatibility)

class Transaction(BaseModel):
    date: str
    description: str
    amount: float
    type: str
    category: Optional[str] = None
    reference: Optional[str] = None


# Expense/Income (legacy - kept for backwards compatibility)

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


# Finance Summary

class FinanceSummary(BaseModel):
    totalCashBalance: float
    totalBankBalance: float
    totalCreditCardBalance: float
    totalBalance: float
    monthIncome: float
    monthExpense: float
    monthNet: float
    currency: str = "TRY"


# Transaction Filter

class TransactionFilter(BaseModel):
    accountId: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    minAmount: Optional[float] = None
    maxAmount: Optional[float] = None