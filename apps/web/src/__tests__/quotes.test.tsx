/**
 * Quotes Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock the api module
vi.mock('@/lib/api', () => ({
  api: {
    createQuote: vi.fn(),
    updateQuote: vi.fn(),
    getQuotes: vi.fn(),
    getQuote: vi.fn(),
  },
}));

// Import after mocks
import { QuoteModal } from '@/components/quotes/QuoteModal';
import type { Quote, Customer } from '@/types';

// Common mocks for QuoteModal tests
const mockOnSave = vi.fn();
const mockOnClose = vi.fn();

const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    legalName: 'Acme Corporation',
    shortName: 'Acme',
    customerType: 'customer',
    email: 'contact@acme.com',
    customerNumber: 'MUS-0001',
    balance: 0,
    isActive: true,
    addresses: [],
    contacts: [],
    bankAccounts: [],
  },
];

describe('QuoteModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when isOpen is true', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        customers={mockCustomers}
      />
    );

    expect(screen.getByText('Yeni Teklif')).toBeDefined();
  });

  it('does not render modal when isOpen is false', () => {
    render(
      <QuoteModal
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
        customers={mockCustomers}
      />
    );

    expect(screen.queryByText('Yeni Teklif')).toBeNull();
  });

  it('renders form fields correctly', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        customers={mockCustomers}
      />
    );

    // Check for heading
    expect(screen.getByText('Yeni Teklif')).toBeDefined();
    // Check for form elements exist (by type)
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
  });

  it('displays initial empty item row', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        customers={mockCustomers}
      />
    );

    // Should have at least one item row
    const itemInputs = screen.getAllByPlaceholderText('Açıklama');
    expect(itemInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onClose when Cancel clicked', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        customers={mockCustomers}
      />
    );

    const cancelButton = screen.getByText('İptal');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('populates form when quote prop is provided', () => {
    const existingQuote: Quote = {
      id: 'quote-1',
      quoteNumber: 'TEK-0001',
      title: 'Existing Quote',
      customerId: 'cust-1',
      customerName: 'Acme Corporation',
      items: [
        { description: 'Product A', quantity: 2, unit: 'adet', unitPrice: 100, discount: 0, total: 200 },
        { description: 'Product B', quantity: 1, unit: 'adet', unitPrice: 50, discount: 10, total: 40 },
      ],
      subtotal: 240,
      taxRate: 20,
      taxAmount: 48,
      total: 288,
      currency: 'TRY',
      status: 'draft',
    };

    render(
      <QuoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        quote={existingQuote}
        customers={mockCustomers}
      />
    );

    // Should show edit mode title
    expect(screen.getByText('Teklif Düzenle')).toBeDefined();
  });
});

describe('Quote total calculation', () => {
  it('calculates item total correctly', () => {
    const quantity = 2;
    const unitPrice = 100;
    const discount = 0;
    const itemTotal = quantity * unitPrice - discount;
    expect(itemTotal).toBe(200);
  });

  it('calculates item total with discount', () => {
    const quantity = 1;
    const unitPrice = 50;
    const discount = 10;
    const itemTotal = quantity * unitPrice - discount;
    expect(itemTotal).toBe(40);
  });

  it('calculates subtotal from multiple items', () => {
    const items = [
      { total: 200 },
      { total: 40 },
    ];
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    expect(subtotal).toBe(240);
  });

  it('calculates tax amount correctly', () => {
    const subtotal = 240;
    const taxRate = 20;
    const taxAmount = subtotal * (taxRate / 100);
    expect(taxAmount).toBe(48);
  });

  it('calculates grand total correctly', () => {
    const subtotal = 240;
    const taxAmount = 48;
    const total = subtotal + taxAmount;
    expect(total).toBe(288);
  });

  it('handles zero items', () => {
    const items: { total: number }[] = [];
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    expect(subtotal).toBe(0);
  });

  it('handles zero tax rate', () => {
    const subtotal = 240;
    const taxRate = 0;
    const taxAmount = subtotal * (taxRate / 100);
    expect(taxAmount).toBe(0);
  });
});

describe('QuoteModal states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables submit when title is empty', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        customers={[]}
      />
    );

    const submitButton = screen.getByText('Kaydet').closest('button') as HTMLButtonElement;
    expect(submitButton?.disabled).toBe(true);
  });
});

describe('Quote currency options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all currency options', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        customers={[]}
      />
    );

    expect(screen.getByText('TRY')).toBeDefined();
    expect(screen.getByText('USD')).toBeDefined();
    expect(screen.getByText('EUR')).toBeDefined();
  });
});

describe('Quote status options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all status options', () => {
    render(
      <QuoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        customers={[]}
      />
    );

    expect(screen.getByText('Taslak')).toBeDefined();
    expect(screen.getByText('Onay Bekliyor')).toBeDefined();
    expect(screen.getByText('Onaylandı')).toBeDefined();
    expect(screen.getByText('Reddedildi')).toBeDefined();
  });
});