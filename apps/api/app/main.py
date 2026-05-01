"""
AdVantage API v3 - Main Application

AdVantage ERP/CRM System API providing comprehensive business management
capabilities for advertising agencies, sign manufacturers, and printing businesses.

## Features
- Authentication & Authorization (JWT + RBAC)
- Customer & Supplier Management
- Quotes & Orders Management
- Discovery/Kanban Tracking
- Inventory & Stock Management
- Financial Accounts & Transactions
- Personnel Management
- Production & BOM Management
- Purchasing & Supplier Quotes

## API Documentation
- Swagger UI: /docs
- ReDoc: /redoc
- OpenAPI JSON: /openapi.json

## Authentication
All endpoints (except /api/auth/*) require Bearer token authentication.
Obtain a token via POST /api/auth/login

## Permissions
The API uses role-based access control (RBAC). Users must have appropriate
roles assigned to access specific resource endpoints.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import db
from app.core.config import settings

from app.api.routes import auth, customers, quotes, orders, discoveries, inventory, finance, personnel, purchasing, production, media, design, einvoice


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.disconnect()


app = FastAPI(
    title="AdVantage API v3",
    description="AdVantage ERP/CRM System API",
    version="3.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(customers.router, prefix="/api/customers", tags=["customers"])
app.include_router(quotes.router, prefix="/api/quotes", tags=["quotes"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(discoveries.router, prefix="/api/discoveries", tags=["discoveries"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["inventory"])
app.include_router(finance.router, prefix="/api/finance", tags=["finance"])
app.include_router(personnel.router, prefix="/api/personnel", tags=["personnel"])
app.include_router(purchasing.router, prefix="/api/purchasing", tags=["purchasing"])
app.include_router(production.router, prefix="/api/production", tags=["production"])
app.include_router(media.router, prefix="/api/media", tags=["media"])
app.include_router(design.router, prefix="/api/designs", tags=["designs"])
app.include_router(einvoice.router, prefix="/api/einvoices", tags=["e-invoices"])


@app.get("/")
async def root():
    """Root endpoint - returns API version and basic info."""
    return {"message": "AdVantage API v3", "version": "3.0.0"}


@app.get("/api/health")
async def health():
    """Health check endpoint - returns API health status."""
    return {"status": "healthy"}