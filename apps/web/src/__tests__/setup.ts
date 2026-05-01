/**
 * Vitest setup for frontend tests
 */
import { vi } from 'vitest';

// Mock API module
vi.mock('@/lib/api', () => ({
  api: {
    setToken: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    getMe: vi.fn(),
    getCustomers: vi.fn(),
    getCustomer: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    deleteCustomer: vi.fn(),
    getQuotes: vi.fn(),
    getQuote: vi.fn(),
    createQuote: vi.fn(),
    updateQuote: vi.fn(),
    deleteQuote: vi.fn(),
    approveQuote: vi.fn(),
    rejectQuote: vi.fn(),
    copyQuote: vi.fn(),
    convertQuoteToOrder: vi.fn(),
    getOrders: vi.fn(),
    getOrder: vi.fn(),
    createOrder: vi.fn(),
    updateOrder: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

// Mock fetch
(globalThis as { fetch?: typeof fetch }).fetch = vi.fn();

// Test timeout
vi.setConfig({
  testTimeout: 10000,
});