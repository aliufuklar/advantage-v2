"""
AdVantage API v3 - Authentication Routes
"""
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional

from app.core.config import settings
from app.core.database import db
from app.api.schemas.auth import Token, LoginRequest, RegisterRequest, UserResponse

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


async def get_current_user(token: str = oauth2_scheme) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await db.db.users.find_one({"_id": user_id})
    if user is None:
        raise credentials_exception
    return user


@router.post("/register", response_model=UserResponse)
async def register(request: RegisterRequest):
    # Check if user exists
    existing = await db.db.users.find_one({"email": request.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user_doc = {
        "email": request.email,
        "username": request.username,
        "hashedPassword": get_password_hash(request.password),
        "fullName": request.fullName,
        "roles": ["user"],
        "isActive": True,
        "createdAt": datetime.utcnow().isoformat(),
    }
    result = await db.db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    return UserResponse(**user_doc)


@router.post("/login", response_model=Token)
async def login(body: LoginRequest):
    """Login with JSON body"""
    email = body.email
    password = body.password

    user = await db.db.users.find_one({"email": email})
    if not user or not verify_password(password, user["hashedPassword"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token = create_access_token(data={"sub": str(user["_id"])})
    return {"accessToken": access_token, "tokenType": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = get_current_user):
    return UserResponse(**current_user)
