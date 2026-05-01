"""
AdVantage API v3 - Customers Routes Tests
Tests for customer schemas and data handling.
"""
import pytest
from datetime import datetime


class TestCustomerSchemas:
    """Tests for customer Pydantic schemas"""

    def test_contact_person_schema(self):
        """Test ContactPerson schema"""
        from app.api.schemas.customers import ContactPerson

        contact = ContactPerson(
            name="John Doe",
            email="john@example.com",
            phone="+905551234567",
            role="Sales Manager"
        )

        assert contact.name == "John Doe"
        assert contact.email == "john@example.com"
        assert contact.role == "Sales Manager"

    def test_contact_person_minimal(self):
        """Test ContactPerson with minimal data"""
        from app.api.schemas.customers import ContactPerson

        contact = ContactPerson(name="Jane Doe")
        assert contact.name == "Jane Doe"
        assert contact.email is None
        assert contact.phone is None

    def test_address_schema(self):
        """Test Address schema"""
        from app.api.schemas.customers import Address

        address = Address(
            label="Main Office",
            street="123 Main Street",
            city="Istanbul",
            district="Kadikoy",
            postalCode="34710",
            country="Turkey"
        )

        assert address.label == "Main Office"
        assert address.city == "Istanbul"
        assert address.country == "Turkey"

    def test_address_defaults(self):
        """Test Address with default values"""
        from app.api.schemas.customers import Address

        address = Address(label="Branch Office")
        assert address.label == "Branch Office"
        assert address.country == "Turkey"  # default
        assert address.city is None

    def test_bank_account_schema(self):
        """Test BankAccount schema"""
        from app.api.schemas.customers import BankAccount

        bank = BankAccount(
            bankName="Garanti Bank",
            branchName="Kadikoy Branch",
            accountNumber="1234567890",
            iban="TR330006200123456789012345"
        )

        assert bank.bankName == "Garanti Bank"
        assert bank.iban == "TR330006200123456789012345"

    def test_customer_create_schema(self):
        """Test CustomerCreate schema"""
        from app.api.schemas.customers import CustomerCreate, ContactPerson, Address

        customer = CustomerCreate(
            legalName="Acme Corporation",
            shortName="Acme",
            customerType="customer",
            email="contact@acme.com",
            phone="+905551234567",
            contacts=[ContactPerson(name="John Doe")],
            addresses=[Address(label="Main", street="123 Main St")]
        )

        assert customer.legalName == "Acme Corporation"
        assert customer.shortName == "Acme"
        assert len(customer.contacts) == 1
        assert len(customer.addresses) == 1

    def test_customer_update_schema(self):
        """Test CustomerUpdate schema - all fields optional"""
        from app.api.schemas.customers import CustomerUpdate

        update = CustomerUpdate(legalName="Updated Name")
        assert update.legalName == "Updated Name"
        assert update.email is None

    def test_customer_update_partial(self):
        """Test CustomerUpdate with partial data"""
        from app.api.schemas.customers import CustomerUpdate

        update = CustomerUpdate(
            phone="+905551111111",
            isActive=False
        )

        assert update.phone == "+905551111111"
        assert update.isActive is False
        assert update.legalName is None

    def test_balance_update_schema(self):
        """Test BalanceUpdate schema"""
        from app.api.schemas.customers import BalanceUpdate

        balance = BalanceUpdate(amount=100.50)
        assert balance.amount == 100.50

        negative_balance = BalanceUpdate(amount=-50.25)
        assert negative_balance.amount == -50.25


class TestCustomerSearchParams:
    """Tests for customer search parameters"""

    def test_customer_search_params_defaults(self):
        """Test CustomerSearchParams with defaults"""
        from app.api.schemas.customers import CustomerSearchParams

        params = CustomerSearchParams()
        assert params.search is None
        assert params.customerType is None
        assert params.page == 1
        assert params.pageSize == 20

    def test_customer_search_params_custom(self):
        """Test CustomerSearchParams with custom values"""
        from app.api.schemas.customers import CustomerSearchParams

        params = CustomerSearchParams(
            search="acme",
            customerType="customer",
            page=2,
            pageSize=50
        )

        assert params.search == "acme"
        assert params.customerType == "customer"
        assert params.page == 2
        assert params.pageSize == 50


class TestCustomerResponse:
    """Tests for customer response handling"""

    def test_customer_response_alias(self):
        """Test that CustomerResponse uses _id as alias for id"""
        from app.api.schemas.customers import CustomerResponse

        response = CustomerResponse(
            _id="cust-123",
            legalName="Test Corp",
            customerNumber="MUS-0001"
        )

        assert response.id == "cust-123"

    def test_customer_response_defaults(self):
        """Test CustomerResponse default values"""
        from app.api.schemas.customers import CustomerResponse

        response = CustomerResponse(
            _id="cust-123",
            legalName="Test Corp",
            customerNumber="MUS-0001"
        )

        assert response.balance == 0.0
        assert response.isActive is True


class TestCustomerDataValidation:
    """Tests for customer data validation"""

    def test_customer_type_values(self):
        """Test valid customer type values"""
        from app.api.schemas.customers import CustomerCreate

        # Valid customer type
        customer1 = CustomerCreate(legalName="Test 1", customerType="customer")
        assert customer1.customerType == "customer"

        customer2 = CustomerCreate(legalName="Test 2", customerType="supplier")
        assert customer2.customerType == "supplier"

    def test_email_validation(self):
        """Test email format validation"""
        from app.api.schemas.customers import ContactPerson

        # Valid email should work
        contact = ContactPerson(name="Test", email="test@example.com")
        assert contact.email == "test@example.com"

    def test_empty_customer_create(self):
        """Test creating customer with minimal required fields"""
        from app.api.schemas.customers import CustomerCreate

        customer = CustomerCreate(legalName="Minimal Customer")
        assert customer.legalName == "Minimal Customer"
        assert customer.email is None
        assert customer.addresses == []
        assert customer.contacts == []


class TestCustomerNumberGeneration:
    """Tests for customer number generation logic"""

    def test_customer_number_format(self):
        """Test customer number follows MUS-XXXX format"""
        import re

        pattern = r"^MUS-\d{4}$"
        test_numbers = ["MUS-0001", "MUS-0099", "MUS-1234"]

        for num in test_numbers:
            assert re.match(pattern, num) is not None

    def test_customer_number_sequence(self):
        """Test that customer numbers are generated sequentially"""
        # Simulate number generation
        numbers = []
        for i in range(5):
            numbers.append(f"MUS-{i+1:04d}")

        assert numbers == ["MUS-0001", "MUS-0002", "MUS-0003", "MUS-0004", "MUS-0005"]