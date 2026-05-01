"""
AdVantage API v3 - Quotes Routes Tests
Tests for quote calculation functions and schemas.
"""
import pytest
from datetime import datetime


class TestQuoteCalculations:
    """Tests for quote total calculations"""

    def test_calculate_totals_with_items(self):
        """Test total calculation with multiple items"""
        from app.api.routes.quotes import calculate_totals

        items = [
            {"quantity": 2, "unitPrice": 100, "discount": 0},
            {"quantity": 1, "unitPrice": 50, "discount": 10},
        ]

        subtotal, tax_amount, total = calculate_totals(items, 20)

        # (2 * 100 - 0) + (1 * 50 - 10) = 200 + 40 = 240
        assert subtotal == 240
        # 240 * 0.2 = 48
        assert tax_amount == 48
        # 240 + 48 = 288
        assert total == 288

    def test_calculate_totals_with_zero_items(self):
        """Test total calculation with no items"""
        from app.api.routes.quotes import calculate_totals

        items = []
        subtotal, tax_amount, total = calculate_totals(items, 20)

        assert subtotal == 0
        assert tax_amount == 0
        assert total == 0

    def test_calculate_totals_with_discounts(self):
        """Test total calculation with various discounts"""
        from app.api.routes.quotes import calculate_totals

        items = [
            {"quantity": 5, "unitPrice": 100, "discount": 50},  # 5*100 - 50 = 450
            {"quantity": 2, "unitPrice": 200, "discount": 100},  # 2*200 - 100 = 300
        ]

        subtotal, tax_amount, total = calculate_totals(items, 18)

        assert subtotal == 750  # 450 + 300
        assert tax_amount == 135  # 750 * 0.18
        assert total == 885  # 750 + 135

    def test_calculate_totals_with_zero_tax_rate(self):
        """Test total calculation with 0% tax"""
        from app.api.routes.quotes import calculate_totals

        items = [{"quantity": 2, "unitPrice": 100, "discount": 0}]
        subtotal, tax_amount, total = calculate_totals(items, 0)

        assert subtotal == 200
        assert tax_amount == 0
        assert total == 200

    def test_calculate_totals_high_tax_rate(self):
        """Test total calculation with high tax rate"""
        from app.api.routes.quotes import calculate_totals

        items = [{"quantity": 1, "unitPrice": 1000, "discount": 0}]
        subtotal, tax_amount, total = calculate_totals(items, 50)

        assert subtotal == 1000
        assert tax_amount == 500
        assert total == 1500


class TestQuoteSchemas:
    """Tests for quote Pydantic schemas"""

    def test_quote_item_model(self):
        """Test QuoteItem schema"""
        from app.api.schemas.quotes import QuoteItem

        item = QuoteItem(
            description="Test Product",
            quantity=2,
            unit="adet",
            unitPrice=100,
            discount=0
        )

        assert item.description == "Test Product"
        assert item.quantity == 2
        assert item.unit == "adet"
        assert item.unitPrice == 100
        assert item.discount == 0
        # Total property: (2 * 100) - 0 = 200
        assert item.total == 200

    def test_quote_item_with_discount(self):
        """Test QuoteItem with discount"""
        from app.api.schemas.quotes import QuoteItem

        item = QuoteItem(
            description="Discounted Product",
            quantity=1,
            unit="adet",
            unitPrice=100,
            discount=20
        )

        assert item.total == 80  # (1 * 100) - 20

    def test_quote_create_schema(self):
        """Test QuoteCreate schema"""
        from app.api.schemas.quotes import QuoteCreate, QuoteItemInput

        quote = QuoteCreate(
            title="Test Quote",
            customerId="cust-123",
            items=[
                QuoteItemInput(description="Item 1", quantity=2, unitPrice=100)
            ],
            taxRate=20
        )

        assert quote.title == "Test Quote"
        assert quote.customerId == "cust-123"
        assert len(quote.items) == 1
        assert quote.taxRate == 20
        assert quote.status == "draft"

    def test_quote_approval_request_schema(self):
        """Test QuoteApprovalRequest schema"""
        from app.api.schemas.quotes import QuoteApprovalRequest

        request = QuoteApprovalRequest(action="reject", reason="Price too high")

        assert request.action == "reject"
        assert request.reason == "Price too high"

    def test_quote_update_schema(self):
        """Test QuoteUpdate schema"""
        from app.api.schemas.quotes import QuoteUpdate

        update = QuoteUpdate(
            title="Updated Title",
            status="approved"
        )

        assert update.title == "Updated Title"
        assert update.status == "approved"


class TestQuoteStatusTransitions:
    """Tests for quote status handling"""

    def test_valid_draft_status_values(self):
        """Test valid status values"""
        valid_statuses = ["draft", "pending", "approved", "rejected"]
        for status in valid_statuses:
            from app.api.schemas.quotes import QuoteCreate
            quote = QuoteCreate(title="Test", status=status)
            assert quote.status == status

    def test_quote_history_entry_creation(self):
        """Test quote history entry structure"""
        from app.api.schemas.quotes import QuoteHistoryEntry

        entry = QuoteHistoryEntry(
            timestamp=datetime.utcnow().isoformat(),
            action="created",
            userId="user-123",
            userName="Test User",
            changes={"title": "New Quote"}
        )

        assert entry.action == "created"
        assert entry.userId == "user-123"
        assert entry.changes is not None


class TestQuotePDFData:
    """Tests for quote PDF data schema"""

    def test_quote_pdf_data_schema(self):
        """Test QuotePDFData schema"""
        from app.api.schemas.quotes import QuotePDFData

        pdf_data = QuotePDFData(
            quoteNumber="TEK-0001",
            title="Test Quote",
            date="2024-01-15",
            validUntil="2024-02-15",
            customerName="Acme Corp",
            customerEmail="contact@acme.com",
            customerPhone="+905551234567",
            customerAddress="123 Main Street, Istanbul",
            items=[
                {
                    "description": "Item 1",
                    "quantity": 2,
                    "unit": "adet",
                    "unitPrice": 100,
                    "discount": 0,
                    "total": 200
                }
            ],
            subtotal=200,
            taxRate=20,
            taxAmount=40,
            total=240,
            currency="TRY",
            notes="Test notes"
        )

        assert pdf_data.quoteNumber == "TEK-0001"
        assert pdf_data.customerName == "Acme Corp"
        assert pdf_data.total == 240


class TestAddHistoryEntry:
    """Tests for history entry helper function"""

    def test_add_history_entry_new_history(self):
        """Test adding history to empty list"""
        from app.api.routes.quotes import add_history_entry

        quote_doc = {}
        user = {"_id": "user-123", "fullName": "Test User", "email": "test@test.com"}

        add_history_entry(quote_doc, "created", user, {"title": "New Quote"})

        assert "history" in quote_doc
        assert len(quote_doc["history"]) == 1
        assert quote_doc["history"][0]["action"] == "created"
        assert quote_doc["history"][0]["userId"] == "user-123"

    def test_add_history_entry_existing_history(self):
        """Test adding to existing history"""
        from app.api.routes.quotes import add_history_entry

        quote_doc = {
            "history": [
                {"action": "created", "userId": "user-123", "timestamp": "2024-01-01T00:00:00"}
            ]
        }
        user = {"_id": "user-456", "fullName": "Another User", "email": "another@test.com"}

        add_history_entry(quote_doc, "updated", user)

        assert len(quote_doc["history"]) == 2
        assert quote_doc["history"][1]["action"] == "updated"

    def test_add_history_entry_without_changes(self):
        """Test adding history entry without changes"""
        from app.api.routes.quotes import add_history_entry

        quote_doc = {}
        user = {"_id": "user-123", "fullName": "Test User"}

        add_history_entry(quote_doc, "deleted", user)

        assert quote_doc["history"][0]["changes"] is None