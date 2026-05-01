# AdVantage ERP/CRM v3 - Documentation

Welcome to the AdVantage ERP/CRM documentation. AdVantage is a comprehensive business management system designed for advertising agencies, sign manufacturers, and printing businesses.

## Quick Links

- [Quick Start Guide](#quick-start-guide)
- [Module Documentation](#module-documentation)
- [API Reference](./API_REFERENCE.md)
- [Deployment Guide](./DEPLOYMENT.md)

---

## Quick Start Guide

### Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.10+ (for backend)
- **MongoDB** 4.4+ (local or cloud instance)
- **npm** or **pnpm** (package manager)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/your-org/advantage-v2.git
cd advantage-v2
```

#### 2. Backend Setup

```bash
cd apps/api
pip install -r requirements.txt
```

#### 3. Frontend Setup

```bash
cd apps/web
npm install
```

#### 4. Environment Configuration

Create a `.env` file in `apps/api/` with the following variables:

```env
# MongoDB Connection
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=advantage_v3

# JWT Configuration
JWT_SECRET_KEY=your-secret-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60

# Application
APP_NAME=AdVantage API
DEBUG=true
```

#### 5. Run the Application

**Backend:**
```bash
cd apps/api
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd apps/web
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Module Documentation

### Authentication (Auth)

The Auth module handles user authentication and authorization using JWT tokens with role-based access control (RBAC).

#### Features
- User registration and login
- JWT token generation and validation
- Role-based permission checking
- User role management (admin only)

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and obtain JWT token |
| GET | `/api/auth/me` | Get current user profile |
| GET | `/api/auth/users` | List all users (admin) |
| PUT | `/api/auth/users/{user_id}/roles` | Update user roles (admin) |

#### Permissions

- `USERS_READ` - View user list
- `USERS_MANAGE_ROLES` - Manage user roles
- `ADMIN_ALL` - Full admin access

#### Example: Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "bearer"
}
```

#### Example: Register

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "username": "newuser",
    "password": "secure-password",
    "fullName": "New User"
  }'
```

---

### Customers

The Customers module manages customer and supplier records with full CRUD operations, addresses, contacts, and bank accounts.

#### Features
- Customer/Supplier management
- Contact person management
- Address management
- Bank account storage
- Balance tracking
- Customer number auto-generation (MUS-0001)

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List customers with search/filter |
| POST | `/api/customers` | Create a new customer |
| GET | `/api/customers/{customer_id}` | Get customer by ID |
| PUT | `/api/customers/{customer_id}` | Update customer |
| PATCH | `/api/customers/{customer_id}/balance` | Update balance |
| DELETE | `/api/customers/{customer_id}` | Delete customer (soft) |
| POST | `/api/customers/{customer_id}/contacts` | Add contact |
| PUT | `/api/customers/{customer_id}/contacts/{contact_id}` | Update contact |
| DELETE | `/api/customers/{customer_id}/contacts/{contact_id}` | Delete contact |
| POST | `/api/customers/{customer_id}/addresses` | Add address |
| PUT | `/api/customers/{customer_id}/addresses/{address_id}` | Update address |
| DELETE | `/api/customers/{customer_id}/addresses/{address_id}` | Delete address |
| POST | `/api/customers/{customer_id}/bank-accounts` | Add bank account |
| PUT | `/api/customers/{customer_id}/bank-accounts/{bank_account_id}` | Update bank account |
| DELETE | `/api/customers/{customer_id}/bank-accounts/{bank_account_id}` | Delete bank account |

#### Query Parameters for List

- `search` (string) - Search by name, email, or customer number
- `customerType` (string) - Filter by "customer" or "supplier"
- `page` (int) - Page number (default: 1)
- `pageSize` (int) - Items per page (default: 20, max: 100)

#### Example: Create Customer

```bash
curl -X POST http://localhost:8000/api/customers \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "legalName": "Acme Corporation",
    "shortName": "Acme",
    "email": "info@acme.com",
    "phone": "+90 555 123 4567",
    "customerType": "customer",
    "taxNumber": "1234567890",
    "addresses": [{
      "street": "Main Street 123",
      "city": "Istanbul",
      "district": "Kadikoy",
      "postalCode": "34000",
      "country": "Turkey"
    }]
  }'
```

#### Example: List Customers

```bash
curl -X GET "http://localhost:8000/api/customers?search=acme&customerType=customer&page=1&pageSize=20" \
  -H "Authorization: Bearer {token}"
```

---

### Quotes

The Quotes module handles quote creation, approval workflow, and conversion to orders.

#### Features
- Quote creation with auto-calculated totals
- Quote approval/rejection workflow
- Quote copying
- Conversion to orders
- PDF data generation
- Quote history tracking
- Auto-generated quote numbers (TEK-0001)

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quotes` | List all quotes |
| POST | `/api/quotes` | Create a new quote |
| GET | `/api/quotes/{quote_id}` | Get quote by ID |
| PUT | `/api/quotes/{quote_id}` | Update quote |
| POST | `/api/quotes/{quote_id}/approve` | Approve quote |
| POST | `/api/quotes/{quote_id}/reject` | Reject quote |
| POST | `/api/quotes/{quote_id}/copy` | Copy quote |
| POST | `/api/quotes/{quote_id}/convert-to-order` | Convert to order |
| GET | `/api/quotes/{quote_id}/pdf` | Get PDF data |
| DELETE | `/api/quotes/{quote_id}` | Delete quote (soft) |

#### Quote Statuses
- `draft` - Initial state
- `pending` - Awaiting approval
- `approved` - Ready to convert to order
- `rejected` - Not approved

#### Example: Create Quote

```bash
curl -X POST http://localhost:8000/api/quotes \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Website Redesign Project",
    "customerId": "customer-id-here",
    "customerName": "Acme Corporation",
    "items": [{
      "description": "Web Design",
      "quantity": 1,
      "unit": "adet",
      "unitPrice": 50000,
      "discount": 0
    }],
    "taxRate": 20,
    "currency": "TRY",
    "validUntil": "2026-06-01"
  }'
```

#### Example: Approve and Convert to Order

```bash
# Approve quote
curl -X POST http://localhost:8000/api/quotes/{quote_id}/approve \
  -H "Authorization: Bearer {token}"

# Convert to order
curl -X POST http://localhost:8000/api/quotes/{quote_id}/convert-to-order \
  -H "Authorization: Bearer {token}"
```

---

### Orders

The Orders module manages sales orders with checklist tracking and timeline history.

#### Features
- Order creation with auto-calculated totals
- Status workflow management
- Priority levels (low, normal, high, urgent)
- Checklist tracking
- Timeline history
- Order number auto-generation (SIP-0001)
- Conversion from quotes and discoveries

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List all orders |
| POST | `/api/orders` | Create a new order |
| GET | `/api/orders/{order_id}` | Get order by ID |
| PUT | `/api/orders/{order_id}` | Update order |
| DELETE | `/api/orders/{order_id}` | Delete order (soft) |

#### Order Statuses
- `pending` - Awaiting processing
- `processing` - In progress
- `shipped` - Shipped to customer
- `delivered` - Delivered
- `cancelled` - Cancelled

#### Example: Create Order

```bash
curl -X POST http://localhost:8000/api/orders \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Website Redesign",
    "customerId": "customer-id",
    "customerName": "Acme Corporation",
    "items": [{
      "description": "Web Development",
      "quantity": 1,
      "unit": "adet",
      "unitPrice": 75000
    }],
    "taxRate": 20,
    "priority": "high",
    "dueDate": "2026-06-15"
  }'
```

---

### Discoveries

The Discoveries module implements a Kanban-style tracking system for lead discovery and conversion.

#### Features
- Discovery/lead tracking
- Kanban status columns (new, in_progress, completed)
- Customer linking
- Conversion to orders
- Discovery number auto-generation (KEŞ-0001)
- Timeline tracking

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/discoveries` | List discoveries |
| POST | `/api/discoveries` | Create discovery |
| GET | `/api/discoveries/{discovery_id}` | Get discovery |
| PUT | `/api/discoveries/{discovery_id}` | Update discovery |
| PATCH | `/api/discoveries/{discovery_id}/stage` | Update stage (Kanban) |
| POST | `/api/discoveries/{discovery_id}/convert-to-order` | Convert to order |
| DELETE | `/api/discoveries/{discovery_id}` | Delete discovery |
| GET | `/api/discoveries/customers/search` | Search customers |

#### Discovery Statuses
- `new` - New discovery
- `in_progress` - Being worked on
- `completed` - Successfully completed

#### Example: Create Discovery

```bash
curl -X POST http://localhost:8000/api/discoveries \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Printing Client",
    "customerId": "customer-id",
    "customerName": "Print Master",
    "priority": "high",
    "notes": "Interested in bulk business cards"
  }'
```

---

### Inventory

The Inventory module manages products, stock movements, warehouses, and stock takes.

#### Features
- Product catalog management
- Stock movement tracking (in/out/adjustment)
- Warehouse management
- Stock take/cycle counting
- Low stock alerts
- Inventory valuation
- SKU-based product tracking

#### Sub-Modules

##### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory/products` | List products |
| POST | `/api/inventory/products` | Create product |
| GET | `/api/inventory/products/{product_id}` | Get product |
| PUT | `/api/inventory/products/{product_id}` | Update product |
| DELETE | `/api/inventory/products/{product_id}` | Delete product |

##### Stock Movements

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory/movements` | List movements |
| POST | `/api/inventory/movements` | Record movement |
| GET | `/api/inventory/movements/{movement_id}` | Get movement |

##### Warehouses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory/warehouses` | List warehouses |
| POST | `/api/inventory/warehouses` | Create warehouse |
| PUT | `/api/inventory/warehouses/{warehouse_id}` | Update warehouse |

##### Stock Takes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory/stocktakes` | List stocktakes |
| POST | `/api/inventory/stocktakes` | Create stocktake |
| GET | `/api/inventory/stocktakes/{stock_take_id}` | Get stocktake |
| PUT | `/api/inventory/stocktakes/{stock_take_id}` | Update counts |
| POST | `/api/inventory/stocktakes/{stock_take_id}/complete` | Complete and update inventory |

##### Alerts & Valuation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory/alerts` | Get low stock alerts |
| GET | `/api/inventory/valuation` | Get inventory valuation |

#### Example: Create Product

```bash
curl -X POST http://localhost:8000/api/inventory/products \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "A4 Bond Paper",
    "sku": "PAP-A4-001",
    "category": "Paper",
    "unit": "ream",
    "unitCost": 150,
    "unitPrice": 250,
    "currentStock": 500,
    "minStock": 100,
    "location": "Warehouse A"
  }'
```

#### Example: Record Stock Movement

```bash
curl -X POST http://localhost:8000/api/inventory/movements \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-id",
    "type": "in",
    "quantity": 100,
    "reference": "PO-2024-001",
    "notes": "Received from supplier"
  }'
```

---

### Finance

The Finance module handles accounts, transactions, categories, and recurring transactions.

#### Features
- Multi-account management (cash, bank, credit card)
- Income/expense tracking
- Transaction categories (system and custom)
- Recurring transactions (daily, weekly, monthly, yearly)
- Financial summary for dashboards
- Automatic balance updates

#### Sub-Modules

##### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/finance/accounts` | List accounts |
| POST | `/api/finance/accounts` | Create account |
| GET | `/api/finance/accounts/{account_id}` | Get account |
| PUT | `/api/finance/accounts/{account_id}` | Update account |
| DELETE | `/api/finance/accounts/{account_id}` | Delete account |

##### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/finance/categories` | List categories |
| POST | `/api/finance/categories` | Create category |
| DELETE | `/api/finance/categories/{category_id}` | Delete category |

##### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/finance/transactions` | List transactions |
| POST | `/api/finance/transactions` | Create transaction |
| GET | `/api/finance/transactions/{transaction_id}` | Get transaction |
| DELETE | `/api/finance/transactions/{transaction_id}` | Delete transaction |

##### Recurring Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/finance/recurring` | List recurring |
| POST | `/api/finance/recurring` | Create recurring |
| PUT | `/api/finance/recurring/{recurring_id}` | Update recurring |
| DELETE | `/api/finance/recurring/{recurring_id}` | Delete recurring |
| POST | `/api/finance/recurring/{recurring_id}/process` | Process now |

##### Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/finance/summary` | Get financial summary |

#### Example: Create Account

```bash
curl -X POST http://localhost:8000/api/finance/accounts \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Business Checking",
    "type": "bank",
    "balance": 0,
    "currency": "TRY",
    "description": "Main business account"
  }'
```

#### Example: Create Transaction

```bash
curl -X POST http://localhost:8000/api/finance/transactions \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-05-01",
    "description": "Website design service",
    "amount": 50000,
    "type": "income",
    "category": "Service Income",
    "accountId": "account-id",
    "reference": "INV-2024-001"
  }'
```

---

### Personnel

The Personnel module manages employee records, overtime, and leave tracking.

#### Features
- Personnel records management
- Personnel number auto-generation (PER-0001)
- Overtime tracking
- Leave management
- Active/inactive status

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/personnel` | List all personnel |
| POST | `/api/personnel` | Create personnel |
| GET | `/api/personnel/{personnel_id}` | Get personnel |
| PUT | `/api/personnel/{personnel_id}` | Update personnel |
| DELETE | `/api/personnel/{personnel_id}` | Deactivate personnel |
| POST | `/api/personnel/{personnel_id}/overtime` | Add overtime |
| POST | `/api/personnel/{personnel_id}/leave` | Add leave |

#### Example: Create Personnel

```bash
curl -X POST http://localhost:8000/api/personnel \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Ahmet Yilmaz",
    "email": "ahmet@company.com",
    "phone": "+90 555 987 6543",
    "department": "Production",
    "position": "Graphic Designer",
    "startDate": "2024-01-15",
    "salary": 45000
  }'
```

---

### Purchasing

The Purchasing module manages suppliers, purchase orders, and supplier quotes with comparison functionality.

#### Features
- Supplier management
- Purchase order creation and tracking
- Supplier quote management
- Quote comparison for products
- PO receiving/partial delivery
- Auto-generated numbers (SUP-, PO-, SQ-)

#### Sub-Modules

##### Suppliers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/purchasing/suppliers` | List suppliers |
| POST | `/api/purchasing/suppliers` | Create supplier |
| GET | `/api/purchasing/suppliers/{supplier_id}` | Get supplier |
| PUT | `/api/purchasing/suppliers/{supplier_id}` | Update supplier |
| DELETE | `/api/purchasing/suppliers/{supplier_id}` | Delete supplier |
| POST | `/api/purchasing/suppliers/{supplier_id}/contacts` | Add contact |
| DELETE | `/api/purchasing/suppliers/{supplier_id}/contacts/{contact_id}` | Delete contact |

##### Purchase Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/purchasing/purchase-orders` | List POs |
| POST | `/api/purchasing/purchase-orders` | Create PO |
| GET | `/api/purchasing/purchase-orders/{po_id}` | Get PO |
| PUT | `/api/purchasing/purchase-orders/{po_id}` | Update PO |
| PATCH | `/api/purchasing/purchase-orders/{po_id}/status` | Update status |
| POST | `/api/purchasing/purchase-orders/{po_id}/receive` | Receive items |
| DELETE | `/api/purchasing/purchase-orders/{po_id}` | Delete PO |

##### Supplier Quotes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/purchasing/supplier-quotes` | List quotes |
| POST | `/api/purchasing/supplier-quotes` | Create quote |
| GET | `/api/purchasing/supplier-quotes/{quote_id}` | Get quote |
| PUT | `/api/purchasing/supplier-quotes/{quote_id}` | Update quote |
| PATCH | `/api/purchasing/supplier-quotes/{quote_id}/status` | Update status |
| DELETE | `/api/purchasing/supplier-quotes/{quote_id}` | Delete quote |
| GET | `/api/purchasing/supplier-quotes/compare/{product_id}` | Compare quotes |
| POST | `/api/purchasing/supplier-quotes/{quote_id}/convert-to-po` | Convert to PO |

#### Purchase Order Statuses
- `draft` - Not sent
- `sent` - Sent to supplier
- `partial` - Partially received
- `received` - Fully received
- `cancelled` - Cancelled

#### Example: Create Supplier

```bash
curl -X POST http://localhost:8000/api/purchasing/suppliers \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Paper Supplies Inc",
    "email": "sales@papersupplies.com",
    "phone": "+90 212 555 1234",
    "taxNumber": "9876543210"
  }'
```

#### Example: Create Purchase Order

```bash
curl -X POST http://localhost:8000/api/purchasing/purchase-orders \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "supplierId": "supplier-id",
    "supplierName": "Paper Supplies Inc",
    "items": [{
      "productId": "product-id",
      "description": "A4 Bond Paper",
      "quantity": 100,
      "unit": "ream",
      "unitPrice": 150,
      "total": 15000
    }],
    "taxRate": 18,
    "paymentTerms": "Net 30"
  }'
```

---

### Production

The Production module handles Bill of Materials (BOM), production orders, and project Kanban tracking.

#### Features
- Bill of Materials (BOM) management
- Production order tracking
- Project Kanban with tasks
- Automatic cost calculation
- Progress tracking

#### Sub-Modules

##### BOM (Bill of Materials)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/production/bom` | List BOMs |
| POST | `/api/production/bom` | Create BOM |
| GET | `/api/production/bom/{bom_id}` | Get BOM |
| PUT | `/api/production/bom/{bom_id}` | Update BOM |
| DELETE | `/api/production/bom/{bom_id}` | Delete BOM |

##### Production Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/production/orders` | List orders |
| POST | `/api/production/orders` | Create order |
| GET | `/api/production/orders/{order_id}` | Get order |
| PUT | `/api/production/orders/{order_id}` | Update order |
| DELETE | `/api/production/orders/{order_id}` | Delete order |

##### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/production/projects` | List projects |
| POST | `/api/production/projects` | Create project |
| GET | `/api/production/projects/{project_id}` | Get project |
| PUT | `/api/production/projects/{project_id}` | Update project |
| DELETE | `/api/production/projects/{project_id}` | Delete project |
| POST | `/api/production/projects/{project_id}/tasks` | Add task |
| PUT | `/api/production/projects/{project_id}/tasks/{task_id}` | Update task |
| DELETE | `/api/production/projects/{project_id}/tasks/{task_id}` | Delete task |

#### Example: Create BOM

```bash
curl -X POST http://localhost:8000/api/production/bom \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Business Card Set",
    "productType": "Printed Material",
    "items": [{
      "productId": "paper-product-id",
      "productName": "A4 Cardstock",
      "quantity": 100,
      "unit": "sheet",
      "unitCost": 0.50
    }, {
      "productId": "ink-product-id",
      "productName": "CMYK Ink",
      "quantity": 0.1,
      "unit": "ml",
      "unitCost": 5.00
    }],
    "laborHours": 0.5,
    "overheadRate": 10
  }'
```

#### Example: Create Project

```bash
curl -X POST http://localhost:8000/api/production/projects \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Website Redesign",
    "client": "Acme Corp",
    "startDate": "2026-05-01",
    "dueDate": "2026-06-01",
    "status": "active"
  }'
```

#### Example: Add Project Task

```bash
curl -X POST http://localhost:8000/api/production/projects/{project_id}/tasks \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design Mockups",
    "assignedTo": "designer-id",
    "stage": "todo",
    "dueDate": "2026-05-10"
  }'
```

---

## Error Handling

All API endpoints return standard HTTP status codes:

| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

Error responses follow this format:

```json
{
  "detail": "Error message describing the issue"
}
```

---

## Rate Limiting

No rate limiting is currently enforced. Use responsibly.

---

## Support

For issues and feature requests, please contact your system administrator.
