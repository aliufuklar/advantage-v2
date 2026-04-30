export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  roles: string[];
  isActive: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

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
  label: string;
  street?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  country: string;
}

export interface ContactPerson {
  name: string;
  phone?: string;
  email?: string;
  role?: string;
}

export interface BankAccount {
  bankName: string;
  branchName?: string;
  accountNumber?: string;
  iban?: string;
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
  status: string;
  validUntil?: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuoteItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  total: number;
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

export interface Discovery {
  id: string;
  discoveryNumber: string;
  title: string;
  customerId?: string;
  customerName?: string;
  contactPerson?: string;
  contactPhone?: string;
  address?: string;
  status: string;
  priority: string;
  measurements: Measurement[];
  siteVisits: SiteVisit[];
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
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

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: string;
  category?: string;
  reference?: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  transactions: Transaction[];
}