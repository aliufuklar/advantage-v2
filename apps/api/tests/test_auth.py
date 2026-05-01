"""
AdVantage API v3 - Auth Routes Tests
Tests that don't require actual database connection.
"""
import pytest
from datetime import timedelta
from app.api.routes.auth import create_access_token, get_password_hash, verify_password
from app.core.permissions import Role, Permission


class TestPasswordHashing:
    """Tests for password hashing functions"""

    def test_password_hash_and_verify(self):
        """Test that hashing and verification work correctly"""
        password = "testpassword123"
        hashed = get_password_hash(password)

        assert hashed != password
        assert verify_password(password, hashed) is True
        assert verify_password("wrongpassword", hashed) is False

    def test_different_hashes_for_same_password(self):
        """Test that same password produces different hashes (due to salt)"""
        password = "testpassword123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        assert hash1 != hash2
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestTokenCreation:
    """Tests for JWT token creation"""

    def test_create_access_token_basic(self):
        """Test basic token creation"""
        token = create_access_token(data={"sub": "user123"})
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_access_token_with_expiry(self):
        """Test token creation with custom expiry"""
        token = create_access_token(
            data={"sub": "user123"},
            expires_delta=timedelta(minutes=30)
        )
        assert token is not None

    def test_token_contains_expected_data(self):
        """Test that token can be decoded"""
        from jose import jwt
        from app.core.config import settings

        user_id = "test_user_id"
        token = create_access_token(data={"sub": user_id})

        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        assert payload["sub"] == user_id
        assert "exp" in payload


class TestRolePermissions:
    """Tests for role and permission system"""

    def test_admin_role_has_all_permissions(self):
        """Test that admin role has all permissions"""
        admin_permissions = set(Role.ADMIN.value)
        # Admin should have admin:all
        assert Permission.ADMIN_ALL.value in [p.value for p in Permission]

    def test_user_role_permissions(self):
        """Test that USER role has basic permissions"""
        from app.core.permissions import get_permissions_for_role

        user_perms = get_permissions_for_role(Role.USER.value)
        assert Permission.CUSTOMERS_READ.value in user_perms
        assert Permission.QUOTES_READ.value in user_perms
        assert Permission.ORDERS_READ.value in user_perms

    def test_sales_role_permissions(self):
        """Test that SALES role has correct permissions"""
        from app.core.permissions import get_permissions_for_role

        sales_perms = get_permissions_for_role(Role.SALES.value)
        assert Permission.CUSTOMERS_READ.value in sales_perms
        assert Permission.CUSTOMERS_CREATE.value in sales_perms
        assert Permission.QUOTES_READ.value in sales_perms
        assert Permission.QUOTES_CREATE.value in sales_perms
        # Sales should NOT have admin permissions
        assert Permission.USERS_READ.value not in sales_perms

    def test_warehouse_role_permissions(self):
        """Test that WAREHOUSE role has correct permissions"""
        from app.core.permissions import get_permissions_for_role

        warehouse_perms = get_permissions_for_role(Role.WAREHOUSE.value)
        assert Permission.INVENTORY_READ.value in warehouse_perms
        assert Permission.PRODUCTION_READ.value in warehouse_perms
        # Warehouse should NOT have customer permissions
        assert Permission.CUSTOMERS_READ.value not in warehouse_perms

    def test_viewer_role_permissions(self):
        """Test that VIEWER role has read-only permissions"""
        from app.core.permissions import get_permissions_for_role

        viewer_perms = get_permissions_for_role(Role.VIEWER.value)
        # All read permissions
        assert Permission.CUSTOMERS_READ.value in viewer_perms
        assert Permission.QUOTES_READ.value in viewer_perms
        # No create/update/delete permissions
        assert Permission.CUSTOMERS_CREATE.value not in viewer_perms
        assert Permission.QUOTES_UPDATE.value not in viewer_perms


class TestPermissionChecks:
    """Tests for permission checking functions"""

    def test_has_permission_admin_bypasses_all(self):
        """Test that admin role bypasses all permission checks"""
        from app.core.permissions import has_permission

        # Admin should pass any permission check
        assert has_permission([Role.ADMIN.value], Permission.CUSTOMERS_READ.value) is True
        assert has_permission([Role.ADMIN.value], Permission.USERS_MANAGE_ROLES.value) is True
        assert has_permission([Role.ADMIN.value], Permission.ADMIN_ALL.value) is True

    def test_has_permission_user_role(self):
        """Test permission check for user role"""
        from app.core.permissions import has_permission

        assert has_permission([Role.USER.value], Permission.CUSTOMERS_READ.value) is True
        assert has_permission([Role.USER.value], Permission.QUOTES_READ.value) is True
        assert has_permission([Role.USER.value], Permission.CUSTOMERS_CREATE.value) is False

    def test_has_any_permission(self):
        """Test has_any_permission function"""
        from app.core.permissions import has_any_permission

        # Should return True if any permission is granted
        assert has_any_permission([Role.ADMIN.value], [Permission.USERS_READ.value, Permission.USERS_MANAGE_ROLES.value]) is True
        # Should return False if no permission is granted
        assert has_any_permission([Role.USER.value], [Permission.USERS_READ.value, Permission.USERS_MANAGE_ROLES.value]) is False

    def test_has_all_permissions(self):
        """Test has_all_permissions function"""
        from app.core.permissions import has_all_permissions

        # Admin has all permissions
        assert has_all_permissions([Role.ADMIN.value], [Permission.CUSTOMERS_READ.value, Permission.QUOTES_READ.value]) is True
        # User doesn't have all these permissions
        assert has_all_permissions([Role.USER.value], [Permission.CUSTOMERS_READ.value, Permission.QUOTES_CREATE.value]) is False

    def test_has_permission_with_multiple_roles(self):
        """Test permission check when user has multiple roles"""
        from app.core.permissions import has_permission, has_all_permissions

        # User with both user and sales roles
        roles = [Role.USER.value, Role.SALES.value]

        # Should have permissions from both roles
        assert has_permission(roles, Permission.CUSTOMERS_CREATE.value) is True  # from SALES
        assert has_permission(roles, Permission.ORDERS_CREATE.value) is True  # from SALES

        # But not admin-only permissions
        assert has_permission(roles, Permission.USERS_MANAGE_ROLES.value) is False


class TestPermissionEnumValues:
    """Tests for permission enum values"""

    def test_all_permissions_have_correct_format(self):
        """Test that all permissions follow resource:action format"""
        for perm in Permission:
            parts = perm.value.split(":")
            assert len(parts) == 2
            assert parts[0] in ['admin', 'customers', 'quotes', 'orders', 'discoveries',
                               'inventory', 'personnel', 'finance', 'production',
                               'purchasing', 'reports', 'users', 'media', 'design', 'einvoices']
            assert parts[1] in ['read', 'create', 'update', 'delete', 'all', 'manage_roles']


class TestRoleEnumValues:
    """Tests for role enum values"""

    def test_all_roles_are_strings(self):
        """Test that all roles are valid string values"""
        for role in Role:
            assert isinstance(role.value, str)
            assert len(role.value) > 0

    def test_role_values(self):
        """Test specific role values"""
        assert Role.ADMIN.value == "admin"
        assert Role.MANAGER.value == "manager"
        assert Role.SALES.value == "sales"
        assert Role.WAREHOUSE.value == "warehouse"
        assert Role.FINANCE.value == "finance"
        assert Role.VIEWER.value == "viewer"
        assert Role.USER.value == "user"