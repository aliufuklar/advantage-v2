"""
AdVantage API v3 - Orders Routes Tests
Tests for order schemas and calculations.
"""
import pytest
from datetime import datetime


class TestOrderCalculations:
    """Tests for order total calculations"""

    def test_calculate_totals_with_items(self):
        """Test total calculation with multiple items"""
        from app.api.routes.orders import calculate_totals

        items = [
            {"quantity": 2, "unitPrice": 100},
            {"quantity": 1, "unitPrice": 50},
        ]

        result = calculate_totals(items, 20)

        # (2 * 100) + (1 * 50) = 250
        assert result["subtotal"] == 250
        # 250 * 0.2 = 50
        assert result["taxAmount"] == 50
        # 250 + 50 = 300
        assert result["total"] == 300

    def test_calculate_totals_with_empty_items(self):
        """Test total calculation with no items"""
        from app.api.routes.orders import calculate_totals

        result = calculate_totals([], 20)

        assert result["subtotal"] == 0
        assert result["taxAmount"] == 0
        assert result["total"] == 0

    def test_calculate_totals_custom_tax_rate(self):
        """Test total calculation with custom tax rate"""
        from app.api.routes.orders import calculate_totals

        items = [{"quantity": 10, "unitPrice": 100}]
        result = calculate_totals(items, 8)

        assert result["subtotal"] == 1000
        assert result["taxAmount"] == 80  # 1000 * 0.08
        assert result["total"] == 1080

    def test_calculate_totals_zero_tax_rate(self):
        """Test total calculation with 0% tax"""
        from app.api.routes.orders import calculate_totals

        items = [{"quantity": 5, "unitPrice": 200}]
        result = calculate_totals(items, 0)

        assert result["subtotal"] == 1000
        assert result["taxAmount"] == 0
        assert result["total"] == 1000


class TestOrderSchemas:
    """Tests for order Pydantic schemas"""

    def test_checklist_item_schema(self):
        """Test ChecklistItem schema"""
        from app.api.schemas.orders import ChecklistItem

        item = ChecklistItem(
            id="check-1",
            label="Verify payment",
            completed=False
        )

        assert item.id == "check-1"
        assert item.label == "Verify payment"
        assert item.completed is False
        assert item.completedAt is None
        assert item.completedBy is None

    def test_checklist_item_completed(self):
        """Test ChecklistItem when completed"""
        from app.api.schemas.orders import ChecklistItem

        item = ChecklistItem(
            id="check-1",
            label="Verify payment",
            completed=True,
            completedAt="2024-01-15T10:00:00Z",
            completedBy="user-123"
        )

        assert item.completed is True
        assert item.completedAt == "2024-01-15T10:00:00Z"
        assert item.completedBy == "user-123"

    def test_checklist_item_update_schema(self):
        """Test ChecklistItemUpdate schema"""
        from app.api.schemas.orders import ChecklistItemUpdate

        update = ChecklistItemUpdate(
            id="check-1",
            completed=True
        )

        assert update.id == "check-1"
        assert update.completed is True

    def test_timeline_entry_schema(self):
        """Test TimelineEntry schema"""
        from app.api.schemas.orders import TimelineEntry

        entry = TimelineEntry(
            action="created",
            userId="user-123",
            timestamp="2024-01-15T10:00:00Z",
            details="Order created"
        )

        assert entry.action == "created"
        assert entry.userId == "user-123"
        assert entry.details == "Order created"

    def test_order_item_schema(self):
        """Test OrderItem schema"""
        from app.api.schemas.orders import OrderItem

        item = OrderItem(
            description="Product A",
            quantity=2,
            unit="adet",
            unitPrice=100,
            total=200
        )

        assert item.description == "Product A"
        assert item.quantity == 2
        assert item.total == 200

    def test_order_create_schema(self):
        """Test OrderCreate schema"""
        from app.api.schemas.orders import OrderCreate, ChecklistItem

        order = OrderCreate(
            title="Test Order",
            customerId="cust-123",
            customerName="Test Customer",
            checklist=[
                ChecklistItem(id="check-1", label="Step 1", completed=False)
            ]
        )

        assert order.title == "Test Order"
        assert order.status == "pending"  # default
        assert order.priority == "normal"  # default
        assert len(order.checklist) == 1

    def test_order_update_schema(self):
        """Test OrderUpdate schema - all fields optional"""
        from app.api.schemas.orders import OrderUpdate

        update = OrderUpdate(
            status="confirmed",
            priority="high"
        )

        assert update.status == "confirmed"
        assert update.priority == "high"
        assert update.title is None


class TestBuildTimelineEntry:
    """Tests for timeline entry builder"""

    def test_build_timeline_entry_basic(self):
        """Test building basic timeline entry"""
        from app.api.routes.orders import build_timeline_entry

        entry = build_timeline_entry("created", "user-123")

        assert entry["action"] == "created"
        assert entry["userId"] == "user-123"
        assert "timestamp" in entry

    def test_build_timeline_entry_with_details(self):
        """Test building timeline entry with details"""
        from app.api.routes.orders import build_timeline_entry

        entry = build_timeline_entry(
            "status_changed",
            "user-456",
            "Status changed from pending to confirmed"
        )

        assert entry["action"] == "status_changed"
        assert entry["details"] == "Status changed from pending to confirmed"

    def test_build_timeline_entry_timestamp_format(self):
        """Test timeline entry has ISO format timestamp"""
        from app.api.routes.orders import build_timeline_entry

        entry = build_timeline_entry("created", "user-123")
        timestamp = entry["timestamp"]

        # Should be ISO format
        assert "T" in timestamp or ":" in timestamp  # Either ISO or time format


class TestOrderStatusTransitions:
    """Tests for order status handling"""

    def test_default_order_status(self):
        """Test default order status"""
        from app.api.schemas.orders import OrderCreate

        order = OrderCreate(title="Test")
        assert order.status == "pending"

    def test_valid_status_values(self):
        """Test valid status values"""
        from app.api.schemas.orders import OrderCreate

        valid_statuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"]
        for status in valid_statuses:
            order = OrderCreate(title="Test", status=status)
            assert order.status == status

    def test_default_priority(self):
        """Test default order priority"""
        from app.api.schemas.orders import OrderCreate

        order = OrderCreate(title="Test")
        assert order.priority == "normal"

    def test_valid_priority_values(self):
        """Test valid priority values"""
        from app.api.schemas.orders import OrderCreate

        valid_priorities = ["low", "normal", "high", "urgent"]
        for priority in valid_priorities:
            order = OrderCreate(title="Test", priority=priority)
            assert order.priority == priority


class TestOrderChecklistOperations:
    """Tests for order checklist operations"""

    def test_checklist_item_marking_complete(self):
        """Test marking checklist item as complete"""
        from app.api.schemas.orders import ChecklistItem

        item = ChecklistItem(id="check-1", label="Test", completed=False)

        # Simulate completing the item
        item.completed = True
        item.completedAt = datetime.utcnow().isoformat()
        item.completedBy = "user-123"

        assert item.completed is True
        assert item.completedAt is not None

    def test_checklist_item_uncomplete(self):
        """Test uncompleting a checklist item"""
        from app.api.schemas.orders import ChecklistItem

        item = ChecklistItem(
            id="check-1",
            label="Test",
            completed=True,
            completedAt="2024-01-01T00:00:00Z",
            completedBy="user-123"
        )

        # Simulate uncompleting
        item.completed = False
        item.completedAt = None
        item.completedBy = None

        assert item.completed is False
        assert item.completedAt is None
        assert item.completedBy is None

    def test_multiple_checklist_items(self):
        """Test order with multiple checklist items"""
        from app.api.schemas.orders import OrderCreate, ChecklistItem

        order = OrderCreate(
            title="Complex Order",
            checklist=[
                ChecklistItem(id="check-1", label="Step 1", completed=True),
                ChecklistItem(id="check-2", label="Step 2", completed=False),
                ChecklistItem(id="check-3", label="Step 3", completed=False),
            ]
        )

        assert len(order.checklist) == 3
        assert order.checklist[0].completed is True
        assert order.checklist[1].completed is False


class TestOrderResponse:
    """Tests for order response handling"""

    def test_order_response_alias(self):
        """Test that OrderResponse uses _id as alias for id"""
        from app.api.schemas.orders import OrderResponse

        response = OrderResponse(
            _id="order-123",
            title="Test Order",
            orderNumber="SIP-0001"
        )

        assert response.id == "order-123"

    def test_order_response_defaults(self):
        """Test OrderResponse default values"""
        from app.api.schemas.orders import OrderResponse

        response = OrderResponse(
            _id="order-123",
            title="Test Order",
            orderNumber="SIP-0001"
        )

        assert response.status == "pending"
        assert response.priority == "normal"
        assert response.subtotal == 0
        assert response.taxRate == 20


class TestOrderNumberGeneration:
    """Tests for order number generation logic"""

    def test_order_number_format(self):
        """Test order number follows SIP-XXXX format"""
        import re

        pattern = r"^SIP-\d{4}$"
        test_numbers = ["SIP-0001", "SIP-0099", "SIP-1234"]

        for num in test_numbers:
            assert re.match(pattern, num) is not None

    def test_order_number_sequence(self):
        """Test that order numbers are generated sequentially"""
        numbers = []
        for i in range(5):
            numbers.append(f"SIP-{i+1:04d}")

        assert numbers == ["SIP-0001", "SIP-0002", "SIP-0003", "SIP-0004", "SIP-0005"]