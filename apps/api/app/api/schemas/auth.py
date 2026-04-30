"""
AdVantage API v3 - Auth Schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    fullName: str = Field(..., min_length=2)


class Token(BaseModel):
    accessToken: str
    tokenType: str = "bearer"


class UserResponse(BaseModel):
    id: str = Field(..., alias="_id")
    email: str
    username: str
    fullName: str
    roles: List[str] = []
    isActive: bool = True

    class Config:
        populate_by_name = True
