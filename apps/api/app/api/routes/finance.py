"""
AdVantage API v3 - Finance Routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timedelta
from calendar import monthrange
from app.api.schemas.finance import (
    AccountCreate, AccountUpdate, AccountResponse,
    TransactionCategoryCreate, TransactionCategoryResponse,
    AccountTransaction, AccountTransactionCreate,
    RecurringTransaction, RecurringTransactionCreate,
    FinanceSummary, TransactionFilter
)
from app.api.routes.auth import get_current_user, require_permissions
from app.core.database import db
from app.core.permissions import Permission

router = APIRouter()


# ==================== ACCOUNT TYPES ====================

ACCOUNT_TYPES = ["cash", "bank", "credit_card"]


# ==================== SYSTEM CATEGORIES ====================

SYSTEM_CATEGORIES = [
    # Income categories
    {"name": "Sales Revenue", "type": "income", "icon": "cash", "isSystem": True},
    {"name": "Service Income", "type": "income", "icon": "service", "isSystem": True},
    {"name": "Interest Income", "type": "income", "icon": "percent", "isSystem": True},
    {"name": "Other Income", "type": "income", "icon": "plus", "isSystem": True},
    # Expense categories
    {"name": "Rent", "type": "expense", "icon": "home", "isSystem": True},
    {"name": "Utilities", "type": "expense", "icon": "bolt", "isSystem": True},
    {"name": "Salaries", "type": "expense", "icon": "users", "isSystem": True},
    {"name": "Supplies", "type": "expense", "icon": "box", "isSystem": True},
    {"name": "Marketing", "type": "expense", "icon": "megaphone", "isSystem": True},
    {"name": "Travel", "type": "expense", "icon": "airplane", "isSystem": True},
    {"name": "Insurance", "type": "expense", "icon": "shield", "isSystem": True},
    {"name": "Equipment", "type": "expense", "icon": "computer", "isSystem": True},
    {"name": "Software", "type": "expense", "icon": "code", "isSystem": True},
    {"name": "Professional Services", "type": "expense", "icon": "briefcase", "isSystem": True},
    {"name": "Other Expense", "type": "expense", "icon": "minus", "isSystem": True},
]


async def init_system_categories():
    """Initialize system categories if they don't exist"""
    for cat in SYSTEM_CATEGORIES:
        existing = await db.db.categories.find_one({"name": cat["name"], "isSystem": True})
        if not existing:
            await db.db.categories.insert_one(cat)


# ==================== ACCOUNTS ====================

@router.get("/accounts", response_model=List[AccountResponse])
async def list_accounts(
    current_user: dict = Depends(require_permissions([Permission.FINANCE_READ.value]))
):
    """List all accounts"""
    cursor = db.db.accounts.find()
    accounts = await cursor.to_list(length=100)
    return accounts


@router.post("/accounts", response_model=AccountResponse)
async def create_account(
    account: AccountCreate,
    current_user: dict = Depends(require_permissions([Permission.FINANCE_CREATE.value]))
):
    """Create a new account"""
    # Validate account type
    if account.type not in ACCOUNT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid account type. Must be one of: {ACCOUNT_TYPES}")

    account_doc = account.model_dump()
    result = await db.db.accounts.insert_one(account_doc)
    account_doc["_id"] = result.inserted_id
    return account_doc


@router.get("/accounts/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: str,
    current_user: dict = Depends(require_permissions([Permission.FINANCE_READ.value]))
):
    """Get account by ID"""
    account = await db.db.accounts.find_one({"_id": account_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.put("/accounts/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: str,
    account: AccountUpdate,
    current_user: dict = Depends(require_permissions([Permission.FINANCE_UPDATE.value]))
):
    """Update account"""
    if account.type is not None and account.type not in ACCOUNT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid account type. Must be one of: {ACCOUNT_TYPES}")

    account_doc = account.model_dump(exclude_unset=True)
    result = await db.db.accounts.update_one(
        {"_id": account_id},
        {"$set": account_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    updated = await db.db.accounts.find_one({"_id": account_id})
    return updated


@router.delete("/accounts/{account_id}")
async def delete_account(
    account_id: str,
    current_user: dict = Depends(require_permissions([Permission.FINANCE_DELETE.value]))
):
    """Delete account"""
    result = await db.db.accounts.delete_one({"_id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Account deleted"}


# ==================== CATEGORIES ====================

@router.get("/categories", response_model=List[TransactionCategoryResponse])
async def list_categories(
    current_user: dict = Depends(require_permissions([Permission.FINANCE_READ.value]))
):
    """List all transaction categories"""
    await init_system_categories()
    cursor = db.db.categories.find()
    categories = await cursor.to_list(length=100)
    return categories


@router.post("/categories", response_model=TransactionCategoryResponse)
async def create_category(
    category: TransactionCategoryCreate,
    current_user: dict = Depends(require_permissions([Permission.FINANCE_CREATE.value]))
):
    """Create a new custom category"""
    if category.type not in ["income", "expense"]:
        raise HTTPException(status_code=400, detail="Type must be 'income' or 'expense'")

    # Check for duplicate name
    existing = await db.db.categories.find_one({"name": category.name})
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")

    category_doc = category.model_dump()
    category_doc["isSystem"] = False
    result = await db.db.categories.insert_one(category_doc)
    category_doc["_id"] = result.inserted_id
    return category_doc


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    current_user: dict = Depends(require_permissions([Permission.FINANCE_DELETE.value]))
):
    """Delete a custom category (system categories cannot be deleted)"""
    category = await db.db.categories.find_one({"_id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if category.get("isSystem", False):
        raise HTTPException(status_code=400, detail="System categories cannot be deleted")
    await db.db.categories.delete_one({"_id": category_id})
    return {"message": "Category deleted"}


# ==================== TRANSACTIONS ====================

@router.get("/transactions", response_model=List[AccountTransaction])
async def list_transactions(
    accountId: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    startDate: Optional[str] = Query(None),
    endDate: Optional[str] = Query(None),
    current_user: dict = Depends(require_permissions([Permission.FINANCE_READ.value]))
):
    """List transactions with optional filtering"""
    query = {}

    if accountId:
        query["accountId"] = accountId
    if type:
        query["type"] = type
    if category:
        query["category"] = category
    if startDate or endDate:
        query["date"] = {}
        if startDate:
            query["date"]["$gte"] = startDate
        if endDate:
            query["date"]["$lte"] = endDate

    cursor = db.db.transactions.find(query).sort("date", -1)
    transactions = await cursor.to_list(length=1000)
    return transactions


@router.post("/transactions", response_model=AccountTransaction)
async def create_transaction(
    transaction: AccountTransactionCreate,
    current_user: dict = Depends(require_permissions([Permission.FINANCE_CREATE.value]))
):
    """Create a new transaction and update account balance"""
    if transaction.type not in ["income", "expense"]:
        raise HTTPException(status_code=400, detail="Type must be 'income' or 'expense'")

    # Create transaction record
    transaction_doc = transaction.model_dump()
    transaction_doc["createdBy"] = str(current_user["_id"])
    transaction_doc["createdAt"] = datetime.utcnow().isoformat()

    result = await db.db.transactions.insert_one(transaction_doc)
    transaction_doc["_id"] = result.inserted_id

    # Update account balance
    account = await db.db.accounts.find_one({"_id": transaction.accountId})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    new_balance = account.get("balance", 0)
    if transaction.type == "income":
        new_balance += transaction.amount
    else:
        new_balance -= transaction.amount

    await db.db.accounts.update_one(
        {"_id": transaction.accountId},
        {"$set": {"balance": new_balance}}
    )

    return transaction_doc


@router.get("/transactions/{transaction_id}", response_model=AccountTransaction)
async def get_transaction(
    transaction_id: str,
    current_user: dict = Depends(require_permissions([Permission.FINANCE_READ.value]))
):
    """Get transaction by ID"""
    transaction = await db.db.transactions.find_one({"_id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    current_user: dict = Depends(require_permissions([Permission.FINANCE_DELETE.value]))
):
    """Delete a transaction and reverse its effect on account balance"""
    transaction = await db.db.transactions.find_one({"_id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Reverse the balance change
    account = await db.db.accounts.find_one({"_id": transaction["accountId"]})
    if account:
        current_balance = account.get("balance", 0)
        if transaction["type"] == "income":
            new_balance = current_balance - transaction["amount"]
        else:
            new_balance = current_balance + transaction["amount"]

        await db.db.accounts.update_one(
            {"_id": transaction["accountId"]},
            {"$set": {"balance": new_balance}}
        )

    await db.db.transactions.delete_one({"_id": transaction_id})
    return {"message": "Transaction deleted"}


# ==================== RECURRING TRANSACTIONS ====================

@router.get("/recurring", response_model=List[RecurringTransaction])
async def list_recurring_transactions(
    current_user: dict = Depends(require_permissions([Permission.FINANCE_READ.value]))
):
    """List all recurring transactions"""
    cursor = db.db.recurring.find().sort("nextRun", 1)
    recurring = await cursor.to_list(length=100)
    return recurring


@router.post("/recurring", response_model=RecurringTransaction)
async def create_recurring_transaction(
    recurring: RecurringTransactionCreate,
    current_user: dict = Depends(require_permissions([Permission.FINANCE_CREATE.value]))
):
    """Create a new recurring transaction"""
    if recurring.frequency not in ["daily", "weekly", "monthly", "yearly"]:
        raise HTTPException(status_code=400, detail="Invalid frequency")

    recurring_doc = recurring.model_dump()
    recurring_doc["createdBy"] = str(current_user["_id"])
    result = await db.db.recurring.insert_one(recurring_doc)
    recurring_doc["_id"] = result.inserted_id
    return recurring_doc


@router.put("/recurring/{recurring_id}", response_model=RecurringTransaction)
async def update_recurring_transaction(
    recurring_id: str,
    recurring: RecurringTransactionCreate,
    current_user: dict = Depends(require_permissions([Permission.FINANCE_UPDATE.value]))
):
    """Update a recurring transaction"""
    recurring_doc = recurring.model_dump()
    result = await db.db.recurring.update_one(
        {"_id": recurring_id},
        {"$set": recurring_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    updated = await db.db.recurring.find_one({"_id": recurring_id})
    return updated


@router.delete("/recurring/{recurring_id}")
async def delete_recurring_transaction(
    recurring_id: str,
    current_user: dict = Depends(require_permissions([Permission.FINANCE_DELETE.value]))
):
    """Delete a recurring transaction"""
    result = await db.db.recurring.delete_one({"_id": recurring_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    return {"message": "Recurring transaction deleted"}


@router.post("/recurring/{recurring_id}/process")
async def process_recurring_transaction(
    recurring_id: str,
    current_user: dict = Depends(require_permissions([Permission.FINANCE_CREATE.value]))
):
    """Process a recurring transaction (create actual transaction and update next run)"""
    recurring = await db.db.recurring.find_one({"_id": recurring_id})
    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")

    if not recurring.get("isActive", True):
        raise HTTPException(status_code=400, detail="Recurring transaction is inactive")

    # Create the actual transaction
    transaction_data = AccountTransactionCreate(
        date=datetime.utcnow().isoformat()[:10],
        description=recurring["description"],
        amount=recurring["amount"],
        type=recurring["type"],
        category=recurring["category"],
        accountId=recurring["accountId"],
        reference=recurring.get("reference")
    )

    transaction_doc = transaction_data.model_dump()
    transaction_doc["createdBy"] = recurring["createdBy"]
    transaction_doc["createdAt"] = datetime.utcnow().isoformat()

    result = await db.db.transactions.insert_one(transaction_doc)

    # Update account balance
    account = await db.db.accounts.find_one({"_id": recurring["accountId"]})
    if account:
        new_balance = account.get("balance", 0)
        if recurring["type"] == "income":
            new_balance += recurring["amount"]
        else:
            new_balance -= recurring["amount"]
        await db.db.accounts.update_one(
            {"_id": recurring["accountId"]},
            {"$set": {"balance": new_balance}}
        )

    # Calculate next run date
    next_run = datetime.fromisoformat(recurring["nextRun"])
    frequency = recurring["frequency"]

    if frequency == "daily":
        next_run += timedelta(days=1)
    elif frequency == "weekly":
        next_run += timedelta(weeks=1)
    elif frequency == "monthly":
        # Add one month
        month = next_run.month + 1
        year = next_run.year
        if month > 12:
            month = 1
            year += 1
        day = min(next_run.day, monthrange(year, month)[1])
        next_run = next_run.replace(year=year, month=month, day=day)
    elif frequency == "yearly":
        next_run = next_run.replace(year=next_run.year + 1)

    await db.db.recurring.update_one(
        {"_id": recurring_id},
        {"$set": {"nextRun": next_run.isoformat()[:10]}}
    )

    transaction_doc["_id"] = result.inserted_id
    return transaction_doc


# ==================== FINANCE SUMMARY ====================

@router.get("/summary", response_model=FinanceSummary)
async def get_finance_summary(
    current_user: dict = Depends(require_permissions([Permission.FINANCE_READ.value]))
):
    """Get financial summary for dashboard"""
    # Get current month date range
    now = datetime.utcnow()
    month_start = now.replace(day=1).isoformat()[:10]
    _, last_day = monthrange(now.year, now.month)
    month_end = now.replace(day=last_day).isoformat()[:10]

    # Get all accounts
    accounts = await db.db.accounts.find().to_list(length=100)

    total_cash = 0.0
    total_bank = 0.0
    total_credit = 0.0

    for account in accounts:
        balance = account.get("balance", 0)
        if account.get("type") == "cash":
            total_cash += balance
        elif account.get("type") == "bank":
            total_bank += balance
        elif account.get("type") == "credit_card":
            total_credit += balance

    # Get this month's transactions
    month_transactions = await db.db.transactions.find({
        "date": {"$gte": month_start, "$lte": month_end}
    }).to_list(length=1000)

    month_income = 0.0
    month_expense = 0.0

    for txn in month_transactions:
        if txn.get("type") == "income":
            month_income += txn.get("amount", 0)
        else:
            month_expense += txn.get("amount", 0)

    return FinanceSummary(
        totalCashBalance=total_cash,
        totalBankBalance=total_bank,
        totalCreditCardBalance=total_credit,
        totalBalance=total_cash + total_bank + total_credit,
        monthIncome=month_income,
        monthExpense=month_expense,
        monthNet=month_income - month_expense
    )


# ==================== LEGACY ENDPOINTS (for backwards compatibility) ====================

@router.post("/expenses")
async def create_expense(
    expense: dict,
    current_user: dict = Depends(require_permissions([Permission.FINANCE_CREATE.value]))
):
    """Record an expense (legacy endpoint - use /transactions instead)"""
    # Create a default cash account if no account provided
    account_id = expense.get("accountId")
    if not account_id:
        account = await db.db.accounts.find_one({"type": "cash"})
        if account:
            account_id = str(account["_id"])
        else:
            # Create a default cash account
            new_account = {"name": "Cash", "type": "cash", "balance": 0, "currency": "TRY"}
            result = await db.db.accounts.insert_one(new_account)
            account_id = str(result.inserted_id)

    transaction_data = AccountTransactionCreate(
        date=expense.get("date", datetime.utcnow().isoformat()[:10]),
        description=expense.get("description", ""),
        amount=expense.get("amount", 0),
        type="expense",
        category=expense.get("category", "Other Expense"),
        reference=expense.get("receipt")
    )

    transaction_doc = transaction_data.model_dump()
    transaction_doc["accountId"] = account_id
    transaction_doc["createdBy"] = str(current_user["_id"])
    transaction_doc["createdAt"] = datetime.utcnow().isoformat()

    result = await db.db.transactions.insert_one(transaction_doc)
    transaction_doc["_id"] = result.inserted_id

    # Update account balance
    account = await db.db.accounts.find_one({"_id": account_id})
    if account:
        new_balance = account.get("balance", 0) - expense.get("amount", 0)
        await db.db.accounts.update_one(
            {"_id": account_id},
            {"$set": {"balance": new_balance}}
        )

    return transaction_doc


@router.post("/income")
async def create_income(
    income: dict,
    current_user: dict = Depends(require_permissions([Permission.FINANCE_CREATE.value]))
):
    """Record an income (legacy endpoint - use /transactions instead)"""
    # Create a default cash account if no account provided
    account_id = income.get("accountId")
    if not account_id:
        account = await db.db.accounts.find_one({"type": "cash"})
        if account:
            account_id = str(account["_id"])
        else:
            # Create a default cash account
            new_account = {"name": "Cash", "type": "cash", "balance": 0, "currency": "TRY"}
            result = await db.db.accounts.insert_one(new_account)
            account_id = str(result.inserted_id)

    transaction_data = AccountTransactionCreate(
        date=income.get("date", datetime.utcnow().isoformat()[:10]),
        description=income.get("description", ""),
        amount=income.get("amount", 0),
        type="income",
        category=income.get("source", "Other Income"),
        reference=income.get("invoice")
    )

    transaction_doc = transaction_data.model_dump()
    transaction_doc["accountId"] = account_id
    transaction_doc["createdBy"] = str(current_user["_id"])
    transaction_doc["createdAt"] = datetime.utcnow().isoformat()

    result = await db.db.transactions.insert_one(transaction_doc)
    transaction_doc["_id"] = result.inserted_id

    # Update account balance
    account = await db.db.accounts.find_one({"_id": account_id})
    if account:
        new_balance = account.get("balance", 0) + income.get("amount", 0)
        await db.db.accounts.update_one(
            {"_id": account_id},
            {"$set": {"balance": new_balance}}
        )

    return transaction_doc


@router.get("/expenses")
async def list_expenses(
    current_user: dict = Depends(require_permissions([Permission.FINANCE_READ.value]))
):
    """List all expenses (legacy endpoint)"""
    cursor = db.db.transactions.find({"type": "expense"}).sort("date", -1)
    expenses = await cursor.to_list(length=100)
    return expenses


@router.get("/income")
async def list_income(
    current_user: dict = Depends(require_permissions([Permission.FINANCE_READ.value]))
):
    """List all income (legacy endpoint)"""
    cursor = db.db.transactions.find({"type": "income"}).sort("date", -1)
    income_list = await cursor.to_list(length=100)
    return income_list