export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  permissions: string[];
}

// Role definitions
export type UserRole = 'admin' | 'manager' | 'sales' | 'warehouse' | 'finance' | 'viewer' | 'user';

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'admin:all',
    'customers:read', 'customers:create', 'customers:update', 'customers:delete',
    'quotes:read', 'quotes:create', 'quotes:update', 'quotes:delete',
    'orders:read', 'orders:create', 'orders:update', 'orders:delete',
    'discoveries:read', 'discoveries:create', 'discoveries:update', 'discoveries:delete',
    'inventory:read', 'inventory:create', 'inventory:update', 'inventory:delete',
    'personnel:read', 'personnel:create', 'personnel:update', 'personnel:delete',
    'finance:read', 'finance:create', 'finance:update', 'finance:delete',
    'production:read', 'production:create', 'production:update', 'production:delete',
    'purchasing:read', 'purchasing:create', 'purchasing:update', 'purchasing:delete',
    'reports:read',
    'users:read', 'users:update', 'users:manage_roles',
  ],
  manager: [
    'customers:read', 'customers:create', 'customers:update', 'customers:delete',
    'quotes:read', 'quotes:create', 'quotes:update', 'quotes:delete',
    'orders:read', 'orders:create', 'orders:update', 'orders:delete',
    'discoveries:read', 'discoveries:create', 'discoveries:update', 'discoveries:delete',
    'inventory:read', 'inventory:create', 'inventory:update', 'inventory:delete',
    'personnel:read', 'personnel:create', 'personnel:update', 'personnel:delete',
    'finance:read', 'finance:create', 'finance:update', 'finance:delete',
    'production:read', 'production:create', 'production:update', 'production:delete',
    'purchasing:read', 'purchasing:create', 'purchasing:update', 'purchasing:delete',
    'reports:read',
  ],
  sales: [
    'customers:read', 'customers:create', 'customers:update',
    'quotes:read', 'quotes:create', 'quotes:update',
    'orders:read', 'orders:create', 'orders:update',
  ],
  warehouse: [
    'discoveries:read', 'discoveries:create', 'discoveries:update',
    'inventory:read', 'inventory:create', 'inventory:update',
    'production:read', 'production:create', 'production:update',
  ],
  finance: [
    'finance:read', 'finance:create', 'finance:update',
    'reports:read',
  ],
  viewer: [
    'customers:read',
    'quotes:read',
    'orders:read',
    'discoveries:read',
    'inventory:read',
    'personnel:read',
    'finance:read',
    'production:read',
    'reports:read',
  ],
  user: [
    'customers:read',
    'quotes:read',
    'orders:read',
  ],
};

// Permission check helper
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  if (userPermissions.includes('admin:all')) return true;
  return userPermissions.includes(requiredPermission);
}

export function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some(perm => hasPermission(userPermissions, perm));
}

export function hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every(perm => hasPermission(userPermissions, perm));
}

// Compute permissions from roles
export function computePermissions(roles: string[]): string[] {
  const permissions = new Set<string>();
  for (const role of roles) {
    const rolePerms = ROLE_PERMISSIONS[role as UserRole];
    if (rolePerms) {
      rolePerms.forEach(p => permissions.add(p));
    }
  }
  return Array.from(permissions);
}

// Navigation items by role
export interface NavItem {
  label: string;
  path: string;
  requiredPermissions: string[];
}

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  admin: [
    { label: 'Dashboard', path: '/', requiredPermissions: [] },
    { label: 'Customers', path: '/customers', requiredPermissions: ['customers:read'] },
    { label: 'Quotes', path: '/quotes', requiredPermissions: ['quotes:read'] },
    { label: 'Orders', path: '/orders', requiredPermissions: ['orders:read'] },
    { label: 'Production', path: '/production', requiredPermissions: ['production:read'] },
    { label: 'Purchasing', path: '/purchasing', requiredPermissions: ['purchasing:read'] },
    { label: 'Discoveries', path: '/discoveries', requiredPermissions: ['discoveries:read'] },
    { label: 'Inventory', path: '/inventory', requiredPermissions: ['inventory:read'] },
    { label: 'Personnel', path: '/personnel', requiredPermissions: ['personnel:read'] },
    { label: 'Finance', path: '/finance', requiredPermissions: ['finance:read'] },
    { label: 'Reports', path: '/reports', requiredPermissions: ['reports:read'] },
  ],
  manager: [
    { label: 'Dashboard', path: '/', requiredPermissions: [] },
    { label: 'Customers', path: '/customers', requiredPermissions: ['customers:read'] },
    { label: 'Quotes', path: '/quotes', requiredPermissions: ['quotes:read'] },
    { label: 'Orders', path: '/orders', requiredPermissions: ['orders:read'] },
    { label: 'Production', path: '/production', requiredPermissions: ['production:read'] },
    { label: 'Purchasing', path: '/purchasing', requiredPermissions: ['purchasing:read'] },
    { label: 'Discoveries', path: '/discoveries', requiredPermissions: ['discoveries:read'] },
    { label: 'Inventory', path: '/inventory', requiredPermissions: ['inventory:read'] },
    { label: 'Personnel', path: '/personnel', requiredPermissions: ['personnel:read'] },
    { label: 'Finance', path: '/finance', requiredPermissions: ['finance:read'] },
    { label: 'Reports', path: '/reports', requiredPermissions: ['reports:read'] },
  ],
  sales: [
    { label: 'Dashboard', path: '/', requiredPermissions: [] },
    { label: 'Customers', path: '/customers', requiredPermissions: ['customers:read'] },
    { label: 'Quotes', path: '/quotes', requiredPermissions: ['quotes:read'] },
    { label: 'Orders', path: '/orders', requiredPermissions: ['orders:read'] },
  ],
  warehouse: [
    { label: 'Dashboard', path: '/', requiredPermissions: [] },
    { label: 'Discoveries', path: '/discoveries', requiredPermissions: ['discoveries:read'] },
    { label: 'Production', path: '/production', requiredPermissions: ['production:read'] },
    { label: 'Inventory', path: '/inventory', requiredPermissions: ['inventory:read'] },
  ],
  finance: [
    { label: 'Dashboard', path: '/', requiredPermissions: [] },
    { label: 'Finance', path: '/finance', requiredPermissions: ['finance:read'] },
    { label: 'Reports', path: '/reports', requiredPermissions: ['reports:read'] },
  ],
  viewer: [
    { label: 'Dashboard', path: '/', requiredPermissions: [] },
    { label: 'Customers', path: '/customers', requiredPermissions: ['customers:read'] },
    { label: 'Quotes', path: '/quotes', requiredPermissions: ['quotes:read'] },
    { label: 'Orders', path: '/orders', requiredPermissions: ['orders:read'] },
    { label: 'Production', path: '/production', requiredPermissions: ['production:read'] },
    { label: 'Discoveries', path: '/discoveries', requiredPermissions: ['discoveries:read'] },
    { label: 'Inventory', path: '/inventory', requiredPermissions: ['inventory:read'] },
    { label: 'Personnel', path: '/personnel', requiredPermissions: ['personnel:read'] },
    { label: 'Finance', path: '/finance', requiredPermissions: ['finance:read'] },
    { label: 'Reports', path: '/reports', requiredPermissions: ['reports:read'] },
  ],
  user: [
    { label: 'Dashboard', path: '/', requiredPermissions: [] },
    { label: 'Customers', path: '/customers', requiredPermissions: ['customers:read'] },
    { label: 'Quotes', path: '/quotes', requiredPermissions: ['quotes:read'] },
    { label: 'Orders', path: '/orders', requiredPermissions: ['orders:read'] },
  ],
};

export interface Customer {
  id: string;
  legalName: string;
  shortName?: string;
  customerType: string;
  email?: string;
  phone?: string;
  taxOffice?: string;
  taxId?: string;
  addresses: Address[];
  contacts: ContactPerson[];
  bankAccounts: BankAccount[];
  customerNumber: string;
  balance: number;
  isActive: boolean;
  createdAt?: string;
}

export interface Address {
  id?: string;
  label: string;
  street?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  country: string;
}

export interface ContactPerson {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
}

export interface BankAccount {
  id?: string;
  bankName: string;
  branchName?: string;
  accountNumber?: string;
  iban?: string;
}

export interface QuoteItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface QuoteHistoryEntry {
  timestamp: string;
  action: string;
  userId: string;
  userName?: string;
  changes?: Record<string, unknown>;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  title: string;
  customerId?: string;
  customerName?: string;
  items: QuoteItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  validUntil?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  orderId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  history?: QuoteHistoryEntry[];
}

export interface QuotePDFData {
  quoteNumber: string;
  title: string;
  date: string;
  validUntil?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    discount: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes?: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  title: string;
  quoteId?: string;
  customerId?: string;
  customerName?: string;
  items: OrderItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: string;
  priority: string;
  dueDate?: string;
  checklist: ChecklistItem[];
  timeline: TimelineEntry[];
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface TimelineEntry {
  timestamp: string;
  action: string;
  userId?: string;
  userName?: string;
  details?: string;
}

export interface Measurement {
  label: string;
  value: string;
  unit?: string;
}

export interface SiteVisit {
  date: string;
  notes?: string;
  photos: string[];
}

export interface Discovery {
  id: string;
  discoveryNumber: string;
  title: string;
  customerId?: string;
  customerName?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  status: 'new' | 'in_progress' | 'completed';
  priority: 'low' | 'normal' | 'high';
  measurements: Measurement[];
  siteVisits: SiteVisit[];
  notes?: string;
  dueDate?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  timeline?: TimelineEntry[];
  orderId?: string;
}

export interface Personnel {
  id: string;
  personnelNumber: string;
  fullName: string;
  email?: string;
  phone?: string;
  position: string;
  department?: string;
  salary: number;
  startDate?: string;
  isActive: boolean;
  roles: string[];
  createdAt?: string;
}

export interface InventoryItem {
  productId?: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  location?: string;
}

export interface StockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  alertLevel: string;
}

export interface Product {
  id?: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  minStock: number;
  currentStock: number;
  location?: string;
  unitCost: number;
  batchNumber?: string;
  serialNumber?: string;
  expiryDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockMovement {
  id?: string;
  productId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  date: string;
  reference?: string;
  batchNumber?: string;
  serialNumber?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface Warehouse {
  id?: string;
  code: string;
  name: string;
  location?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface StockTakeItem {
  productId: string;
  productName: string;
  sku: string;
  countedQuantity: number;
  systemQuantity: number;
  variance: number;
  notes?: string;
}

export interface StockTake {
  id?: string;
  reference: string;
  date: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  items: StockTakeItem[];
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface InventoryValuation {
  totalValue: number;
  totalProducts: number;
  totalUnits: number;
}

export interface Transaction {
  id?: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  reference?: string;
  accountId?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'credit_card';
  balance: number;
  currency: string;
  transactions?: Transaction[];
}

export interface TransactionCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  isSystem: boolean;
}

export interface RecurringTransaction {
  id?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  accountId: string;
  reference?: string;
  nextRun: string;
  isActive: boolean;
  createdBy?: string;
}

export interface FinanceSummary {
  totalCashBalance: number;
  totalBankBalance: number;
  totalCreditCardBalance: number;
  totalBalance: number;
  monthIncome: number;
  monthExpense: number;
  monthNet: number;
  currency: string;
}

// ==================== PURCHASING ====================

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxOffice?: string;
  taxId?: string;
  contacts: ContactPerson[];
  addresses: Address[];
  supplierNumber: string;
  rating: number;
  isActive: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface POItem {
  id?: string;
  productId?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  receivedQuantity: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName?: string;
  items: POItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
  expectedDelivery?: string;
  actualDelivery?: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierQuote {
  id: string;
  quoteNumber: string;
  supplierId: string;
  supplierName?: string;
  productId?: string;
  productName?: string;
  unitPrice: number;
  minQuantity: number;
  currency: string;
  validUntil?: string;
  leadTimeDays?: number;
  notes?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuoteComparisonItem {
  productId: string;
  productName: string;
  quantity: number;
  quotes: Array<{
    quoteId: string;
    supplierId: string;
    supplierName: string;
    unitPrice: number;
    total: number;
    leadTimeDays?: number;
  }>;
}

export interface QuoteComparison {
  items: QuoteComparisonItem[];
  bestQuotes: Array<{
    productId: string;
    quoteId: string;
    supplierId: string;
    unitPrice: number;
  }>;
}

// ==================== PRODUCTION ====================

export interface BOMItem {
  productId?: string;
  productName: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

export interface BOM {
  id: string;
  name: string;
  productId?: string;
  productName?: string;
  items: BOMItem[];
  version: number;
  totalCost: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  orderId?: string;
  bomId?: string;
  bomName?: string;
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
  quantity: number;
  producedQuantity: number;
  unitCost: number;
  totalCost: number;
  dueDate?: string;
  completedAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectTask {
  id: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  stage: 'planning' | 'in_progress' | 'qa' | 'done';
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  customerId?: string;
  customerName?: string;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  tasks: ProjectTask[];
  progress: number;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
