"""
AdVantage API v3 - Test Configuration
"""
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from app.core.permissions import Role
from app.api.routes.auth import get_password_hash, create_access_token

# Configure pytest-asyncio
pytest_plugins = ('pytest_asyncio',)


@pytest_asyncio.fixture
async def client():
    """Async HTTP client for testing"""
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    # Mock database before importing routes
    with patch('app.core.database.db') as mock_db_instance:
        mock_db = MagicMock()

        # Setup mock collections with async methods
        for collection_name in ['users', 'customers', 'quotes', 'orders']:
            collection = MagicMock()
            collection.find_one = AsyncMock(return_value=None)
            collection.insert_one = AsyncMock(return_value=MagicMock(inserted_id=f"test_{collection_name[:-1]}_id"))
            collection.update_one = AsyncMock(return_value=MagicMock(matched_count=1, modified_count=1))
            collection.delete_many = AsyncMock()
            collection.count_documents = AsyncMock(return_value=0)

            # Setup find to return mock cursor
            mock_cursor = MagicMock()
            mock_cursor.sort = MagicMock(return_value=MagicMock(to_list=AsyncMock(return_value=[])))
            mock_cursor.skip = MagicMock(return_value=MagicMock(
                limit=MagicMock(return_value=MagicMock(
                    sort=MagicMock(return_value=MagicMock(to_list=AsyncMock(return_value=[])))
                ))
            ))
            collection.find = MagicMock(return_value=mock_cursor)

            setattr(mock_db, collection_name, collection)

        mock_db_instance.db = mock_db
        mock_db_instance.client = MagicMock()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac


@pytest.fixture
def mock_db():
    """Create a mock database session"""
    mock_db = MagicMock()

    for collection_name in ['users', 'customers', 'quotes', 'orders']:
        collection = MagicMock()
        collection.find_one = AsyncMock(return_value=None)
        collection.insert_one = AsyncMock(return_value=MagicMock(inserted_id=f"test_{collection_name[:-1]}_id"))
        collection.update_one = AsyncMock(return_value=MagicMock(matched_count=1, modified_count=1))
        collection.delete_many = AsyncMock()
        collection.count_documents = AsyncMock(return_value=0)

        mock_cursor = MagicMock()
        mock_cursor.sort = MagicMock(return_value=MagicMock(to_list=AsyncMock(return_value=[])))
        mock_cursor.skip = MagicMock(return_value=MagicMock(
            limit=MagicMock(return_value=MagicMock(
                sort=MagicMock(return_value=MagicMock(to_list=AsyncMock(return_value=[])))
            ))
        ))
        collection.find = MagicMock(return_value=mock_cursor)

        setattr(mock_db, collection_name, collection)

    return mock_db


@pytest.fixture
def test_user():
    """Create a test user dict"""
    return {
        "_id": "test_user_id_123",
        "email": "testuser@example.com",
        "username": "testuser",
        "fullName": "Test User",
        "hashedPassword": get_password_hash("testpassword123"),
        "roles": [Role.USER.value],
        "isActive": True,
        "createdAt": datetime.utcnow().isoformat(),
    }


@pytest.fixture
def admin_user():
    """Create an admin user dict"""
    return {
        "_id": "admin_user_id_456",
        "email": "admin@example.com",
        "username": "admin",
        "fullName": "Admin User",
        "hashedPassword": get_password_hash("adminpassword123"),
        "roles": [Role.ADMIN.value],
        "isActive": True,
        "createdAt": datetime.utcnow().isoformat(),
    }


@pytest.fixture
def sales_user():
    """Create a sales user dict"""
    return {
        "_id": "sales_user_id_789",
        "email": "sales@example.com",
        "username": "sales",
        "fullName": "Sales User",
        "hashedPassword": get_password_hash("salespassword123"),
        "roles": [Role.SALES.value],
        "isActive": True,
        "createdAt": datetime.utcnow().isoformat(),
    }


@pytest.fixture
def user_token(test_user):
    """Generate JWT token for test user"""
    return create_access_token(data={"sub": test_user["_id"]})


@pytest.fixture
def admin_token(admin_user):
    """Generate JWT token for admin user"""
    return create_access_token(data={"sub": admin_user["_id"]})


@pytest.fixture
def sales_token(sales_user):
    """Generate JWT token for sales user"""
    return create_access_token(data={"sub": sales_user["_id"]})


@pytest.fixture
def auth_headers(user_token):
    """Auth headers for test user"""
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture
def admin_auth_headers(admin_token):
    """Auth headers for admin user"""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def sales_auth_headers(sales_token):
    """Auth headers for sales user"""
    return {"Authorization": f"Bearer {sales_token}"}