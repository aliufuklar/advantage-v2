"""
AdVantage API v3 - Customers Routes
Full CRUD with search, pagination, and sub-document management
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
import re

from app.api.schemas.customers import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerSearchParams,
    BalanceUpdate,
)
from app.api.routes.auth import get_current_user, require_permissions
from app.core.database import db
from app.core.permissions import Permission

router = APIRouter()


def serialize_customer(customer: dict) -> dict:
    """Convert MongoDB document to API response format"""
    customer["_id"] = str(customer["_id"])
    return customer


@router.get("/", response_model=List[CustomerResponse])
async def list_customers(
    search: Optional[str] = Query(None, description="Search by name, email, or customerNumber"),
    customer_type: Optional[str] = Query(None, alias="customerType", description="Filter by type: customer, supplier"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_READ.value]))
):
    """List customers with search, filtering, and pagination"""
    query = {"isDeleted": {"$ne": True}}

    if customer_type:
        query["customerType"] = customer_type

    if search:
        search_regex = re.compile(search, re.IGNORECASE)
        query["$or"] = [
            {"legalName": {"$regex": search_regex}},
            {"shortName": {"$regex": search_regex}},
            {"email": {"$regex": search_regex}},
            {"customerNumber": {"$regex": search_regex}},
        ]

    skip = (page - 1) * page_size

    cursor = db.db.customers.find(query).skip(skip).limit(page_size).sort("legalName", 1)
    customers = await cursor.to_list(length=page_size)

    # Serialize ObjectIds
    result = []
    for customer in customers:
        customer["_id"] = str(customer["_id"])
        result.append(customer)

    return result


@router.post("/", response_model=CustomerResponse)
async def create_customer(
    customer: CustomerCreate,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_CREATE.value]))
):
    """Create a new customer"""
    # Generate customer number
    count = await db.db.customers.count_documents({})
    customer_doc = customer.model_dump()
    customer_doc["customerNumber"] = f"MUS-{count + 1:04d}"
    customer_doc["balance"] = 0.0
    customer_doc["isActive"] = True
    customer_doc["createdAt"] = datetime.utcnow().isoformat()
    customer_doc["updatedAt"] = datetime.utcnow().isoformat()

    # Ensure arrays are properly initialized
    if "addresses" not in customer_doc:
        customer_doc["addresses"] = []
    if "contacts" not in customer_doc:
        customer_doc["contacts"] = []
    if "bankAccounts" not in customer_doc:
        customer_doc["bankAccounts"] = []

    # Add IDs to sub-documents
    for i, addr in enumerate(customer_doc.get("addresses", [])):
        if not addr.get("id"):
            addr["id"] = f"addr_{datetime.utcnow().timestamp()}_{i}"
    for i, contact in enumerate(customer_doc.get("contacts", [])):
        if not contact.get("id"):
            contact["id"] = f"contact_{datetime.utcnow().timestamp()}_{i}"
    for i, ba in enumerate(customer_doc.get("bankAccounts", [])):
        if not ba.get("id"):
            ba["id"] = f"bank_{datetime.utcnow().timestamp()}_{i}"

    result = await db.db.customers.insert_one(customer_doc)
    customer_doc["_id"] = str(result.inserted_id)
    return customer_doc


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_READ.value]))
):
    """Get customer by ID"""
    customer = await db.db.customers.find_one({"_id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return serialize_customer(customer)


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    customer: CustomerUpdate,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_UPDATE.value]))
):
    """Update customer"""
    update_data = customer.model_dump(exclude_unset=True)
    update_data["updatedAt"] = datetime.utcnow().isoformat()

    # Add IDs to new sub-documents
    for addr in update_data.get("addresses", []):
        if not addr.get("id"):
            addr["id"] = f"addr_{datetime.utcnow().timestamp()}"
    for contact in update_data.get("contacts", []):
        if not contact.get("id"):
            contact["id"] = f"contact_{datetime.utcnow().timestamp()}"
    for ba in update_data.get("bankAccounts", []):
        if not ba.get("id"):
            ba["id"] = f"bank_{datetime.utcnow().timestamp()}"

    result = await db.db.customers.update_one(
        {"_id": customer_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")

    updated = await db.db.customers.find_one({"_id": customer_id})
    return serialize_customer(updated)


@router.patch("/{customer_id}/balance", response_model=CustomerResponse)
async def update_balance(
    customer_id: str,
    balance_update: BalanceUpdate,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_UPDATE.value]))
):
    """Update customer balance (add/subtract amount)"""
    customer = await db.db.customers.find_one({"_id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    new_balance = customer.get("balance", 0) + balance_update.amount

    await db.db.customers.update_one(
        {"_id": customer_id},
        {"$set": {"balance": new_balance, "updatedAt": datetime.utcnow().isoformat()}}
    )

    updated = await db.db.customers.find_one({"_id": customer_id})
    return serialize_customer(updated)


@router.post("/{customer_id}/contacts", response_model=CustomerResponse)
async def add_contact(
    customer_id: str,
    contact: dict,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_UPDATE.value]))
):
    """Add a contact person to customer"""
    customer = await db.db.customers.find_one({"_id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    contact["id"] = f"contact_{datetime.utcnow().timestamp()}"
    await db.db.customers.update_one(
        {"_id": customer_id},
        {
            "$push": {"contacts": contact},
            "$set": {"updatedAt": datetime.utcnow().isoformat()}
        }
    )

    updated = await db.db.customers.find_one({"_id": customer_id})
    return serialize_customer(updated)


@router.put("/{customer_id}/contacts/{contact_id}", response_model=CustomerResponse)
async def update_contact(
    customer_id: str,
    contact_id: str,
    contact: dict,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_UPDATE.value]))
):
    """Update a contact person"""
    customer = await db.db.customers.find_one({"_id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    contact["id"] = contact_id
    await db.db.customers.update_one(
        {"_id": customer_id, "contacts.id": contact_id},
        {
            "$set": {"contacts.$": contact, "updatedAt": datetime.utcnow().isoformat()}
        }
    )

    updated = await db.db.customers.find_one({"_id": customer_id})
    return serialize_customer(updated)


@router.delete("/{customer_id}/contacts/{contact_id}", response_model=CustomerResponse)
async def delete_contact(
    customer_id: str,
    contact_id: str,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_UPDATE.value]))
):
    """Delete a contact person"""
    customer = await db.db.customers.find_one({"_id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    await db.db.customers.update_one(
        {"_id": customer_id},
        {
            "$pull": {"contacts": {"id": contact_id}},
            "$set": {"updatedAt": datetime.utcnow().isoformat()}
        }
    )

    updated = await db.db.customers.find_one({"_id": customer_id})
    return serialize_customer(updated)


@router.post("/{customer_id}/addresses", response_model=CustomerResponse)
async def add_address(
    customer_id: str,
    address: dict,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_UPDATE.value]))
):
    """Add an address to customer"""
    customer = await db.db.customers.find_one({"_id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    address["id"] = f"addr_{datetime.utcnow().timestamp()}"
    await db.db.customers.update_one(
        {"_id": customer_id},
        {
            "$push": {"addresses": address},
            "$set": {"updatedAt": datetime.utcnow().isoformat()}
        }
    )

    updated = await db.db.customers.find_one({"_id": customer_id})
    return serialize_customer(updated)


@router.put("/{customer_id}/addresses/{address_id}", response_model=CustomerResponse)
async def update_address(
    customer_id: str,
    address_id: str,
    address: dict,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_UPDATE.value]))
):
    """Update an address"""
    customer = await db.db.customers.find_one({"_id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    address["id"] = address_id
    await db.db.customers.update_one(
        {"_id": customer_id, "addresses.id": address_id},
        {
            "$set": {"addresses.$": address, "updatedAt": datetime.utcnow().isoformat()}
        }
    )

    updated = await db.db.customers.find_one({"_id": customer_id})
    return serialize_customer(updated)


@router.delete("/{customer_id}/addresses/{address_id}", response_model=CustomerResponse)
async def delete_address(
    customer_id: str,
    address_id: str,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_UPDATE.value]))
):
    """Delete an address"""
    customer = await db.db.customers.find_one({"_id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    await db.db.customers.update_one(
        {"_id": customer_id},
        {
            "$pull": {"addresses": {"id": address_id}},
            "$set": {"updatedAt": datetime.utcnow().isoformat()}
        }
    )

    updated = await db.db.customers.find_one({"_id": customer_id})
    return serialize_customer(updated)


@router.post("/{customer_id}/bank-accounts", response_model=CustomerResponse)
async def add_bank_account(
    customer_id: str,
    bank_account: dict,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_UPDATE.value]))
):
    """Add a bank account to customer"""
    customer = await db.db.customers.find_one({"_id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    bank_account["id"] = f"bank_{datetime.utcnow().timestamp()}"
    await db.db.customers.update_one(
        {"_id": customer_id},
        {
            "$push": {"bankAccounts": bank_account},
            "$set": {"updatedAt": datetime.utcnow().isoformat()}
        }
    )

    updated = await db.db.customers.find_one({"_id": customer_id})
    return serialize_customer(updated)


@router.put("/{customer_id}/bank-accounts/{bank_account_id}", response_model=CustomerResponse)
async def update_bank_account(
    customer_id: str,
    bank_account_id: str,
    bank_account: dict,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_UPDATE.value]))
):
    """Update a bank account"""
    customer = await db.db.customers.find_one({"_id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    bank_account["id"] = bank_account_id
    await db.db.customers.update_one(
        {"_id": customer_id, "bankAccounts.id": bank_account_id},
        {
            "$set": {"bankAccounts.$": bank_account, "updatedAt": datetime.utcnow().isoformat()}
        }
    )

    updated = await db.db.customers.find_one({"_id": customer_id})
    return serialize_customer(updated)


@router.delete("/{customer_id}/bank-accounts/{bank_account_id}", response_model=CustomerResponse)
async def delete_bank_account(
    customer_id: str,
    bank_account_id: str,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_UPDATE.value]))
):
    """Delete a bank account"""
    customer = await db.db.customers.find_one({"_id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    await db.db.customers.update_one(
        {"_id": customer_id},
        {
            "$pull": {"bankAccounts": {"id": bank_account_id}},
            "$set": {"updatedAt": datetime.utcnow().isoformat()}
        }
    )

    updated = await db.db.customers.find_one({"_id": customer_id})
    return serialize_customer(updated)


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: str,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_DELETE.value]))
):
    """Delete customer (soft delete)"""
    result = await db.db.customers.update_one(
        {"_id": customer_id},
        {"$set": {"isDeleted": True, "updatedAt": datetime.utcnow().isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted"}