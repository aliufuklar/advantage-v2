"""
AdVantage API v3 - Database Connection
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings


class Database:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None

    async def connect(self):
        self.client = AsyncIOMotorClient(settings.MONGODB_URL)
        self.db = self.client[settings.MONGODB_DB]
        # Create indexes
        await self._create_indexes()

    async def disconnect(self):
        if self.client:
            self.client.close()

    async def _create_indexes(self):
        if not self.db:
            return

        # Customers
        await self.db.customers.create_index("email", unique=True)
        await self.db.customers.create_index("customerNumber")

        # Users
        await self.db.users.create_index("email", unique=True)
        await self.db.users.create_index("username", unique=True)

        # Quotes
        await self.db.quotes.create_index("quoteNumber", unique=True)
        await self.db.quotes.create_index("customerId")
        await self.db.quotes.create_index("status")

        # Orders
        await self.db.orders.create_index("orderNumber", unique=True)
        await self.db.orders.create_index("customerId")
        await self.db.orders.create_index("status")

        # Discoveries
        await self.db.discoveries.create_index("discoveryNumber", unique=True)
        await self.db.discoveries.create_index("status")

        # Activity logs
        await self.db.activity_logs.create_index("createdAt")
        await self.db.activity_logs.create_index("entityType")


db = Database()
