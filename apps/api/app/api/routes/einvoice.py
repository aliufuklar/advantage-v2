"""
AdVantage API v3 - E-Invoice Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime
import uuid

from app.api.schemas.einvoice import (
    EInvoiceSettings,
    EInvoiceCreate,
    EInvoiceUpdate,
    EInvoiceResponse,
    EInvoiceListResponse,
    EInvoiceItem,
)
from app.api.routes.auth import get_current_user, require_permissions
from app.core.database import db
from app.core.permissions import Permission

router = APIRouter()


def calculate_invoice_totals(items: List[dict]) -> dict:
    """Calculate subtotal, tax amount, and total from items"""
    subtotal = sum(item.get("quantity", 1) * item.get("unitPrice", 0) for item in items)
    tax_amount = subtotal * 0.20  # 20% KDV
    total = subtotal + tax_amount
    return {"subtotal": subtotal, "taxAmount": tax_amount, "total": total}


async def mock_send_to_provider(invoice_data: dict) -> dict:
    """
    Mock e-invoice provider (Paraşüt/Kolaysoft) integration.
    In production, this would make actual API calls to the provider.
    Returns provider invoice ID and status.
    """
    # Simulate API delay
    import asyncio
    await asyncio.sleep(0.1)

    # Generate mock provider invoice ID
    provider_id = f"EF-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

    return {
        "success": True,
        "providerInvoiceId": provider_id,
        "status": "sent",
        "message": "Invoice sent to e-invoice provider successfully"
    }


# ==================== SETTINGS ====================

@router.get("/settings", response_model=EInvoiceSettings)
async def get_einvoice_settings(
    current_user: dict = Depends(require_permissions([Permission.ORDERS_READ.value]))
):
    """Get e-invoice settings"""
    settings = await db.db.einvoice_settings.find_one({"type": "settings"})
    if not settings:
        return EInvoiceSettings()
    return EInvoiceSettings(
        provider=settings.get("provider", "parasut"),
        apiKey=settings.get("apiKey"),
        apiSecret=settings.get("apiSecret"),
        companyTitle=settings.get("companyTitle", ""),
        taxId=settings.get("taxId", ""),
        address=settings.get("address", ""),
    )


@router.put("/settings", response_model=EInvoiceSettings)
async def update_einvoice_settings(
    settings: EInvoiceSettings,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_UPDATE.value]))
):
    """Update e-invoice settings"""
    settings_doc = settings.model_dump()
    settings_doc["type"] = "settings"

    await db.db.einvoice_settings.update_one(
        {"type": "settings"},
        {"$set": settings_doc},
        upsert=True
    )
    return settings


# ==================== E-INVOICES ====================

@router.get("/", response_model=List[EInvoiceResponse])
async def list_einvoices(
    status: Optional[str] = None,
    customerTaxId: Optional[str] = None,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_READ.value]))
):
    """List all e-invoices"""
    query = {}
    if status:
        query["status"] = status
    if customerTaxId:
        query["customerTaxId"] = customerTaxId

    cursor = db.db.einvoices.find(query).sort("createdAt", -1)
    einvoices = await cursor.to_list(length=500)
    return einvoices


@router.get("/{einvoice_id}", response_model=EInvoiceResponse)
async def get_einvoice(
    einvoice_id: str,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_READ.value]))
):
    """Get e-invoice by ID"""
    einvoice = await db.db.einvoices.find_one({"_id": einvoice_id})
    if not einvoice:
        raise HTTPException(status_code=404, detail="E-Invoice not found")
    return einvoice


@router.post("/", response_model=EInvoiceResponse)
async def create_einvoice(
    einvoice: EInvoiceCreate,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_CREATE.value]))
):
    """Create a new e-invoice"""
    # Get count for invoice number
    count = await db.db.einvoices.count_documents({})

    einvoice_doc = einvoice.model_dump()

    # Auto-calculate totals
    totals = calculate_invoice_totals(einvoice_doc.get("items", []))
    einvoice_doc.update(totals)

    # Set invoice number and dates
    einvoice_doc["invoiceNumber"] = f"EF-{count + 1:06d}"
    einvoice_doc["issueDate"] = einvoice_doc.get("issueDate") or datetime.now().strftime("%Y-%m-%d")
    einvoice_doc["status"] = "draft"
    einvoice_doc["createdAt"] = datetime.utcnow().isoformat()
    einvoice_doc["updatedAt"] = datetime.utcnow().isoformat()

    # If orderId provided, link it
    if einvoice_doc.get("orderId"):
        # Update order with einvoice reference
        await db.db.orders.update_one(
            {"_id": einvoice_doc["orderId"]},
            {"$set": {"einvoiceId": einvoice_doc["invoiceNumber"]}}
        )

    result = await db.db.einvoices.insert_one(einvoice_doc)
    einvoice_doc["_id"] = result.inserted_id
    return einvoice_doc


@router.put("/{einvoice_id}", response_model=EInvoiceResponse)
async def update_einvoice(
    einvoice_id: str,
    einvoice: EInvoiceUpdate,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_UPDATE.value]))
):
    """Update e-invoice"""
    existing = await db.db.einvoices.find_one({"_id": einvoice_id})
    if not existing:
        raise HTTPException(status_code=404, detail="E-Invoice not found")

    if existing.get("status") not in ["draft", "error"]:
        raise HTTPException(status_code=400, detail="Cannot update invoice after sending")

    einvoice_doc = einvoice.model_dump(exclude_unset=True)

    # Recalculate totals if items changed
    if "items" in einvoice_doc:
        totals = calculate_invoice_totals(einvoice_doc["items"])
        einvoice_doc.update(totals)

    einvoice_doc["updatedAt"] = datetime.utcnow().isoformat()

    await db.db.einvoices.update_one(
        {"_id": einvoice_id},
        {"$set": einvoice_doc}
    )
    updated = await db.db.einvoices.find_one({"_id": einvoice_id})
    return updated


@router.post("/{einvoice_id}/send", response_model=EInvoiceResponse)
async def send_einvoice(
    einvoice_id: str,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_CREATE.value]))
):
    """Send e-invoice to provider"""
    einvoice = await db.db.einvoices.find_one({"_id": einvoice_id})
    if not einvoice:
        raise HTTPException(status_code=404, detail="E-Invoice not found")

    if einvoice.get("status") not in ["draft", "error"]:
        raise HTTPException(status_code=400, detail="Invoice already sent")

    # Get settings
    settings = await db.db.einvoice_settings.find_one({"type": "settings"})
    if not settings or not settings.get("companyTitle"):
        raise HTTPException(status_code=400, detail="E-Invoice settings not configured")

    # Prepare invoice data for provider
    invoice_data = {
        "invoiceNumber": einvoice.get("invoiceNumber"),
        "issueDate": einvoice.get("issueDate"),
        "companyTitle": settings.get("companyTitle"),
        "companyTaxId": settings.get("taxId"),
        "customerTaxId": einvoice.get("customerTaxId"),
        "customerTitle": einvoice.get("customerTitle"),
        "items": einvoice.get("items", []),
        "subtotal": einvoice.get("subtotal"),
        "taxAmount": einvoice.get("taxAmount"),
        "total": einvoice.get("total"),
    }

    # Mock send to provider
    result = await mock_send_to_provider(invoice_data)

    if result["success"]:
        now = datetime.utcnow().isoformat()
        await db.db.einvoices.update_one(
            {"_id": einvoice_id},
            {"$set": {
                "status": "sent",
                "providerInvoiceId": result["providerInvoiceId"],
                "sentAt": now,
                "deliveredAt": None,
                "errorMessage": None,
                "updatedAt": now,
            }}
        )
    else:
        await db.db.einvoices.update_one(
            {"_id": einvoice_id},
            {"$set": {
                "status": "error",
                "errorMessage": result.get("message", "Unknown error"),
                "updatedAt": datetime.utcnow().isoformat(),
            }}
        )

    updated = await db.db.einvoices.find_one({"_id": einvoice_id})
    return updated


@router.post("/{einvoice_id}/simulate-delivery", response_model=EInvoiceResponse)
async def simulate_delivery(
    einvoice_id: str,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_UPDATE.value]))
):
    """Simulate delivery confirmation (mock for testing)"""
    einvoice = await db.db.einvoices.find_one({"_id": einvoice_id})
    if not einvoice:
        raise HTTPException(status_code=404, detail="E-Invoice not found")

    if einvoice.get("status") != "sent":
        raise HTTPException(status_code=400, detail="Invoice must be sent first")

    now = datetime.utcnow().isoformat()
    await db.db.einvoices.update_one(
        {"_id": einvoice_id},
        {"$set": {
            "status": "delivered",
            "deliveredAt": now,
            "updatedAt": now,
        }}
    )

    updated = await db.db.einvoices.find_one({"_id": einvoice_id})
    return updated


@router.delete("/{einvoice_id}")
async def delete_einvoice(
    einvoice_id: str,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_DELETE.value]))
):
    """Delete e-invoice"""
    einvoice = await db.db.einvoices.find_one({"_id": einvoice_id})
    if not einvoice:
        raise HTTPException(status_code=404, detail="E-Invoice not found")

    if einvoice.get("status") in ["delivered", "read"]:
        raise HTTPException(status_code=400, detail="Cannot delete delivered or read invoices")

    await db.db.einvoices.delete_one({"_id": einvoice_id})
    return {"message": "E-Invoice deleted"}


@router.get("/{einvoice_id}/pdf")
async def download_einvoice_pdf(
    einvoice_id: str,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_READ.value]))
):
    """Download e-invoice PDF (mock)"""
    einvoice = await db.db.einvoices.find_one({"_id": einvoice_id})
    if not einvoice:
        raise HTTPException(status_code=404, detail="E-Invoice not found")

    if einvoice.get("status") == "draft":
        raise HTTPException(status_code=400, detail="Cannot download draft invoice")

    # In production, this would return actual PDF from provider
    # For mock, return JSON data that frontend can use to generate PDF
    return {
        "invoiceNumber": einvoice.get("invoiceNumber"),
        "issueDate": einvoice.get("issueDate"),
        "status": einvoice.get("status"),
        "providerInvoiceId": einvoice.get("providerInvoiceId"),
        "htmlContent": f"""
        <html>
        <body>
            <h1>E-Fatura</h1>
            <p>Fatura No: {einvoice.get('invoiceNumber')}</p>
            <p>Tarih: {einvoice.get('issueDate')}</p>
            <p>Alıcı: {einvoice.get('customerTitle')}</p>
            <p>Vergi No: {einvoice.get('customerTaxId')}</p>
            <h2>Kalemler</h2>
            <table>
                <tr><th>Açıklama</th><th>Adet</th><th>Birim Fiyat</th><th>Toplam</th></tr>
                {"".join([f"<tr><td>{item.get('description')}</td><td>{item.get('quantity')}</td><td>{item.get('unitPrice')}</td><td>{item.get('total')}</td></tr>" for item in einvoice.get('items', [])])}
            </table>
            <p>Ara Toplam: {einvoice.get('subtotal')}</p>
            <p>KDV: {einvoice.get('taxAmount')}</p>
            <p>Genel Toplam: {einvoice.get('total')}</p>
        </body>
        </html>
        """
    }


@router.post("/create-from-order/{order_id}", response_model=EInvoiceResponse)
async def create_einvoice_from_order(
    order_id: str,
    current_user: dict = Depends(require_permissions([Permission.ORDERS_CREATE.value]))
):
    """Create e-invoice from existing order"""
    order = await db.db.orders.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Get customer info
    customer = None
    if order.get("customerId"):
        customer = await db.db.customers.find_one({"_id": order.get("customerId")})

    # Convert order items to einvoice items
    items = []
    for item in order.get("items", []):
        items.append(EInvoiceItem(
            description=item.get("description", ""),
            quantity=item.get("quantity", 1),
            unit=item.get("unit", "adet"),
            unitPrice=item.get("unitPrice", 0),
            total=item.get("total", 0),
        ))

    einvoice_create = EInvoiceCreate(
        orderId=order_id,
        customerTaxId=customer.get("taxId", "") if customer else "",
        customerTitle=customer.get("title", order.get("customerName", "")) if customer else order.get("customerName", ""),
        items=items,
        issueDate=datetime.now().strftime("%Y-%m-%d"),
    )

    return await create_einvoice(einvoice_create, current_user)