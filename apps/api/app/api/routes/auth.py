"""
AdVantage API v3 - Authentication Routes
"""
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, List

from app.core.config import settings
from app.core.database import db
from app.core.permissions import Permission, has_permission, has_any_permission, has_all_permissions, Role
from app.api.schemas.auth import Token, LoginRequest, RegisterRequest, UserResponse, RoleUpdateRequest

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


class RequirePermission:
    """Dependency for permission checking"""

    def __init__(self, permissions: List[str], require_all: bool = False):
        self.permissions = permissions
        self.require_all = require_all

    async def __call__(self, current_user: dict = Depends(get_current_user)) -> dict:
        user_roles = current_user.get("roles", [])

        # Check if user is active
        if not current_user.get("isActive", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )

        # Check permissions
        if self.require_all:
            if not has_all_permissions(user_roles, self.permissions):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )
        else:
            if not has_any_permission(user_roles, self.permissions):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )

        return current_user


def require_permissions(permissions: List[str], require_all: bool = False):
    """Decorator-like dependency for permission checking"""
    return RequirePermission(permissions, require_all)


def require_role(role: str):
    """Dependency that requires user to have a specific role"""
    async def check_role(current_user: dict = Depends(get_current_user)) -> dict:
        user_roles = current_user.get("roles", [])
        if role not in user_roles and Role.ADMIN not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' required"
            )
        return current_user
    return check_role


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
        "roles": [Role.USER.value],
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

    if not user.get("isActive", True):
        raise HTTPException(status_code=401, detail="User account is inactive")

    access_token = create_access_token(data={"sub": str(user["_id"])})
    return {"accessToken": access_token, "tokenType": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    current_user: dict = Depends(require_permissions([Permission.USERS_READ.value, Permission.ADMIN_ALL.value]))
):
    """List all users (admin only)"""
    cursor = db.db.users.find()
    users = await cursor.to_list(length=100)
    return [UserResponse(**u) for u in users]


@router.put("/users/{user_id}/roles", response_model=UserResponse)
async def update_user_roles(
    user_id: str,
    request: RoleUpdateRequest,
    current_user: dict = Depends(require_permissions([Permission.USERS_MANAGE_ROLES.value, Permission.ADMIN_ALL.value]))
):
    """Update user roles (admin only)"""
    # Prevent modifying own roles
    if str(current_user["_id"]) == user_id:
        raise HTTPException(status_code=400, detail="Cannot modify your own roles")

    # Validate roles
    valid_roles = [r.value for r in Role]
    for role in request.roles:
        if role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role: {role}")

    result = await db.db.users.update_one(
        {"_id": user_id},
        {"$set": {"roles": request.roles}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    updated = await db.db.users.find_one({"_id": user_id})
    return UserResponse(**updated)
