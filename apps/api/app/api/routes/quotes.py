"""
AdVantage API v3 - Quotes Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
from app.api.schemas.quotes import (
    QuoteCreate, QuoteUpdate, QuoteResponse, QuoteApprovalRequest, QuotePDFData
)
from app.api.routes.auth import get_current_user, require_permissions
from app.core.database import db
from app.core.permissions import Permission

router = APIRouter()


def calculate_totals(items: List[dict], tax_rate: float) -> tuple[float, float, float]:
    """Calculate subtotal, taxAmount, and total from items"""
    subtotal = sum((item.get("quantity", 0) * item.get("unitPrice", 0)) - item.get("discount", 0) for item in items)
    tax_amount = subtotal * (tax_rate / 100)
    total = subtotal + tax_amount
    return subtotal, tax_amount, total


def add_history_entry(quote_doc: dict, action: str, user: dict, changes: dict = None):
    """Add a history entry to quote document"""
    if "history" not in quote_doc:
        quote_doc["history"] = []
    quote_doc["history"].append({
        "timestamp": datetime.utcnow().isoformat(),
        "action": action,
        "userId": str(user["_id"]),
        "userName": user.get("fullName", user.get("email", "Unknown")),
        "changes": changes
    })


@router.get("/", response_model=List[QuoteResponse])
async def list_quotes(
    current_user: dict = Depends(require_permissions([Permission.QUOTES_READ.value]))
):
    """List all quotes"""
    cursor = db.db.quotes.find({"isDeleted": {"$ne": True}}).sort("createdAt", -1)
    quotes = await cursor.to_list(length=100)
    return quotes


@router.post("/", response_model=QuoteResponse)
async def create_quote(
    quote: QuoteCreate,
    current_user: dict = Depends(require_permissions([Permission.QUOTES_CREATE.value]))
):
    """Create a new quote with auto-calculated totals"""
    count = await db.db.quotes.count_documents({})

    # Calculate totals from items
    items_data = [item.model_dump() for item in quote.items]
    subtotal, tax_amount, total = calculate_totals(items_data, quote.taxRate)

    quote_doc = quote.model_dump()
    quote_doc["items"] = items_data
    quote_doc["subtotal"] = subtotal
    quote_doc["taxAmount"] = tax_amount
    quote_doc["total"] = total
    quote_doc["quoteNumber"] = f"TEK-{count + 1:04d}"
    quote_doc["createdBy"] = str(current_user["_id"])
    quote_doc["createdAt"] = datetime.utcnow().isoformat()
    quote_doc["status"] = "draft"
    quote_doc["history"] = [{
        "timestamp": datetime.utcnow().isoformat(),
        "action": "created",
        "userId": str(current_user["_id"]),
        "userName": current_user.get("fullName", current_user.get("email", "Unknown")),
        "changes": None
    }]

    result = await db.db.quotes.insert_one(quote_doc)
    quote_doc["_id"] = result.inserted_id
    return quote_doc


@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(
    quote_id: str,
    current_user: dict = Depends(require_permissions([Permission.QUOTES_READ.value]))
):
    """Get quote by ID"""
    quote = await db.db.quotes.find_one({"_id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote


@router.put("/{quote_id}", response_model=QuoteResponse)
async def update_quote(
    quote_id: str,
    quote: QuoteUpdate,
    current_user: dict = Depends(require_permissions([Permission.QUOTES_UPDATE.value]))
):
    """Update quote with auto-calculated totals"""
    existing = await db.db.quotes.find_one({"_id": quote_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Quote not found")

    update_data = quote.model_dump(exclude_unset=True)

    # Recalculate totals if items or taxRate changed
    if "items" in update_data or "taxRate" in update_data:
        items = update_data.get("items", existing.get("items", []))
        tax_rate = update_data.get("taxRate", existing.get("taxRate", 20))
        subtotal, tax_amount, total = calculate_totals(items, tax_rate)
        update_data["subtotal"] = subtotal
        update_data["taxAmount"] = tax_amount
        update_data["total"] = total

    update_data["updatedAt"] = datetime.utcnow().isoformat()

    # Track changes for history
    changes = {k: v for k, v in update_data.items() if k not in ["updatedAt"]}

    await db.db.quotes.update_one(
        {"_id": quote_id},
        {"$set": update_data}
    )

    # Add history entry
    add_history_entry(existing, "updated", current_user, changes)

    updated = await db.db.quotes.find_one({"_id": quote_id})
    return updated


@router.post("/{quote_id}/approve", response_model=QuoteResponse)
async def approve_quote(
    quote_id: str,
    current_user: dict = Depends(require_permissions([Permission.QUOTES_UPDATE.value]))
):
    """Approve a quote"""
    existing = await db.db.quotes.find_one({"_id": quote_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Quote not found")

    if existing.get("status") not in ["draft", "pending"]:
        raise HTTPException(status_code=400, detail="Quote cannot be approved in current status")

    await db.db.quotes.update_one(
        {"_id": quote_id},
        {"$set": {
            "status": "approved",
            "approvedBy": str(current_user["_id"]),
            "approvedAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat()
        }}
    )

    add_history_entry(existing, "approved", current_user, {"status": "approved"})
    updated = await db.db.quotes.find_one({"_id": quote_id})
    return updated


@router.post("/{quote_id}/reject", response_model=QuoteResponse)
async def reject_quote(
    quote_id: str,
    request: QuoteApprovalRequest,
    current_user: dict = Depends(require_permissions([Permission.QUOTES_UPDATE.value]))
):
    """Reject a quote"""
    existing = await db.db.quotes.find_one({"_id": quote_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Quote not found")

    if existing.get("status") not in ["draft", "pending"]:
        raise HTTPException(status_code=400, detail="Quote cannot be rejected in current status")

    await db.db.quotes.update_one(
        {"_id": quote_id},
        {"$set": {
            "status": "rejected",
            "rejectedBy": str(current_user["_id"]),
            "rejectedAt": datetime.utcnow().isoformat(),
            "rejectionReason": request.reason,
            "updatedAt": datetime.utcnow().isoformat()
        }}
    )

    add_history_entry(existing, "rejected", current_user, {"status": "rejected", "reason": request.reason})
    updated = await db.db.quotes.find_one({"_id": quote_id})
    return updated


@router.post("/{quote_id}/copy", response_model=QuoteResponse)
async def copy_quote(
    quote_id: str,
    current_user: dict = Depends(require_permissions([Permission.QUOTES_CREATE.value]))
):
    """Create a copy of an existing quote"""
    existing = await db.db.quotes.find_one({"_id": quote_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Quote not found")

    count = await db.db.quotes.count_documents({})

    # Create new quote from existing
    new_quote = {
        "title": f"{existing.get('title', 'Quote')} (Copy)",
        "customerId": existing.get("customerId"),
        "customerName": existing.get("customerName"),
        "items": existing.get("items", []),
        "subtotal": existing.get("subtotal", 0),
        "taxRate": existing.get("taxRate", 20),
        "taxAmount": existing.get("taxAmount", 0),
        "total": existing.get("total", 0),
        "currency": existing.get("currency", "TRY"),
        "status": "draft",
        "validUntil": None,  # Reset validity
        "notes": existing.get("notes"),
        "quoteNumber": f"TEK-{count + 1:04d}",
        "createdBy": str(current_user["_id"]),
        "createdAt": datetime.utcnow().isoformat(),
        "history": [{
            "timestamp": datetime.utcnow().isoformat(),
            "action": "copied",
            "userId": str(current_user["_id"]),
            "userName": current_user.get("fullName", current_user.get("email", "Unknown")),
            "changes": {"sourceQuote": existing.get("quoteNumber")}
        }]
    }

    result = await db.db.quotes.insert_one(new_quote)
    new_quote["_id"] = result.inserted_id
    return new_quote


@router.post("/{quote_id}/convert-to-order", response_model=dict)
async def convert_to_order(
    quote_id: str,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_CREATE.value]))
):
    """Convert a quote to an order"""
    existing = await db.db.quotes.find_one({"_id": quote_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Quote not found")

    if existing.get("status") != "approved":
        raise HTTPException(status_code=400, detail="Only approved quotes can be converted to orders")

    # Check if already converted
    if existing.get("orderId"):
        raise HTTPException(status_code=400, detail="Quote already converted to an order")

    # Create order from quote
    order_count = await db.db.orders.count_documents({})

    order_doc = {
        "title": existing.get("title"),
        "quoteId": str(quote_id),
        "customerId": existing.get("customerId"),
        "customerName": existing.get("customerName"),
        "items": existing.get("items", []),
        "subtotal": existing.get("subtotal", 0),
        "taxRate": existing.get("taxRate", 20),
        "taxAmount": existing.get("taxAmount", 0),
        "total": existing.get("total", 0),
        "currency": existing.get("currency", "TRY"),
        "status": "pending",
        "priority": "normal",
        "checklist": [],
        "notes": existing.get("notes"),
        "orderNumber": f"SIP-{order_count + 1:04d}",
        "createdBy": str(current_user["_id"]),
        "createdAt": datetime.utcnow().isoformat()
    }

    result = await db.db.orders.insert_one(order_doc)
    order_id = str(result.inserted_id)

    # Update quote with order reference
    await db.db.quotes.update_one(
        {"_id": quote_id},
        {"$set": {
            "orderId": order_id,
            "convertedAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat()
        }}
    )

    add_history_entry(existing, "converted_to_order", current_user, {"orderId": order_id})

    return {"orderId": order_id, "orderNumber": order_doc["orderNumber"]}


@router.get("/{quote_id}/pdf", response_model=QuotePDFData)
async def get_quote_pdf_data(
    quote_id: str,
    current_user: dict = Depends(require_permissions([Permission.QUOTES_READ.value]))
):
    """Get quote data formatted for PDF generation"""
    quote = await db.db.quotes.find_one({"_id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    # Get customer details if available
    customer = None
    if quote.get("customerId"):
        customer = await db.db.customers.find_one({"_id": quote["customerId"]})

    # Format items for PDF
    items = []
    for item in quote.get("items", []):
        item_total = (item.get("quantity", 0) * item.get("unitPrice", 0)) - item.get("discount", 0)
        items.append({
            "description": item.get("description", ""),
            "quantity": item.get("quantity", 0),
            "unit": item.get("unit", "adet"),
            "unitPrice": item.get("unitPrice", 0),
            "discount": item.get("discount", 0),
            "total": item_total
        })

    # Get customer address if available
    customer_address = None
    if customer and customer.get("addresses"):
        addr = customer["addresses"][0]
        parts = [addr.get("street"), addr.get("district"), addr.get("city") if addr.get("city") else addr.get("postalCode")]
        customer_address = ", ".join(filter(None, parts))

    pdf_data = {
        "quoteNumber": quote.get("quoteNumber", ""),
        "title": quote.get("title", ""),
        "date": quote.get("createdAt", "")[:10] if quote.get("createdAt") else datetime.utcnow().isoformat()[:10],
        "validUntil": quote.get("validUntil"),
        "customerName": quote.get("customerName") or (customer.get("legalName") if customer else None),
        "customerEmail": customer.get("email") if customer else None,
        "customerPhone": customer.get("phone") if customer else None,
        "customerAddress": customer_address,
        "items": items,
        "subtotal": quote.get("subtotal", 0),
        "taxRate": quote.get("taxRate", 20),
        "taxAmount": quote.get("taxAmount", 0),
        "total": quote.get("total", 0),
        "currency": quote.get("currency", "TRY"),
        "notes": quote.get("notes")
    }

    return pdf_data


@router.delete("/{quote_id}")
async def delete_quote(
    quote_id: str,
    current_user: dict = Depends(require_permissions([Permission.QUOTES_DELETE.value]))
):
    """Delete quote (soft delete)"""
    existing = await db.db.quotes.find_one({"_id": quote_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Quote not found")

    await db.db.quotes.update_one(
        {"_id": quote_id},
        {"$set": {"isDeleted": True, "updatedAt": datetime.utcnow().isoformat()}}
    )

    add_history_entry(existing, "deleted", current_user)
    return {"message": "Quote deleted"}
