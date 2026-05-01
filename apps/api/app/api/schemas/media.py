"""
AdVantage API v3 - Media Planning Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CampaignBase(BaseModel):
    name: str
    description: str
    startDate: str
    endDate: str
    status: str = "planning"  # planning, active, paused, completed
    budget: float
    spent: float = 0
    channels: List[str] = []
    targetAudience: Optional[str] = None


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    status: Optional[str] = None
    budget: Optional[float] = None
    spent: Optional[float] = None
    channels: Optional[List[str]] = None
    targetAudience: Optional[str] = None


class CampaignResponse(CampaignBase):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True


class AdPlacementBase(BaseModel):
    campaignId: str
    channel: str  # social, print, online, tv, radio
    name: str
    date: str
    cost: float
    reach: Optional[int] = None
    notes: Optional[str] = None


class AdPlacementCreate(AdPlacementBase):
    pass


class AdPlacementUpdate(BaseModel):
    campaignId: Optional[str] = None
    channel: Optional[str] = None
    name: Optional[str] = None
    date: Optional[str] = None
    cost: Optional[float] = None
    reach: Optional[int] = None
    notes: Optional[str] = None


class AdPlacementResponse(AdPlacementBase):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True


class ChannelBudget(BaseModel):
    channel: str
    allocated: float
    spent: float
    placements: int


class MediaBudget(BaseModel):
    totalBudget: float
    totalSpent: float
    remaining: float
    channelBreakdown: List[ChannelBudget]
    roi: Optional[float] = None
    totalReach: int


class CampaignDetailResponse(CampaignResponse):
    placements: List[AdPlacementResponse] = []
    budget: Optional[MediaBudget] = None