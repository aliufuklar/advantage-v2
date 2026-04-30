"""
AdVantage API v3 - Customers Routes
TODO: Implement full CRUD
"""
from fastapi import APIRouter, HTTPException
from typing import List
from app.api.schemas.customers import CustomerCreate, CustomerUpdate, CustomerResponse
from app.api.routes.auth import get_current_user
from app.core.database import db

router = APIRouter()


@router.get("/", response_model=List[CustomerResponse])
async def list_customers(current_user: dict = get_current_user):
    """List all customers"""
    cursor = db.db.customers.find()
    customers = await cursor.to_list(length=100)
    return customers


@router.post("/", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate, current_user: dict = get_current_user):
    """Create a new customer"""
    # Generate customer number
    count = await db.db.customers.count_documents({})
    customer_doc = customer.model_dump()
    customer_doc["customerNumber"] = f"MUS-{count + 1:04d}"
    result = await db.db.customers.insert_one(customer_doc)
    customer_doc["_id"] = result.inserted_id
    return customer_doc


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, current_user: dict = get_current_user):
    """Get customer by ID"""
    customer = await db.db.customers.find_one({"_id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, customer: CustomerUpdate, current_user: dict = get_current_user):
    """Update customer"""
    result = await db.db.customers.update_one(
        {"_id": customer_id},
        {"$set": customer.model_dump(exclude_unset=True)}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    updated = await db.db.customers.find_one({"_id": customer_id})
    return updated


@router.delete("/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = get_current_user):
    """Delete customer (soft delete)"""
    await db.db.customers.update_one(
        {"_id": customer_id},
        {"$set": {"isDeleted": True}}
    )
    return {"message": "Customer deleted"}
