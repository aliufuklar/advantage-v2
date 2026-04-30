"""
AdVantage API v3 - Finance Routes
"""
from fastapi import APIRouter, HTTPException
from typing import List
from app.api.schemas.finance import AccountCreate, AccountUpdate, AccountResponse, ExpenseCreate, IncomeCreate
from app.api.routes.auth import get_current_user
from app.core.database import db

router = APIRouter()


@router.get("/accounts", response_model=List[AccountResponse])
async def list_accounts(current_user: dict = get_current_user):
    """List all accounts"""
    cursor = db.db.accounts.find()
    accounts = await cursor.to_list(length=100)
    return accounts


@router.post("/accounts", response_model=AccountResponse)
async def create_account(account: AccountCreate, current_user: dict = get_current_user):
    """Create a new account"""
    account_doc = account.model_dump()
    result = await db.db.accounts.insert_one(account_doc)
    account_doc["_id"] = result.inserted_id
    return account_doc


@router.get("/accounts/{account_id}", response_model=AccountResponse)
async def get_account(account_id: str, current_user: dict = get_current_user):
    """Get account by ID"""
    account = await db.db.accounts.find_one({"_id": account_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.put("/accounts/{account_id}", response_model=AccountResponse)
async def update_account(account_id: str, account: AccountUpdate, current_user: dict = get_current_user):
    """Update account"""
    account_doc = account.model_dump(exclude_unset=True)
    result = await db.db.accounts.update_one(
        {"_id": account_id},
        {"$set": account_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    updated = await db.db.accounts.find_one({"_id": account_id})
    return updated


@router.post("/expenses")
async def create_expense(expense: ExpenseCreate, current_user: dict = get_current_user):
    """Record an expense"""
    expense_doc = expense.model_dump()
    expense_doc["createdBy"] = str(current_user["_id"])
    expense_doc["createdAt"] = datetime.utcnow().isoformat()
    result = await db.db.expenses.insert_one(expense_doc)
    expense_doc["_id"] = result.inserted_id
    return expense_doc


@router.post("/income")
async def create_income(income: IncomeCreate, current_user: dict = get_current_user):
    """Record an income"""
    income_doc = income.model_dump()
    income_doc["createdBy"] = str(current_user["_id"])
    income_doc["createdAt"] = datetime.utcnow().isoformat()
    result = await db.db.income.insert_one(income_doc)
    income_doc["_id"] = result.inserted_id
    return income_doc


@router.get("/expenses")
async def list_expenses(current_user: dict = get_current_user):
    """List all expenses"""
    cursor = db.db.expenses.find().sort("date", -1)
    expenses = await cursor.to_list(length=100)
    return expenses


@router.get("/income")
async def list_income(current_user: dict = get_current_user):
    """List all income"""
    cursor = db.db.income.find().sort("date", -1)
    income_list = await cursor.to_list(length=100)
    return income_list