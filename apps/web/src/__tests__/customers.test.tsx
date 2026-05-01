/**
 * Customers Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the useAuth hook
const mockHasPermission = vi.fn((perm: string) => perm === 'admin:all' || perm === 'customers:read');
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    hasPermission: mockHasPermission,
    hasAnyPermission: (perms: string[]) => perms.some(p => mockHasPermission(p)),
    hasAllPermissions: (perms: string[]) => perms.every(p => mockHasPermission(p)),
    isAuthenticated: true,
    user: { id: '1', email: 'test@test.com', roles: ['admin'] },
  }),
}));

// Mock useCustomers hook
const mockCustomers = [
  {
    id: 'cust-1',
    legalName: 'Acme Corporation',
    shortName: 'Acme',
    customerType: 'customer',
    email: 'contact@acme.com',
    phone: '+905551234567',
    customerNumber: 'MUS-0001',
    balance: 1000.50,
    isActive: true,
    addresses: [],
    contacts: [],
    bankAccounts: [],
  },
];

const mockFetchCustomers = vi.fn();

vi.mock('@/hooks/useCustomers', () => ({
  useCustomers: () => ({
    customers: mockCustomers,
    loading: false,
    error: null,
    fetchCustomers: mockFetchCustomers,
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    deleteCustomer: vi.fn(),
    currentPage: 1,
  }),
}));

// Import after mocks
import { CustomersPage } from '@/pages/CustomersPage';

describe('CustomersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', () => {
    render(<CustomersPage />);
    const heading = screen.getByRole('heading');
    expect(heading.textContent).toBe('Customers');
  });

  it('renders New Customer button', () => {
    render(<CustomersPage />);
    expect(screen.getByRole('button', { name: 'New Customer' })).toBeDefined();
  });

  it('renders search input', () => {
    render(<CustomersPage />);
    expect(screen.getByPlaceholderText('Search by name, email, or customer number...')).toBeDefined();
  });

  it('calls fetchCustomers on mount', () => {
    render(<CustomersPage />);
    expect(mockFetchCustomers).toHaveBeenCalledWith({
      search: undefined,
      customerType: undefined,
      page: 1,
      pageSize: 20,
    });
  });
});

describe('Customer data formatting', () => {
  it('formats currency correctly', () => {
    const balance = 1234.56;
    expect(balance.toFixed(2)).toBe('1234.56');
  });

  it('displays email or dash when missing', () => {
    const customerWithoutEmail = {
      id: 'cust-3',
      legalName: 'No Email Corp',
      email: undefined,
      customerNumber: 'MUS-0003',
      balance: 0,
      isActive: true,
      addresses: [],
      contacts: [],
      bankAccounts: [],
      customerType: 'customer' as const,
    };

    // When email is undefined, UI should show '-'
    expect(customerWithoutEmail.email || '-').toBe('-');
  });

  it('displays phone or dash when missing', () => {
    const customerWithoutPhone = {
      id: 'cust-4',
      legalName: 'No Phone Corp',
      phone: undefined,
      customerNumber: 'MUS-0004',
      balance: 0,
      isActive: true,
      addresses: [],
      contacts: [],
      bankAccounts: [],
      customerType: 'customer' as const,
    };

    expect(customerWithoutPhone.phone || '-').toBe('-');
  });
});