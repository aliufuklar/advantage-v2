"""
AdVantage API v3 - Media Planning Routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from app.api.schemas.media import (
    CampaignCreate, CampaignUpdate, CampaignResponse, CampaignDetailResponse,
    AdPlacementCreate, AdPlacementUpdate, AdPlacementResponse,
    MediaBudget, ChannelBudget
)
from app.api.routes.auth import get_current_user, require_permissions
from app.core.database import db
from app.core.permissions import Permission

router = APIRouter()

MEDIA_CHANNELS = ["social", "print", "online", "tv", "radio"]
STATUSES = ["planning", "active", "paused", "completed"]


def calculate_campaign_spent(campaign_id: str) -> float:
    """Calculate total spent from placements"""
    placements = db.placements.find({"campaignId": campaign_id})
    return sum(p.get("cost", 0) for p in placements)


def get_channel_budgets(campaign_id: str, total_budget: float) -> List[ChannelBudget]:
    """Get budget breakdown by channel"""
    pipeline = [
        {"$match": {"campaignId": campaign_id}},
        {"$group": {
            "_id": "$channel",
            "spent": {"$sum": "$cost"},
            "placements": {"$sum": 1}
        }}
    ]
    results = list(db.db.placements.aggregate(pipeline))

    channel_map = {r["_id"]: {"spent": r["spent"], "placements": r["placements"]} for r in results}
    channel_budgets = []

    for channel in MEDIA_CHANNELS:
        data = channel_map.get(channel, {"spent": 0, "placements": 0})
        allocated = total_budget / len(MEDIA_CHANNELS) if total_budget > 0 else 0
        channel_budgets.append(ChannelBudget(
            channel=channel,
            allocated=allocated,
            spent=data["spent"],
            placements=data["placements"]
        ))

    return channel_budgets


def get_total_reach(campaign_id: str) -> int:
    """Get total reach from all placements"""
    placements = db.db.placements.find({"campaignId": campaign_id})
    return sum(p.get("reach", 0) or 0 for p in placements)


# ==================== CAMPAIGNS ====================

@router.get("", response_model=List[CampaignResponse])
async def list_campaigns(
    status: Optional[str] = Query(None),
    current_user: dict = Depends(require_permissions([Permission.MEDIA_READ.value]))
):
    """List all campaigns"""
    query = {}
    if status:
        query["status"] = status

    cursor = db.db.campaigns.find(query).sort("startDate", -1)
    campaigns = await cursor.to_list(length=100)
    return campaigns


@router.get("/{campaign_id}", response_model=CampaignDetailResponse)
async def get_campaign(
    campaign_id: str,
    current_user: dict = Depends(require_permissions([Permission.MEDIA_READ.value]))
):
    """Get campaign by ID with placements and budget"""
    campaign = await db.db.campaigns.find_one({"_id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Get placements
    cursor = db.db.placements.find({"campaignId": campaign_id}).sort("date", -1)
    placements = await cursor.to_list(length=500)

    # Calculate budget info
    total_budget = campaign.get("budget", 0)
    spent = campaign.get("spent", 0)
    if spent == 0:
        spent = calculate_campaign_spent(campaign_id)

    channel_budgets = get_channel_budgets(campaign_id, total_budget)
    total_reach = get_total_reach(campaign_id)

    # Calculate ROI (simplified: assume each reach is worth 0.5 units)
    roi = None
    if total_reach > 0 and spent > 0:
        roi = (total_reach * 0.5 - spent) / spent * 100

    budget_info = MediaBudget(
        totalBudget=total_budget,
        totalSpent=spent,
        remaining=total_budget - spent,
        channelBreakdown=channel_budgets,
        roi=roi,
        totalReach=total_reach
    )

    return {
        **campaign,
        "placements": placements,
        "budget": budget_info
    }


@router.post("", response_model=CampaignResponse)
async def create_campaign(
    campaign: CampaignCreate,
    current_user: dict = Depends(require_permissions([Permission.MEDIA_CREATE.value]))
):
    """Create a new campaign"""
    if campaign.status not in STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {STATUSES}")

    for channel in campaign.channels:
        if channel not in MEDIA_CHANNELS:
            raise HTTPException(status_code=400, detail=f"Invalid channel: {channel}. Must be one of: {MEDIA_CHANNELS}")

    campaign_doc = campaign.model_dump()
    result = await db.db.campaigns.insert_one(campaign_doc)
    campaign_doc["_id"] = result.inserted_id
    return campaign_doc


@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: str,
    campaign: CampaignUpdate,
    current_user: dict = Depends(require_permissions([Permission.MEDIA_UPDATE.value]))
):
    """Update a campaign"""
    if campaign.status is not None and campaign.status not in STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {STATUSES}")

    if campaign.channels is not None:
        for channel in campaign.channels:
            if channel not in MEDIA_CHANNELS:
                raise HTTPException(status_code=400, detail=f"Invalid channel: {channel}. Must be one of: {MEDIA_CHANNELS}")

    campaign_doc = campaign.model_dump(exclude_unset=True)
    if not campaign_doc:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Recalculate spent if channels change
    if "channels" in campaign_doc or "budget" in campaign_doc:
        campaign_doc["spent"] = calculate_campaign_spent(campaign_id)

    result = await db.db.campaigns.update_one(
        {"_id": campaign_id},
        {"$set": campaign_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")

    updated = await db.db.campaigns.find_one({"_id": campaign_id})
    return updated


@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    current_user: dict = Depends(require_permissions([Permission.MEDIA_DELETE.value]))
):
    """Delete a campaign and its placements"""
    # Delete associated placements first
    await db.db.placements.delete_many({"campaignId": campaign_id})

    result = await db.db.campaigns.delete_one({"_id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted"}


# ==================== AD PLACEMENTS ====================

@router.get("/placements", response_model=List[AdPlacementResponse])
async def list_placements(
    campaignId: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    current_user: dict = Depends(require_permissions([Permission.MEDIA_READ.value]))
):
    """List all ad placements"""
    query = {}
    if campaignId:
        query["campaignId"] = campaignId
    if channel:
        query["channel"] = channel

    cursor = db.db.placements.find(query).sort("date", -1)
    placements = await cursor.to_list(length=500)
    return placements


@router.get("/placements/{placement_id}", response_model=AdPlacementResponse)
async def get_placement(
    placement_id: str,
    current_user: dict = Depends(require_permissions([Permission.MEDIA_READ.value]))
):
    """Get placement by ID"""
    placement = await db.db.placements.find_one({"_id": placement_id})
    if not placement:
        raise HTTPException(status_code=404, detail="Placement not found")
    return placement


@router.post("/placements", response_model=AdPlacementResponse)
async def create_placement(
    placement: AdPlacementCreate,
    current_user: dict = Depends(require_permissions([Permission.MEDIA_CREATE.value]))
):
    """Create a new ad placement"""
    if placement.channel not in MEDIA_CHANNELS:
        raise HTTPException(status_code=400, detail=f"Invalid channel. Must be one of: {MEDIA_CHANNELS}")

    # Verify campaign exists
    campaign = await db.db.campaigns.find_one({"_id": placement.campaignId})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    placement_doc = placement.model_dump()
    result = await db.db.placements.insert_one(placement_doc)
    placement_doc["_id"] = result.inserted_id

    # Update campaign spent amount
    new_spent = calculate_campaign_spent(placement.campaignId)
    await db.db.campaigns.update_one(
        {"_id": placement.campaignId},
        {"$set": {"spent": new_spent}}
    )

    return placement_doc


@router.put("/placements/{placement_id}", response_model=AdPlacementResponse)
async def update_placement(
    placement_id: str,
    placement: AdPlacementUpdate,
    current_user: dict = Depends(require_permissions([Permission.MEDIA_UPDATE.value]))
):
    """Update an ad placement"""
    if placement.channel is not None and placement.channel not in MEDIA_CHANNELS:
        raise HTTPException(status_code=400, detail=f"Invalid channel. Must be one of: {MEDIA_CHANNELS}")

    placement_doc = placement.model_dump(exclude_unset=True)
    if not placement_doc:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db.db.placements.update_one(
        {"_id": placement_id},
        {"$set": placement_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Placement not found")

    # Get placement to find campaign
    updated_placement = await db.db.placements.find_one({"_id": placement_id})
    if updated_placement:
        # Update campaign spent amount
        new_spent = calculate_campaign_spent(updated_placement["campaignId"])
        await db.db.campaigns.update_one(
            {"_id": updated_placement["campaignId"]},
            {"$set": {"spent": new_spent}}
        )

    return updated_placement


@router.delete("/placements/{placement_id}")
async def delete_placement(
    placement_id: str,
    current_user: dict = Depends(require_permissions([Permission.MEDIA_DELETE.value]))
):
    """Delete an ad placement"""
    placement = await db.db.placements.find_one({"_id": placement_id})
    if not placement:
        raise HTTPException(status_code=404, detail="Placement not found")

    campaign_id = placement["campaignId"]
    result = await db.db.placements.delete_one({"_id": placement_id})

    # Update campaign spent amount
    new_spent = calculate_campaign_spent(campaign_id)
    await db.db.campaigns.update_one(
        {"_id": campaign_id},
        {"$set": {"spent": new_spent}}
    )

    return {"message": "Placement deleted"}


# ==================== MEDIA BUDGET ====================

@router.get("/budget/summary", response_model=MediaBudget)
async def get_media_budget_summary(
    current_user: dict = Depends(require_permissions([Permission.MEDIA_READ.value]))
):
    """Get overall media budget summary across all campaigns"""
    campaigns = await db.db.campaigns.find().to_list(length=100)

    total_budget = sum(c.get("budget", 0) for c in campaigns)
    total_spent = sum(c.get("spent", 0) for c in campaigns)
    total_reach = 0

    channel_breakdown = []
    for channel in MEDIA_CHANNELS:
        # Get all placements for this channel
        placements = await db.db.placements.find({"channel": channel}).to_list(length=1000)
        channel_spent = sum(p.get("cost", 0) for p in placements)
        channel_reach = sum(p.get("reach", 0) or 0 for p in placements)
        total_reach += channel_reach

        channel_budgets = get_channel_budgets("", total_budget)
        for cb in channel_budgets:
            if cb.channel == channel:
                channel_breakdown.append(ChannelBudget(
                    channel=channel,
                    allocated=cb.allocated,
                    spent=channel_spent,
                    placements=len(placements)
                ))
                break

    roi = None
    if total_reach > 0 and total_spent > 0:
        roi = (total_reach * 0.5 - total_spent) / total_spent * 100

    return MediaBudget(
        totalBudget=total_budget,
        totalSpent=total_spent,
        remaining=total_budget - total_spent,
        channelBreakdown=channel_breakdown,
        roi=roi,
        totalReach=total_reach
    )