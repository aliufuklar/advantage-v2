"""
AdVantage API v3 - Main Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import db
from app.core.config import settings

from app.api.routes import auth, customers, quotes, orders, discoveries, inventory, finance, personnel, purchasing, production


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


@app.get("/")
async def root():
    return {"message": "AdVantage API v3", "version": "3.0.0"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}