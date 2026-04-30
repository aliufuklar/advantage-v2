"""
AdVantage API v3 - Quotes Routes
"""
from fastapi import APIRouter, HTTPException
from typing import List
from app.api.schemas.quotes import QuoteCreate, QuoteUpdate, QuoteResponse
from app.api.routes.auth import get_current_user
from app.core.database import db

router = APIRouter()


@router.get("/", response_model=List[QuoteResponse])
async def list_quotes(current_user: dict = get_current_user):
    """List all quotes"""
    cursor = db.db.quotes.find()
    quotes = await cursor.to_list(length=100)
    return quotes


@router.post("/", response_model=QuoteResponse)
async def create_quote(quote: QuoteCreate, current_user: dict = get_current_user):
    """Create a new quote"""
    count = await db.db.quotes.count_documents({})
    quote_doc = quote.model_dump()
    quote_doc["quoteNumber"] = f"TEK-{count + 1:04d}"
    quote_doc["createdBy"] = str(current_user["_id"])
    quote_doc["createdAt"] = datetime.utcnow().isoformat()
    result = await db.db.quotes.insert_one(quote_doc)
    quote_doc["_id"] = result.inserted_id
    return quote_doc


@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(quote_id: str, current_user: dict = get_current_user):
    """Get quote by ID"""
    quote = await db.db.quotes.find_one({"_id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote


@router.put("/{quote_id}", response_model=QuoteResponse)
async def update_quote(quote_id: str, quote: QuoteUpdate, current_user: dict = get_current_user):
    """Update quote"""
    quote_doc = quote.model_dump(exclude_unset=True)
    quote_doc["updatedAt"] = datetime.utcnow().isoformat()
    result = await db.db.quotes.update_one(
        {"_id": quote_id},
        {"$set": quote_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    updated = await db.db.quotes.find_one({"_id": quote_id})
    return updated


@router.delete("/{quote_id}")
async def delete_quote(quote_id: str, current_user: dict = get_current_user):
    """Delete quote (soft delete)"""
    await db.db.quotes.update_one(
        {"_id": quote_id},
        {"$set": {"isDeleted": True}}
    )
    return {"message": "Quote deleted"}