# API Reference

AdVantage ERP/CRM v3 API Reference - Detailed endpoint documentation with request/response examples.

## OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:
- JSON: `http://localhost:8000/openapi.json`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Authentication

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "newuser",
  "password": "secure-password",
  "fullName": "Full Name"
}
```

**Response (201):**
```json
{
  "_id": "user-id",
  "email": "user@example.com",
  "username": "newuser",
  "fullName": "Full Name",
  "roles": ["user"],
  "isActive": true,
  "createdAt": "2026-05-01T00:00:00.000Z"
}
```

---

### POST /api/auth/login

Authenticate and obtain a JWT access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "bearer"
}
```

---

### GET /api/auth/me

Get the currently authenticated user's profile.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "_id": "user-id",
  "email": "user@example.com",
  "username": "currentuser",
  "fullName": "Current User",
  "roles": ["user", "admin"],
  "isActive": true,
  "createdAt": "2026-01-15T10:30:00.000Z"
}
```

---

### GET /api/auth/users

List all registered users. Requires `USERS_READ` or `ADMIN_ALL` permission.

**Response (200):**
```json
[
  {
    "_id": "user-id-1",
    "email": "admin@example.com",
    "username": "admin",
    "fullName": "Admin User",
    "roles": ["admin", "user"],
    "isActive": true
  },
  {
    "_id": "user-id-2",
    "email": "user@example.com",
    "username": "user",
    "fullName": "Regular User",
    "roles": ["user"],
    "isActive": true
  }
]
```

---

### PUT /api/auth/users/{user_id}/roles

Update a user's roles. Requires `USERS_MANAGE_ROLES` or `ADMIN_ALL` permission.

**Path Parameters:**
- `user_id` (string) - The user's ID

**Request Body:**
```json
{
  "roles": ["user", "quotes_manage"]
}
```

**Response (200):**
```json
{
  "_id": "user-id",
  "email": "user@example.com",
  "username": "user",
  "fullName": "User",
  "roles": ["user", "quotes_manage"],
  "isActive": true
}
```

---

## Customers

### GET /api/customers

List customers with optional search, filtering, and pagination.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search by legalName, shortName, email, customerNumber |
| customerType | string | Filter by "customer" or "supplier" |
| page | int | Page number (default: 1) |
| pageSize | int | Items per page (default: 20, max: 100) |

**Response (200):**
```json
{
  "customers": [
    {
      "_id": "customer-id",
      "customerNumber": "MUS-0001",
      "legalName": "Acme Corporation",
      "shortName": "Acme",
      "email": "info@acme.com",
      "phone": "+90 555 123 4567",
      "customerType": "customer",
      "balance": 0,
      "isActive": true,
      "addresses": [],
      "contacts": [],
      "bankAccounts": []
    }
  ],
  "total": 1
}
```

---

### POST /api/customers

Create a new customer.

**Request Body:**
```json
{
  "legalName": "Acme Corporation",
  "shortName": "Acme",
  "email": "info@acme.com",
  "phone": "+90 555 123 4567",
  "customerType": "customer",
  "taxNumber": "1234567890",
  "addresses": [
    {
      "street": "Main Street 123",
      "city": "Istanbul",
      "district": "Kadikoy",
      "postalCode": "34000",
      "country": "Turkey"
    }
  ]
}
```

**Response (201):**
```json
{
  "_id": "customer-id",
  "customerNumber": "MUS-0001",
  "legalName": "Acme Corporation",
  "shortName": "Acme",
  "email": "info@acme.com",
  "phone": "+90 555 123 4567",
  "customerType": "customer",
  "taxNumber": "1234567890",
  "balance": 0,
  "isActive": true,
  "addresses": [...],
  "contacts": [],
  "bankAccounts": [],
  "createdAt": "2026-05-01T00:00:00.000Z",
  "updatedAt": "2026-05-01T00:00:00.000Z"
}
```

---

### GET /api/customers/{customer_id}

Get a single customer by ID.

**Response (200):**
```json
{
  "_id": "customer-id",
  "customerNumber": "MUS-0001",
  "legalName": "Acme Corporation",
  "shortName": "Acme",
  "email": "info@acme.com",
  "phone": "+90 555 123 4567",
  "customerType": "customer",
  "balance": 5000,
  "isActive": true,
  "addresses": [...],
  "contacts": [...],
  "bankAccounts": [...]
}
```

---

### PUT /api/customers/{customer_id}

Update a customer.

**Request Body:**
```json
{
  "legalName": "Acme Corporation Updated",
  "phone": "+90 555 987 6543"
}
```

---

### PATCH /api/customers/{customer_id}/balance

Update customer balance by adding/subtracting an amount.

**Request Body:**
```json
{
  "amount": 1000
}
```
Positive amount adds to balance, negative subtracts.

---

### DELETE /api/customers/{customer_id}

Soft delete a customer (sets `isDeleted: true`).

**Response (200):**
```json
{
  "message": "Customer deleted"
}
```

---

## Contacts Sub-resource

### POST /api/customers/{customer_id}/contacts

Add a contact person to a customer.

**Request Body:**
```json
{
  "name": "John Doe",
  "role": "Sales Manager",
  "email": "john@acme.com",
  "phone": "+90 555 111 2222",
  "isPrimary": true
}
```

---

### PUT /api/customers/{customer_id}/contacts/{contact_id}

Update a contact person.

---

### DELETE /api/customers/{customer_id}/contacts/{contact_id}

Delete a contact person.

---

## Addresses Sub-resource

### POST /api/customers/{customer_id}/addresses

Add an address to a customer.

**Request Body:**
```json
{
  "street": "Business Ave 456",
  "city": "Ankara",
  "district": "Cankaya",
  "postalCode": "06000",
  "country": "Turkey",
  "addressType": "billing"
}
```

---

### PUT /api/customers/{customer_id}/addresses/{address_id}

Update an address.

---

### DELETE /api/customers/{customer_id}/addresses/{address_id}

Delete an address.

---

## Bank Accounts Sub-resource

### POST /api/customers/{customer_id}/bank-accounts

Add a bank account to a customer.

**Request Body:**
```json
{
  "bankName": "Garanti Bank",
  "accountNumber": "TR123456789012345678901234",
  "iban": "TR123456789012345678901234",
  "currency": "TRY",
  "isPrimary": true
}
```

---

### PUT /api/customers/{customer_id}/bank-accounts/{bank_account_id}

Update a bank account.

---

### DELETE /api/customers/{customer_id}/bank-accounts/{bank_account_id}

Delete a bank account.

---

## Quotes

### GET /api/quotes

List all quotes sorted by creation date (newest first).

**Response (200):**
```json
[
  {
    "_id": "quote-id",
    "quoteNumber": "TEK-0001",
    "title": "Website Redesign",
    "customerId": "customer-id",
    "customerName": "Acme Corporation",
    "items": [...],
    "subtotal": 50000,
    "taxRate": 20,
    "taxAmount": 10000,
    "total": 60000,
    "currency": "TRY",
    "status": "draft",
    "validUntil": "2026-06-01",
    "createdAt": "2026-05-01T00:00:00.000Z"
  }
]
```

---

### POST /api/quotes

Create a new quote with auto-calculated totals.

**Request Body:**
```json
{
  "title": "Website Redesign Project",
  "customerId": "customer-id",
  "customerName": "Acme Corporation",
  "items": [
    {
      "description": "Web Design",
      "quantity": 1,
      "unit": "adet",
      "unitPrice": 50000,
      "discount": 0
    }
  ],
  "taxRate": 20,
  "currency": "TRY",
  "validUntil": "2026-06-01",
  "notes": "Includes mobile responsive design"
}
```

**Response (201):**
```json
{
  "_id": "quote-id",
  "quoteNumber": "TEK-0001",
  "title": "Website Redesign Project",
  "customerId": "customer-id",
  "customerName": "Acme Corporation",
  "items": [...],
  "subtotal": 50000,
  "taxRate": 20,
  "taxAmount": 10000,
  "total": 60000,
  "currency": "TRY",
  "status": "draft",
  "validUntil": "2026-06-01",
  "notes": "Includes mobile responsive design",
  "createdBy": "user-id",
  "createdAt": "2026-05-01T00:00:00.000Z",
  "history": [...]
}
```

---

### GET /api/quotes/{quote_id}

Get a quote by ID including all details.

---

### PUT /api/quotes/{quote_id}

Update a quote. If items or taxRate change, totals are automatically recalculated.

**Request Body:**
```json
{
  "items": [
    {
      "description": "Web Design Premium",
      "quantity": 2,
      "unit": "adet",
      "unitPrice": 60000,
      "discount": 5000
    }
  ],
  "taxRate": 20
}
```

---

### POST /api/quotes/{quote_id}/approve

Approve a quote (changes status from `draft` or `pending` to `approved`).

**Response (200):**
```json
{
  "_id": "quote-id",
  "status": "approved",
  "approvedBy": "user-id",
  "approvedAt": "2026-05-01T12:00:00.000Z",
  ...
}
```

---

### POST /api/quotes/{quote_id}/reject

Reject a quote with a reason.

**Request Body:**
```json
{
  "reason": "Budget constraints"
}
```

---

### POST /api/quotes/{quote_id}/copy

Create a copy of an existing quote as a new draft.

**Response (201):**
```json
{
  "_id": "new-quote-id",
  "quoteNumber": "TEK-0002",
  "title": "Website Redesign Project (Copy)",
  "status": "draft",
  ...
}
```

---

### POST /api/quotes/{quote_id}/convert-to-order

Convert an approved quote to an order.

**Response (200):**
```json
{
  "orderId": "order-id",
  "orderNumber": "SIP-0001"
}
```

---

### GET /api/quotes/{quote_id}/pdf

Get quote data formatted for PDF generation.

**Response (200):**
```json
{
  "quoteNumber": "TEK-0001",
  "title": "Website Redesign Project",
  "date": "2026-05-01",
  "validUntil": "2026-06-01",
  "customerName": "Acme Corporation",
  "customerEmail": "info@acme.com",
  "customerPhone": "+90 555 123 4567",
  "customerAddress": "Main Street 123, Kadikoy, Istanbul",
  "items": [
    {
      "description": "Web Design",
      "quantity": 1,
      "unit": "adet",
      "unitPrice": 50000,
      "discount": 0,
      "total": 50000
    }
  ],
  "subtotal": 50000,
  "taxRate": 20,
  "taxAmount": 10000,
  "total": 60000,
  "currency": "TRY",
  "notes": "Includes mobile responsive design"
}
```

---

### DELETE /api/quotes/{quote_id}

Soft delete a quote.

---

## Orders

### GET /api/orders

List all orders.

**Response (200):**
```json
[
  {
    "_id": "order-id",
    "orderNumber": "SIP-0001",
    "title": "Website Redesign",
    "customerId": "customer-id",
    "customerName": "Acme Corporation",
    "items": [...],
    "subtotal": 50000,
    "taxRate": 20,
    "taxAmount": 10000,
    "total": 60000,
    "currency": "TRY",
    "status": "pending",
    "priority": "high",
    "checklist": [...],
    "timeline": [...],
    "dueDate": "2026-06-15",
    "createdAt": "2026-05-01T00:00:00.000Z"
  }
]
```

---

### POST /api/orders

Create a new order.

**Request Body:**
```json
{
  "title": "Website Redesign",
  "customerId": "customer-id",
  "customerName": "Acme Corporation",
  "items": [
    {
      "description": "Web Development",
      "quantity": 1,
      "unit": "adet",
      "unitPrice": 75000
    }
  ],
  "taxRate": 20,
  "priority": "high",
  "dueDate": "2026-06-15",
  "notes": "Rush project"
}
```

---

### GET /api/orders/{order_id}

Get order details including checklist and timeline.

---

### PUT /api/orders/{order_id}

Update an order. Supports checklist item toggling with `completed` field.

**Request Body:**
```json
{
  "status": "processing",
  "checklist": [
    {
      "id": "checklist-item-id",
      "text": "Design approved",
      "completed": true
    }
  ]
}
```

---

### DELETE /api/orders/{order_id}

Soft delete an order.

---

## Discoveries

### GET /api/discoveries

List discoveries with optional filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (new, in_progress, completed) |
| customerId | string | Filter by customer ID |
| priority | string | Filter by priority (low, normal, high, urgent) |

---

### POST /api/discoveries

Create a new discovery.

**Request Body:**
```json
{
  "title": "New Printing Client",
  "customerId": "customer-id",
  "customerName": "Print Master",
  "priority": "high",
  "notes": "Interested in bulk business cards",
  "dueDate": "2026-05-15"
}
```

**Response (201):**
```json
{
  "_id": "discovery-id",
  "discoveryNumber": "KEŞ-0001",
  "title": "New Printing Client",
  "customerId": "customer-id",
  "customerName": "Print Master",
  "priority": "high",
  "status": "new",
  "timeline": [
    {
      "timestamp": "2026-05-01T00:00:00.000Z",
      "action": "created",
      "userId": "user-id",
      "userName": "System",
      "details": "Discovery created: New Printing Client"
    }
  ]
}
```

---

### PATCH /api/discoveries/{discovery_id}/stage

Update discovery status (for Kanban drag-and-drop).

**Request Body:**
```json
{
  "status": "in_progress"
}
```

Supports both Turkish (`yeni`, `devam-ediyor`, `tamamlandı`) and English (`new`, `in_progress`, `completed`) status values.

---

### POST /api/discoveries/{discovery_id}/convert-to-order

Convert a completed discovery to an order.

**Response (200):**
```json
{
  "message": "Discovery converted to order successfully",
  "orderId": "order-id",
  "orderNumber": "SIP-0002"
}
```

---

### GET /api/discoveries/customers/search

Search customers for linking to discoveries.

**Query Parameters:**
- `q` (string) - Search query

**Response (200):**
```json
[
  {
    "id": "customer-id",
    "customerNumber": "MUS-0001",
    "legalName": "Acme Corporation",
    "shortName": "Acme",
    "customerType": "customer"
  }
]
```

---

## Inventory

### Products

### GET /api/inventory/products

List all products in catalog.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| category | string | Filter by category |
| location | string | Filter by warehouse location |
| search | string | Search by name or SKU |

---

### POST /api/inventory/products

Create a new product.

**Request Body:**
```json
{
  "name": "A4 Bond Paper",
  "sku": "PAP-A4-001",
  "category": "Paper",
  "unit": "ream",
  "unitCost": 150,
  "unitPrice": 250,
  "currentStock": 500,
  "minStock": 100,
  "location": "Warehouse A"
}
```

---

### GET /api/inventory/products/{product_id}

Get a single product.

---

### PUT /api/inventory/products/{product_id}

Update a product.

**Request Body:**
```json
{
  "unitPrice": 275,
  "minStock": 150
}
```

---

### DELETE /api/inventory/products/{product_id}

Delete a product permanently.

---

### Stock Movements

### GET /api/inventory/movements

List stock movements with filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| productId | string | Filter by product |
| movementType | string | Filter by type (in, out, adjustment) |
| startDate | string | Filter start date (ISO format) |
| endDate | string | Filter end date (ISO format) |

---

### POST /api/inventory/movements

Record a stock movement (automatically updates product currentStock).

**Request Body:**
```json
{
  "productId": "product-id",
  "type": "in",
  "quantity": 100,
  "reference": "PO-2024-001",
  "notes": "Received from supplier"
}
```

For `type: "in"`, quantity is added to stock.
For `type: "out"` or `"adjustment"`, quantity is subtracted.

---

### Warehouses

### GET /api/inventory/warehouses

List all warehouses.

---

### POST /api/inventory/warehouses

Create a warehouse.

**Request Body:**
```json
{
  "name": "Main Warehouse",
  "code": "WH-001",
  "address": "Industrial Zone, Istanbul",
  "isActive": true
}
```

---

### Stock Takes

### GET /api/inventory/stocktakes

List all stocktakes.

---

### POST /api/inventory/stocktakes

Create a new stocktake (initializes with all products and zero counts).

**Request Body:**
```json
{
  "title": "May 2026 Stock Take",
  "date": "2026-05-01",
  "notes": "Monthly cycle count"
}
```

---

### PUT /api/inventory/stocktakes/{stock_take_id}

Submit counted quantities for items.

**Request Body:**
```json
{
  "items": [
    {
      "productId": "product-id",
      "countedQuantity": 485
    }
  ]
}
```

---

### POST /api/inventory/stocktakes/{stock_take_id}/complete

Complete stocktake and update inventory to match counted quantities.

---

### Alerts & Valuation

### GET /api/inventory/alerts

Get stock alerts for products below minimum stock level.

**Response (200):**
```json
[
  {
    "productId": "product-id",
    "productName": "A4 Bond Paper",
    "currentStock": 50,
    "minStock": 100,
    "alertLevel": "warning"
  }
]
```

Alert levels: `low`, `warning`, `critical`

---

### GET /api/inventory/valuation

Get total inventory valuation.

**Response (200):**
```json
{
  "_id": null,
  "totalValue": 2500000,
  "totalProducts": 150,
  "totalUnits": 10000
}
```

---

## Finance

### Accounts

### GET /api/finance/accounts

List all accounts.

---

### POST /api/finance/accounts

Create a new account.

**Request Body:**
```json
{
  "name": "Business Checking",
  "type": "bank",
  "balance": 0,
  "currency": "TRY",
  "description": "Main business account"
}
```

Valid `type` values: `cash`, `bank`, `credit_card`

---

### GET /api/finance/accounts/{account_id}

Get account details.

---

### PUT /api/finance/accounts/{account_id}

Update account.

---

### DELETE /api/finance/accounts/{account_id}

Delete account.

---

### Categories

### GET /api/finance/categories

List all transaction categories (system + custom).

**Response (200):**
```json
[
  {
    "_id": "category-id",
    "name": "Sales Revenue",
    "type": "income",
    "icon": "cash",
    "isSystem": true
  },
  {
    "_id": "category-id",
    "name": "Rent",
    "type": "expense",
    "icon": "home",
    "isSystem": true
  }
]
```

---

### POST /api/finance/categories

Create a custom category.

**Request Body:**
```json
{
  "name": "Consulting Income",
  "type": "income",
  "icon": "briefcase"
}
```

---

### DELETE /api/finance/categories/{category_id}

Delete a custom category (system categories cannot be deleted).

---

### Transactions

### GET /api/finance/transactions

List transactions with optional filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| accountId | string | Filter by account |
| type | string | Filter by type (income, expense) |
| category | string | Filter by category name |
| startDate | string | Filter start date |
| endDate | string | Filter end date |

---

### POST /api/finance/transactions

Create a transaction (automatically updates account balance).

**Request Body:**
```json
{
  "date": "2026-05-01",
  "description": "Website design service",
  "amount": 50000,
  "type": "income",
  "category": "Service Income",
  "accountId": "account-id",
  "reference": "INV-2024-001"
}
```

---

### GET /api/finance/transactions/{transaction_id}

Get transaction details.

---

### DELETE /api/finance/transactions/{transaction_id}

Delete transaction and reverse its effect on account balance.

---

### Recurring Transactions

### GET /api/finance/recurring

List all recurring transactions.

---

### POST /api/finance/recurring

Create a recurring transaction.

**Request Body:**
```json
{
  "description": "Monthly Rent",
  "amount": 25000,
  "type": "expense",
  "category": "Rent",
  "accountId": "account-id",
  "frequency": "monthly",
  "nextRun": "2026-06-01",
  "isActive": true
}
```

Valid `frequency` values: `daily`, `weekly`, `monthly`, `yearly`

---

### POST /api/finance/recurring/{recurring_id}/process

Process a recurring transaction now (creates actual transaction, advances next run date).

---

### Summary

### GET /api/finance/summary

Get financial summary for dashboard.

**Response (200):**
```json
{
  "totalCashBalance": 50000,
  "totalBankBalance": 250000,
  "totalCreditCardBalance": -10000,
  "totalBalance": 290000,
  "monthIncome": 150000,
  "monthExpense": 80000,
  "monthNet": 70000
}
```

---

## Personnel

### GET /api/personnel

List all active personnel.

---

### POST /api/personnel

Create a new personnel record.

**Request Body:**
```json
{
  "fullName": "Ahmet Yilmaz",
  "email": "ahmet@company.com",
  "phone": "+90 555 987 6543",
  "department": "Production",
  "position": "Graphic Designer",
  "startDate": "2024-01-15",
  "salary": 45000,
  "iban": "TR123456789012345678901234",
  "address": {
    "street": "Worker Street 123",
    "city": "Istanbul",
    "district": "Fatih"
  }
}
```

---

### GET /api/personnel/{personnel_id}

Get personnel details.

---

### PUT /api/personnel/{personnel_id}

Update personnel information.

---

### DELETE /api/personnel/{personnel_id}

Soft delete (deactivate) personnel.

---

### POST /api/personnel/{personnel_id}/overtime

Add overtime record.

**Request Body:**
```json
{
  "date": "2026-05-01",
  "hours": 3,
  "reason": "Urgent project delivery",
  "approvedBy": "manager-id"
}
```

---

### POST /api/personnel/{personnel_id}/leave

Add leave record.

**Request Body:**
```json
{
  "type": "annual",
  "startDate": "2026-06-01",
  "endDate": "2026-06-05",
  "reason": "Summer vacation",
  "approvedBy": "manager-id"
}
```

---

## Purchasing

### Suppliers

### GET /api/purchasing/suppliers

List suppliers with search and pagination.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search by name, email, supplierNumber |
| page | int | Page number |
| pageSize | int | Items per page |

---

### POST /api/purchasing/suppliers

Create a supplier.

**Request Body:**
```json
{
  "name": "Paper Supplies Inc",
  "email": "sales@papersupplies.com",
  "phone": "+90 212 555 1234",
  "taxNumber": "9876543210",
  "addresses": [...],
  "contacts": [...]
}
```

---

### Purchase Orders

### GET /api/purchasing/purchase-orders

List purchase orders.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search by PO number |
| status | string | Filter by status |
| supplierId | string | Filter by supplier |

---

### POST /api/purchasing/purchase-orders

Create a purchase order.

**Request Body:**
```json
{
  "supplierId": "supplier-id",
  "supplierName": "Paper Supplies Inc",
  "items": [
    {
      "productId": "product-id",
      "description": "A4 Bond Paper",
      "quantity": 100,
      "unit": "ream",
      "unitPrice": 150,
      "total": 15000
    }
  ],
  "taxRate": 18,
  "paymentTerms": "Net 30"
}
```

---

### POST /api/purchasing/purchase-orders/{po_id}/receive

Receive items against a purchase order.

**Request Body:**
```json
{
  "items": [
    {
      "itemId": "poitem-id",
      "receivedQuantity": 50
    }
  ]
}
```

Updates PO status to `partial` or `received` based on quantities.

---

### Supplier Quotes

### GET /api/purchasing/supplier-quotes

List supplier quotes.

---

### POST /api/purchasing/supplier-quotes

Create a supplier quote.

**Request Body:**
```json
{
  "supplierId": "supplier-id",
  "supplierName": "Paper Supplies Inc",
  "productId": "product-id",
  "productName": "A4 Bond Paper",
  "unitPrice": 145,
  "minQuantity": 100,
  "leadTimeDays": 7,
  "validUntil": "2026-06-01"
}
```

---

### GET /api/purchasing/supplier-quotes/compare/{product_id}

Compare all quotes for a product to find the best price.

**Response (200):**
```json
{
  "items": [
    {
      "productId": "product-id",
      "productName": "A4 Bond Paper",
      "quantity": 100,
      "quotes": [
        {
          "quoteId": "quote-id-1",
          "supplierId": "supplier-id-1",
          "supplierName": "Paper Supplies Inc",
          "unitPrice": 145,
          "total": 14500,
          "leadTimeDays": 7
        },
        {
          "quoteId": "quote-id-2",
          "supplierId": "supplier-id-2",
          "supplierName": "Office Plus",
          "unitPrice": 150,
          "total": 15000,
          "leadTimeDays": 5
        }
      ]
    }
  ],
  "bestQuotes": [
    {
      "productId": "product-id",
      "quoteId": "quote-id-1",
      "supplierId": "supplier-id-1",
      "unitPrice": 145
    }
  ]
}
```

---

### POST /api/purchasing/supplier-quotes/{quote_id}/convert-to-po

Convert an accepted supplier quote to a purchase order.

---

## Production

### BOM (Bill of Materials)

### GET /api/production/bom

List all active BOMs.

---

### POST /api/production/bom

Create a BOM.

**Request Body:**
```json
{
  "name": "Business Card Set",
  "productType": "Printed Material",
  "items": [
    {
      "productId": "paper-id",
      "productName": "A4 Cardstock",
      "quantity": 100,
      "unit": "sheet",
      "unitCost": 0.50
    },
    {
      "productId": "ink-id",
      "productName": "CMYK Ink",
      "quantity": 0.1,
      "unit": "ml",
      "unitCost": 5.00
    }
  ],
  "laborHours": 0.5,
  "overheadRate": 10
}
```

**Response (201):**
```json
{
  "_id": "bom-id",
  "name": "Business Card Set",
  "productType": "Printed Material",
  "items": [...],
  "totalCost": 55.00,
  "version": 1,
  "isActive": true
}
```

---

### PUT /api/production/bom/{bom_id}

Update a BOM (increments version, recalculates totalCost).

---

### Production Orders

### GET /api/production/orders

List all production orders.

---

### POST /api/production/orders

Create a production order.

**Request Body:**
```json
{
  "bomId": "bom-id",
  "quantity": 500,
  "dueDate": "2026-05-15",
  "priority": "normal"
}
```

---

### Projects

### GET /api/production/projects

List all projects.

---

### POST /api/production/projects

Create a project.

**Request Body:**
```json
{
  "name": "Website Redesign",
  "client": "Acme Corp",
  "description": "Complete website overhaul",
  "startDate": "2026-05-01",
  "dueDate": "2026-06-01",
  "status": "active"
}
```

---

### GET /api/production/projects/{project_id}

Get project with tasks.

**Response (200):**
```json
{
  "_id": "project-id",
  "name": "Website Redesign",
  "client": "Acme Corp",
  "status": "active",
  "progress": 45.0,
  "tasks": [
    {
      "id": "task-id",
      "title": "Design Mockups",
      "assignedTo": "user-id",
      "stage": "done",
      "dueDate": "2026-05-10"
    },
    {
      "id": "task-id-2",
      "title": "Development",
      "assignedTo": "user-id",
      "stage": "todo",
      "dueDate": "2026-05-20"
    }
  ],
  "createdAt": "2026-05-01T00:00:00.000Z"
}
```

Project task stages: `todo`, `in_progress`, `done`

---

### POST /api/production/projects/{project_id}/tasks

Add a task to a project.

**Request Body:**
```json
{
  "title": "Design Mockups",
  "assignedTo": "designer-user-id",
  "stage": "todo",
  "dueDate": "2026-05-10",
  "priority": "high"
}
```

---

### PUT /api/production/projects/{project_id}/tasks/{task_id}

Update a task (including stage changes for Kanban).

**Request Body:**
```json
{
  "stage": "done",
  "completedAt": "2026-05-10T15:00:00.000Z"
}
```

---

### DELETE /api/production/projects/{project_id}/tasks/{task_id}

Delete a task from a project.

---

## Common Response Formats

### Success (Single Item)
```json
{
  "_id": "resource-id",
  "field1": "value1",
  "field2": "value2",
  "createdAt": "2026-05-01T00:00:00.000Z",
  "updatedAt": "2026-05-01T00:00:00.000Z"
}
```

### Success (List)
```json
[
  { "_id": "id1", ... },
  { "_id": "id2", ... }
]
```

### Error
```json
{
  "detail": "Error message describing what went wrong"
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource does not exist |
| 500 | Internal Server Error - Server-side error |
