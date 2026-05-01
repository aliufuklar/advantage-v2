"""
AdVantage API v3 - Role-Based Access Control (RBAC)
Defines roles, permissions, and role hierarchy
"""
from enum import Enum
from typing import List, Set

# Role definitions
class Role(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    SALES = "sales"
    WAREHOUSE = "warehouse"
    FINANCE = "finance"
    VIEWER = "viewer"
    USER = "user"


# Permission definitions (resource:action)
class Permission(str, Enum):
    # Admin permissions
    ADMIN_ALL = "admin:all"

    # Customer permissions
    CUSTOMERS_READ = "customers:read"
    CUSTOMERS_CREATE = "customers:create"
    CUSTOMERS_UPDATE = "customers:update"
    CUSTOMERS_DELETE = "customers:delete"

    # Quote permissions
    QUOTES_READ = "quotes:read"
    QUOTES_CREATE = "quotes:create"
    QUOTES_UPDATE = "quotes:update"
    QUOTES_DELETE = "quotes:delete"

    # Order permissions
    ORDERS_READ = "orders:read"
    ORDERS_CREATE = "orders:create"
    ORDERS_UPDATE = "orders:update"
    ORDERS_DELETE = "orders:delete"

    # Discovery permissions
    DISCOVERIES_READ = "discoveries:read"
    DISCOVERIES_CREATE = "discoveries:create"
    DISCOVERIES_UPDATE = "discoveries:update"
    DISCOVERIES_DELETE = "discoveries:delete"

    # Inventory permissions
    INVENTORY_READ = "inventory:read"
    INVENTORY_CREATE = "inventory:create"
    INVENTORY_UPDATE = "inventory:update"
    INVENTORY_DELETE = "inventory:delete"

    # Personnel permissions
    PERSONNEL_READ = "personnel:read"
    PERSONNEL_CREATE = "personnel:create"
    PERSONNEL_UPDATE = "personnel:update"
    PERSONNEL_DELETE = "personnel:delete"

    # Finance permissions
    FINANCE_READ = "finance:read"
    FINANCE_CREATE = "finance:create"
    FINANCE_UPDATE = "finance:update"
    FINANCE_DELETE = "finance:delete"

    # Production permissions
    PRODUCTION_READ = "production:read"
    PRODUCTION_CREATE = "production:create"
    PRODUCTION_UPDATE = "production:update"
    PRODUCTION_DELETE = "production:delete"

    # Purchasing permissions
    PURCHASING_READ = "purchasing:read"
    PURCHASING_CREATE = "purchasing:create"
    PURCHASING_UPDATE = "purchasing:update"
    PURCHASING_DELETE = "purchasing:delete"

    # Media permissions
    MEDIA_READ = "media:read"
    MEDIA_CREATE = "media:create"
    MEDIA_UPDATE = "media:update"
    MEDIA_DELETE = "media:delete"

    # Reports permissions
    REPORTS_READ = "reports:read"

    # User management
    USERS_READ = "users:read"
    USERS_UPDATE = "users:update"
    USERS_MANAGE_ROLES = "users:manage_roles"


# Role to permissions mapping
ROLE_PERMISSIONS: dict[str, Set[str]] = {
    Role.ADMIN: {
        Permission.ADMIN_ALL,
        Permission.CUSTOMERS_READ, Permission.CUSTOMERS_CREATE, Permission.CUSTOMERS_UPDATE, Permission.CUSTOMERS_DELETE,
        Permission.QUOTES_READ, Permission.QUOTES_CREATE, Permission.QUOTES_UPDATE, Permission.QUOTES_DELETE,
        Permission.ORDERS_READ, Permission.ORDERS_CREATE, Permission.ORDERS_UPDATE, Permission.ORDERS_DELETE,
        Permission.DISCOVERIES_READ, Permission.DISCOVERIES_CREATE, Permission.DISCOVERIES_UPDATE, Permission.DISCOVERIES_DELETE,
        Permission.INVENTORY_READ, Permission.INVENTORY_CREATE, Permission.INVENTORY_UPDATE, Permission.INVENTORY_DELETE,
        Permission.PERSONNEL_READ, Permission.PERSONNEL_CREATE, Permission.PERSONNEL_UPDATE, Permission.PERSONNEL_DELETE,
        Permission.FINANCE_READ, Permission.FINANCE_CREATE, Permission.FINANCE_UPDATE, Permission.FINANCE_DELETE,
        Permission.PRODUCTION_READ, Permission.PRODUCTION_CREATE, Permission.PRODUCTION_UPDATE, Permission.PRODUCTION_DELETE,
        Permission.PURCHASING_READ, Permission.PURCHASING_CREATE, Permission.PURCHASING_UPDATE, Permission.PURCHASING_DELETE,
        Permission.MEDIA_READ, Permission.MEDIA_CREATE, Permission.MEDIA_UPDATE, Permission.MEDIA_DELETE,
        Permission.REPORTS_READ,
        Permission.USERS_READ, Permission.USERS_UPDATE, Permission.USERS_MANAGE_ROLES,
    },
    Role.MANAGER: {
        Permission.CUSTOMERS_READ, Permission.CUSTOMERS_CREATE, Permission.CUSTOMERS_UPDATE, Permission.CUSTOMERS_DELETE,
        Permission.QUOTES_READ, Permission.QUOTES_CREATE, Permission.QUOTES_UPDATE, Permission.QUOTES_DELETE,
        Permission.ORDERS_READ, Permission.ORDERS_CREATE, Permission.ORDERS_UPDATE, Permission.ORDERS_DELETE,
        Permission.DISCOVERIES_READ, Permission.DISCOVERIES_CREATE, Permission.DISCOVERIES_UPDATE, Permission.DISCOVERIES_DELETE,
        Permission.INVENTORY_READ, Permission.INVENTORY_CREATE, Permission.INVENTORY_UPDATE, Permission.INVENTORY_DELETE,
        Permission.PERSONNEL_READ, Permission.PERSONNEL_CREATE, Permission.PERSONNEL_UPDATE, Permission.PERSONNEL_DELETE,
        Permission.FINANCE_READ, Permission.FINANCE_CREATE, Permission.FINANCE_UPDATE, Permission.FINANCE_DELETE,
        Permission.PRODUCTION_READ, Permission.PRODUCTION_CREATE, Permission.PRODUCTION_UPDATE, Permission.PRODUCTION_DELETE,
        Permission.PURCHASING_READ, Permission.PURCHASING_CREATE, Permission.PURCHASING_UPDATE, Permission.PURCHASING_DELETE,
        Permission.MEDIA_READ, Permission.MEDIA_CREATE, Permission.MEDIA_UPDATE, Permission.MEDIA_DELETE,
        Permission.REPORTS_READ,
    },
    Role.SALES: {
        Permission.CUSTOMERS_READ, Permission.CUSTOMERS_CREATE, Permission.CUSTOMERS_UPDATE,
        Permission.QUOTES_READ, Permission.QUOTES_CREATE, Permission.QUOTES_UPDATE,
        Permission.ORDERS_READ, Permission.ORDERS_CREATE, Permission.ORDERS_UPDATE,
    },
    Role.WAREHOUSE: {
        Permission.DISCOVERIES_READ, Permission.DISCOVERIES_CREATE, Permission.DISCOVERIES_UPDATE,
        Permission.INVENTORY_READ, Permission.INVENTORY_CREATE, Permission.INVENTORY_UPDATE,
        Permission.PRODUCTION_READ, Permission.PRODUCTION_CREATE, Permission.PRODUCTION_UPDATE,
    },
    Role.FINANCE: {
        Permission.FINANCE_READ, Permission.FINANCE_CREATE, Permission.FINANCE_UPDATE,
        Permission.REPORTS_READ,
    },
    Role.VIEWER: {
        Permission.CUSTOMERS_READ,
        Permission.QUOTES_READ,
        Permission.ORDERS_READ,
        Permission.DISCOVERIES_READ,
        Permission.INVENTORY_READ,
        Permission.PERSONNEL_READ,
        Permission.FINANCE_READ,
        Permission.PRODUCTION_READ,
        Permission.REPORTS_READ,
    },
    Role.USER: {
        Permission.CUSTOMERS_READ,
        Permission.QUOTES_READ,
        Permission.ORDERS_READ,
    },
}


def get_permissions_for_role(role: str) -> Set[str]:
    """Get all permissions for a given role"""
    return ROLE_PERMISSIONS.get(role, set())


def get_all_permissions_for_user(roles: List[str]) -> Set[str]:
    """Get all permissions for a user based on their roles"""
    permissions: Set[str] = set()
    for role in roles:
        permissions.update(get_permissions_for_role(role))
    return permissions


def has_permission(user_roles: List[str], required_permission: str) -> bool:
    """Check if user has a specific permission based on their roles"""
    # Admin has all permissions
    if Role.ADMIN in user_roles:
        return True

    # Check if any of the user's roles grants the required permission
    for role in user_roles:
        if required_permission in get_permissions_for_role(role):
            return True

    return False


def has_any_permission(user_roles: List[str], required_permissions: List[str]) -> bool:
    """Check if user has any of the specified permissions"""
    for perm in required_permissions:
        if has_permission(user_roles, perm):
            return True
    return False


def has_all_permissions(user_roles: List[str], required_permissions: List[str]) -> bool:
    """Check if user has all of the specified permissions"""
    for perm in required_permissions:
        if not has_permission(user_roles, perm):
            return False
    return True
