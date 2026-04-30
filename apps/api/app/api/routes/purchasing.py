"""
AdVantage API v3 - Purchasing Routes
Supplier, Purchase Order, and Supplier Quote endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
import re

from app.api.schemas.purchasing import (
    SupplierCreate,
    SupplierUpdate,
    SupplierResponse,
    SupplierSearchParams,
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderResponse,
    PurchaseOrderSearchParams,
    POItem,
    ReceiveItemsRequest,
    SupplierQuoteCreate,
    SupplierQuoteUpdate,
    SupplierQuoteResponse,
    SupplierQuoteSearchParams,
    QuoteComparisonResponse,
)
from app.api.routes.auth import get_current_user, require_permissions
from app.core.database import db
from app.core.permissions import Permission

router = APIRouter()


def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document to API response format"""
    doc["_id"] = str(doc["_id"])
    return doc


# ==================== SUPPLIERS ====================

@router.get("/suppliers", response_model=List[SupplierResponse])
async def list_suppliers(
    search: Optional[str] = Query(None, description="Search by name, email, or supplierNumber"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_READ.value]))
):
    """List suppliers with search and pagination"""
    query = {"isDeleted": {"$ne": True}}

    if search:
        search_regex = re.compile(search, re.IGNORECASE)
        query["$or"] = [
            {"name": {"$regex": search_regex}},
            {"email": {"$regex": search_regex}},
            {"supplierNumber": {"$regex": search_regex}},
        ]

    skip = (page - 1) * page_size

    cursor = db.db.suppliers.find(query).skip(skip).limit(page_size).sort("name", 1)
    suppliers = await cursor.to_list(length=page_size)

    result = []
    for supplier in suppliers:
        supplier["_id"] = str(supplier["_id"])
        result.append(supplier)

    return result


@router.post("/suppliers", response_model=SupplierResponse)
async def create_supplier(
    supplier: SupplierCreate,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_CREATE.value]))
):
    """Create a new supplier"""
    count = await db.db.suppliers.count_documents({})
    supplier_doc = supplier.model_dump()
    supplier_doc["supplierNumber"] = f"SUP-{count + 1:04d}"
    supplier_doc["isActive"] = True
    supplier_doc["createdAt"] = datetime.utcnow().isoformat()
    supplier_doc["updatedAt"] = datetime.utcnow().isoformat()

    if "contacts" not in supplier_doc:
        supplier_doc["contacts"] = []
    if "addresses" not in supplier_doc:
        supplier_doc["addresses"] = []

    for i, contact in enumerate(supplier_doc.get("contacts", [])):
        if not contact.get("id"):
            contact["id"] = f"contact_{datetime.utcnow().timestamp()}_{i}"
    for i, addr in enumerate(supplier_doc.get("addresses", [])):
        if not addr.get("id"):
            addr["id"] = f"addr_{datetime.utcnow().timestamp()}_{i}"

    result = await db.db.suppliers.insert_one(supplier_doc)
    supplier_doc["_id"] = str(result.inserted_id)
    return supplier_doc


@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: str,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_READ.value]))
):
    """Get supplier by ID"""
    supplier = await db.db.suppliers.find_one({"_id": supplier_id})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return serialize_doc(supplier)


@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: str,
    supplier: SupplierUpdate,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_UPDATE.value]))
):
    """Update supplier"""
    update_data = supplier.model_dump(exclude_unset=True)
    update_data["updatedAt"] = datetime.utcnow().isoformat()

    for contact in update_data.get("contacts", []):
        if not contact.get("id"):
            contact["id"] = f"contact_{datetime.utcnow().timestamp()}"
    for addr in update_data.get("addresses", []):
        if not addr.get("id"):
            addr["id"] = f"addr_{datetime.utcnow().timestamp()}"

    result = await db.db.suppliers.update_one(
        {"_id": supplier_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")

    updated = await db.db.suppliers.find_one({"_id": supplier_id})
    return serialize_doc(updated)


@router.delete("/suppliers/{supplier_id}")
async def delete_supplier(
    supplier_id: str,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_DELETE.value]))
):
    """Delete supplier (soft delete)"""
    result = await db.db.suppliers.update_one(
        {"_id": supplier_id},
        {"$set": {"isDeleted": True, "updatedAt": datetime.utcnow().isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"message": "Supplier deleted"}


@router.post("/suppliers/{supplier_id}/contacts", response_model=SupplierResponse)
async def add_supplier_contact(
    supplier_id: str,
    contact: dict,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_UPDATE.value]))
):
    """Add a contact person to supplier"""
    supplier = await db.db.suppliers.find_one({"_id": supplier_id})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    contact["id"] = f"contact_{datetime.utcnow().timestamp()}"
    await db.db.suppliers.update_one(
        {"_id": supplier_id},
        {
            "$push": {"contacts": contact},
            "$set": {"updatedAt": datetime.utcnow().isoformat()}
        }
    )

    updated = await db.db.suppliers.find_one({"_id": supplier_id})
    return serialize_doc(updated)


@router.delete("/suppliers/{supplier_id}/contacts/{contact_id}", response_model=SupplierResponse)
async def delete_supplier_contact(
    supplier_id: str,
    contact_id: str,
    current_user: dict = Depends(require_permissions([Permission.CUSTOMERS_UPDATE.value]))
):
    """Delete a contact person from supplier"""
    supplier = await db.db.suppliers.find_one({"_id": supplier_id})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    await db.db.suppliers.update_one(
        {"_id": supplier_id},
        {
            "$pull": {"contacts": {"id": contact_id}},
            "$set": {"updatedAt": datetime.utcnow().isoformat()}
        }
    )

    updated = await db.db.suppliers.find_one({"_id": supplier_id})
    return serialize_doc(updated)


# ==================== PURCHASE ORDERS ====================

@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
async def list_purchase_orders(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="Filter by status"),
    supplier_id: Optional[str] = Query(None, alias="supplierId"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_permissions([Permission.ORDERS_READ.value]))
):
    """List purchase orders with filtering and pagination"""
    query = {"isDeleted": {"$ne": True}}

    if status:
        query["status"] = status
    if supplier_id:
        query["supplierId"] = supplier_id
    if search:
        search_regex = re.compile(search, re.IGNORECASE)
        query["$or"] = [
            {"poNumber": {"$regex": search_regex}},
        ]

    skip = (page - 1) * page_size

    cursor = db.db.purchaseOrders.find(query).skip(skip).limit(page_size).sort("createdAt", -1)
    orders = await cursor.to_list(length=page_size)

    result = []
    for order in orders:
        order["_id"] = str(order["_id"])
        result.append(order)

    return result


@router.post("/purchase-orders", response_model=PurchaseOrderResponse)
async def create_purchase_order(
    po: PurchaseOrderCreate,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_CREATE.value]))
):
    """Create a new purchase order"""
    count = await db.db.purchaseOrders.count_documents({})
    po_doc = po.model_dump()
    po_doc["poNumber"] = f"PO-{count + 1:04d}"
    po_doc["createdBy"] = current_user.get("id")
    po_doc["createdAt"] = datetime.utcnow().isoformat()
    po_doc["updatedAt"] = datetime.utcnow().isoformat()

    # Calculate totals if not provided
    subtotal = sum(item.get("total", 0) for item in po_doc.get("items", []))
    tax_rate = po_doc.get("taxRate", 18.0)
    tax_amount = subtotal * (tax_rate / 100)
    po_doc["subtotal"] = subtotal
    po_doc["taxAmount"] = tax_amount
    po_doc["total"] = subtotal + tax_amount

    # Add IDs to line items
    for i, item in enumerate(po_doc.get("items", [])):
        if not item.get("id"):
            item["id"] = f"poitem_{datetime.utcnow().timestamp()}_{i}"
        if "receivedQuantity" not in item:
            item["receivedQuantity"] = 0

    result = await db.db.purchaseOrders.insert_one(po_doc)
    po_doc["_id"] = str(result.inserted_id)
    return po_doc


@router.get("/purchase-orders/{po_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    po_id: str,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_READ.value]))
):
    """Get purchase order by ID"""
    po = await db.db.purchaseOrders.find_one({"_id": po_id})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return serialize_doc(po)


@router.put("/purchase-orders/{po_id}", response_model=PurchaseOrderResponse)
async def update_purchase_order(
    po_id: str,
    po: PurchaseOrderUpdate,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_UPDATE.value]))
):
    """Update purchase order"""
    update_data = po.model_dump(exclude_unset=True)
    update_data["updatedAt"] = datetime.utcnow().isoformat()

    # Recalculate totals if items changed
    if "items" in update_data:
        subtotal = sum(item.get("total", 0) for item in update_data["items"])
        tax_rate = update_data.get("taxRate", 18.0)
        tax_amount = subtotal * (tax_rate / 100)
        update_data["subtotal"] = subtotal
        update_data["taxAmount"] = tax_amount
        update_data["total"] = subtotal + tax_amount

        for item in update_data["items"]:
            if not item.get("id"):
                item["id"] = f"poitem_{datetime.utcnow().timestamp()}"

    result = await db.db.purchaseOrders.update_one(
        {"_id": po_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    updated = await db.db.purchaseOrders.find_one({"_id": po_id})
    return serialize_doc(updated)


@router.patch("/purchase-orders/{po_id}/status", response_model=PurchaseOrderResponse)
async def update_po_status(
    po_id: str,
    status: dict,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_UPDATE.value]))
):
    """Update purchase order status"""
    new_status = status.get("status")
    valid_statuses = ["draft", "sent", "partial", "received", "cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    update_data = {
        "status": new_status,
        "updatedAt": datetime.utcnow().isoformat()
    }

    if new_status == "received":
        update_data["actualDelivery"] = datetime.utcnow().isoformat()

    result = await db.db.purchaseOrders.update_one(
        {"_id": po_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    updated = await db.db.purchaseOrders.find_one({"_id": po_id})
    return serialize_doc(updated)


@router.post("/purchase-orders/{po_id}/receive", response_model=PurchaseOrderResponse)
async def receive_po_items(
    po_id: str,
    request: ReceiveItemsRequest,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_UPDATE.value]))
):
    """Receive items for a purchase order"""
    po = await db.db.purchaseOrders.find_one({"_id": po_id})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    items = po.get("items", [])
    for received in request.items:
        item_id = received.get("itemId")
        received_qty = received.get("receivedQuantity", 0)
        for item in items:
            if item.get("id") == item_id:
                current_received = item.get("receivedQuantity", 0)
                item["receivedQuantity"] = current_received + received_qty
                break

    # Determine new status
    all_received = all(
        item.get("quantity", 0) <= item.get("receivedQuantity", 0)
        for item in items
    )
    some_received = any(
        item.get("receivedQuantity", 0) > 0
        for item in items
    )

    if all_received:
        new_status = "received"
    elif some_received:
        new_status = "partial"
    else:
        new_status = po.get("status", "sent")

    update_data = {
        "items": items,
        "status": new_status,
        "updatedAt": datetime.utcnow().isoformat()
    }

    if new_status == "received":
        update_data["actualDelivery"] = datetime.utcnow().isoformat()

    await db.db.purchaseOrders.update_one(
        {"_id": po_id},
        {"$set": update_data}
    )

    updated = await db.db.purchaseOrders.find_one({"_id": po_id})
    return serialize_doc(updated)


@router.delete("/purchase-orders/{po_id}")
async def delete_purchase_order(
    po_id: str,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_DELETE.value]))
):
    """Delete purchase order (soft delete)"""
    result = await db.db.purchaseOrders.update_one(
        {"_id": po_id},
        {"$set": {"isDeleted": True, "updatedAt": datetime.utcnow().isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return {"message": "Purchase order deleted"}


# ==================== SUPPLIER QUOTES ====================

@router.get("/supplier-quotes", response_model=List[SupplierQuoteResponse])
async def list_supplier_quotes(
    search: Optional[str] = Query(None),
    supplier_id: Optional[str] = Query(None, alias="supplierId"),
    product_id: Optional[str] = Query(None, alias="productId"),
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_permissions([Permission.ORDERS_READ.value]))
):
    """List supplier quotes with filtering and pagination"""
    query = {"isDeleted": {"$ne": True}}

    if supplier_id:
        query["supplierId"] = supplier_id
    if product_id:
        query["productId"] = product_id
    if status:
        query["status"] = status
    if search:
        search_regex = re.compile(search, re.IGNORECASE)
        query["$or"] = [
            {"quoteNumber": {"$regex": search_regex}},
            {"productName": {"$regex": search_regex}},
        ]

    skip = (page - 1) * page_size

    cursor = db.db.supplierQuotes.find(query).skip(skip).limit(page_size).sort("createdAt", -1)
    quotes = await cursor.to_list(length=page_size)

    result = []
    for quote in quotes:
        quote["_id"] = str(quote["_id"])
        result.append(quote)

    return result


@router.post("/supplier-quotes", response_model=SupplierQuoteResponse)
async def create_supplier_quote(
    quote: SupplierQuoteCreate,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_CREATE.value]))
):
    """Create a new supplier quote"""
    count = await db.db.supplierQuotes.count_documents({})
    quote_doc = quote.model_dump()
    quote_doc["quoteNumber"] = f"SQ-{count + 1:04d}"
    quote_doc["status"] = "pending"
    quote_doc["createdBy"] = current_user.get("id")
    quote_doc["createdAt"] = datetime.utcnow().isoformat()
    quote_doc["updatedAt"] = datetime.utcnow().isoformat()

    result = await db.db.supplierQuotes.insert_one(quote_doc)
    quote_doc["_id"] = str(result.inserted_id)
    return quote_doc


@router.get("/supplier-quotes/{quote_id}", response_model=SupplierQuoteResponse)
async def get_supplier_quote(
    quote_id: str,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_READ.value]))
):
    """Get supplier quote by ID"""
    quote = await db.db.supplierQuotes.find_one({"_id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Supplier quote not found")
    return serialize_doc(quote)


@router.put("/supplier-quotes/{quote_id}", response_model=SupplierQuoteResponse)
async def update_supplier_quote(
    quote_id: str,
    quote: SupplierQuoteUpdate,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_UPDATE.value]))
):
    """Update supplier quote"""
    update_data = quote.model_dump(exclude_unset=True)
    update_data["updatedAt"] = datetime.utcnow().isoformat()

    result = await db.db.supplierQuotes.update_one(
        {"_id": quote_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier quote not found")

    updated = await db.db.supplierQuotes.find_one({"_id": quote_id})
    return serialize_doc(updated)


@router.patch("/supplier-quotes/{quote_id}/status", response_model=SupplierQuoteResponse)
async def update_quote_status(
    quote_id: str,
    status: dict,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_UPDATE.value]))
):
    """Update supplier quote status (accept/reject)"""
    new_status = status.get("status")
    valid_statuses = ["pending", "accepted", "rejected", "expired"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    update_data = {
        "status": new_status,
        "updatedAt": datetime.utcnow().isoformat()
    }

    result = await db.db.supplierQuotes.update_one(
        {"_id": quote_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier quote not found")

    updated = await db.db.supplierQuotes.find_one({"_id": quote_id})
    return serialize_doc(updated)


@router.delete("/supplier-quotes/{quote_id}")
async def delete_supplier_quote(
    quote_id: str,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_DELETE.value]))
):
    """Delete supplier quote (soft delete)"""
    result = await db.db.supplierQuotes.update_one(
        {"_id": quote_id},
        {"$set": {"isDeleted": True, "updatedAt": datetime.utcnow().isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier quote not found")
    return {"message": "Supplier quote deleted"}


@router.get("/supplier-quotes/compare/{product_id}", response_model=QuoteComparisonResponse)
async def compare_quotes(
    product_id: str,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_READ.value]))
):
    """Compare all quotes for a specific product"""
    quotes = await db.db.supplierQuotes.find({
        "productId": product_id,
        "status": "pending",
        "isDeleted": {"$ne": True}
    }).to_list(length=100)

    # Group by product and find best quotes
    quotes_by_product: dict = {}
    for quote in quotes:
        pid = quote.get("productId") or "unknown"
        if pid not in quotes_by_product:
            quotes_by_product[pid] = []
        quote["_id"] = str(quote["_id"])
        quotes_by_product[pid].append(quote)

    items = []
    best_quotes = []

    for pid, product_quotes in quotes_by_product.items():
        if not product_quotes:
            continue

        # Sort by unit price to find best
        sorted_quotes = sorted(product_quotes, key=lambda q: q.get("unitPrice", 0))
        best = sorted_quotes[0] if sorted_quotes else None

        product_name = product_quotes[0].get("productName", "Unknown Product")
        total_quantity = sum(q.get("minQuantity", 1) for q in product_quotes)

        items.append({
            "productId": pid,
            "productName": product_name,
            "quantity": total_quantity,
            "quotes": [
                {
                    "quoteId": q["_id"],
                    "supplierId": q.get("supplierId"),
                    "supplierName": q.get("supplierName", "Unknown"),
                    "unitPrice": q.get("unitPrice", 0),
                    "total": q.get("unitPrice", 0) * total_quantity,
                    "leadTimeDays": q.get("leadTimeDays")
                }
                for q in sorted_quotes
            ]
        })

        if best:
            best_quotes.append({
                "productId": pid,
                "quoteId": best["_id"],
                "supplierId": best.get("supplierId"),
                "unitPrice": best.get("unitPrice", 0)
            })

    return {"items": items, "bestQuotes": best_quotes}


@router.post("/supplier-quotes/{quote_id}/convert-to-po", response_model=PurchaseOrderResponse)
async def convert_quote_to_po(
    quote_id: str,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_CREATE.value]))
):
    """Convert a supplier quote to a purchase order"""
    quote = await db.db.supplierQuotes.find_one({"_id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Supplier quote not found")

    if quote.get("status") == "accepted":
        raise HTTPException(status_code=400, detail="Quote already converted to PO")

    # Create PO from quote
    count = await db.db.purchaseOrders.count_documents({})
    po_doc = {
        "poNumber": f"PO-{count + 1:04d}",
        "supplierId": quote.get("supplierId"),
        "items": [{
            "id": f"poitem_{datetime.utcnow().timestamp()}",
            "productId": quote.get("productId"),
            "description": quote.get("productName", ""),
            "quantity": quote.get("minQuantity", 1),
            "unit": "adet",
            "unitPrice": quote.get("unitPrice", 0),
            "receivedQuantity": 0,
            "total": quote.get("unitPrice", 0) * quote.get("minQuantity", 1)
        }],
        "subtotal": quote.get("unitPrice", 0) * quote.get("minQuantity", 1),
        "taxRate": 18.0,
        "taxAmount": (quote.get("unitPrice", 0) * quote.get("minQuantity", 1)) * 0.18,
        "total": (quote.get("unitPrice", 0) * quote.get("minQuantity", 1)) * 1.18,
        "status": "draft",
        "notes": f"Created from quote {quote.get('quoteNumber')}",
        "createdBy": current_user.get("id"),
        "createdAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat(),
    }
    po_doc["total"] = po_doc["subtotal"] + po_doc["taxAmount"]

    # Update quote status
    await db.db.supplierQuotes.update_one(
        {"_id": quote_id},
        {"$set": {"status": "accepted", "updatedAt": datetime.utcnow().isoformat()}}
    )

    result = await db.db.purchaseOrders.insert_one(po_doc)
    po_doc["_id"] = str(result.inserted_id)
    return po_doc
