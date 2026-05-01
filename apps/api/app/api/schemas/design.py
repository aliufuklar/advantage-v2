"""
AdVantage API v3 - Design Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class DesignVersion(BaseModel):
    version: int = 1
    canvasData: str  # JSON string of fabric.js canvas state
    thumbnail: Optional[str] = None  # Base64 encoded thumbnail
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    createdBy: Optional[str] = None


class DesignTemplate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    width: int = 800
    height: int = 600
    backgroundColor: str = "#ffffff"
    objects: str = "[]"  # JSON string of fabric.js objects
    thumbnail: Optional[str] = None
    tags: List[str] = []
    isPublic: bool = False
    createdBy: Optional[str] = None


class DesignTemplateCreate(DesignTemplate):
    pass


class DesignTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    backgroundColor: Optional[str] = None
    objects: Optional[str] = None
    thumbnail: Optional[str] = None
    tags: Optional[List[str]] = None
    isPublic: Optional[bool] = None


class DesignTemplateResponse(DesignTemplate):
    id: str = Field(..., alias="_id")
    templateNumber: str
    versions: List[DesignVersion] = []
    currentVersion: int = 1
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True


class DesignVersionResponse(DesignVersion):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True


class AISketchAnalysisRequest(BaseModel):
    imageData: str  # Base64 encoded sketch image
    prompt: Optional[str] = None


class AISketchAnalysisResponse(BaseModel):
    detectedObjects: List[dict] = []
    suggestedImprovements: List[str] = []
    estimatedComplexity: str  # "simple", "medium", "complex"
    recommendedTemplates: List[str] = []  # Template IDs
    confidence: float  # 0.0 to 1.0