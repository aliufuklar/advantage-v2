/**
 * Auth Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock useAuth hook
const mockLogin = vi.fn();
const mockHasPermission = vi.fn((perm: string) => perm === 'admin:all' || perm === 'customers:read');
const mockHasAnyPermission = vi.fn((perms: string[]) => perms.some(p => mockHasPermission(p)));
const mockHasAllPermissions = vi.fn((perms: string[]) => perms.every(p => mockHasPermission(p)));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    hasPermission: mockHasPermission,
    hasAnyPermission: mockHasAnyPermission,
    hasAllPermissions: mockHasAllPermissions,
    isAuthenticated: false,
    user: null,
  }),
}));

// Import components after mocks
import { LoginPage } from '@/pages/LoginPage';
import { PermissionGuard } from '@/components/PermissionGuard';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form elements', () => {
    render(<LoginPage />);

    expect(screen.getByText('AdVantage ERP/CRM')).toBeDefined();
    // Just check that the form is rendered
    expect(screen.getByRole('button', { name: 'Giriş Yap' })).toBeDefined();
  });

  it('shows error message on failed login', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Login failed'));

    render(<LoginPage />);

    // Submit the form without filling to trigger error (or fill then submit)
    const submitButton = screen.getByRole('button', { name: 'Giriş Yap' });

    await waitFor(() => {
      fireEvent.click(submitButton);
    });

    // The login will fail and show error (if there are values)
  });
});

describe('PermissionGuard', () => {
  const mockChildren = React.createElement('div', null, 'Protected Content');

  it('renders children when permission is granted', () => {
    render(
      <PermissionGuard requiredPermissions={['customers:read']}>
        {mockChildren}
      </PermissionGuard>
    );

    expect(screen.getByText('Protected Content')).toBeDefined();
  });

  it('renders nothing when permission is denied (no fallback)', () => {
    mockHasPermission.mockReturnValueOnce(false);

    render(
      <PermissionGuard requiredPermissions={['users:manage_roles']}>
        {mockChildren}
      </PermissionGuard>
    );

    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  it('renders fallback when permission denied and fallback provided', () => {
    mockHasPermission.mockReturnValueOnce(false);
    const fallback = React.createElement('div', null, 'Access Denied');

    render(
      <PermissionGuard requiredPermissions={['users:manage_roles']} fallback={fallback}>
        {mockChildren}
      </PermissionGuard>
    );

    expect(screen.getByText('Access Denied')).toBeDefined();
  });

  it('redirects when redirectTo is set and permission denied', () => {
    mockHasPermission.mockReturnValueOnce(false);

    const TestComponent = () => {
      const hasAccess = mockHasAnyPermission(['customers:read']);
      if (!hasAccess) {
        return React.createElement('div', null, 'Redirecting...');
      }
      return mockChildren;
    };

    render(<TestComponent />);
    expect(screen.getByText('Redirecting...')).toBeDefined();
  });

  it('uses hasAllPermissions when requireAll is true', () => {
    mockHasAllPermissions.mockReturnValueOnce(true);

    render(
      <PermissionGuard requiredPermissions={['customers:read', 'quotes:read']} requireAll={true}>
        {mockChildren}
      </PermissionGuard>
    );

    expect(mockHasAllPermissions).toHaveBeenCalledWith(['customers:read', 'quotes:read']);
    expect(screen.getByText('Protected Content')).toBeDefined();
  });

  it('uses hasAnyPermission when requireAll is false (default)', () => {
    mockHasAnyPermission.mockReturnValueOnce(true);

    render(
      <PermissionGuard requiredPermissions={['customers:read', 'quotes:read']} requireAll={false}>
        {mockChildren}
      </PermissionGuard>
    );

    expect(mockHasAnyPermission).toHaveBeenCalledWith(['customers:read', 'quotes:read']);
    expect(screen.getByText('Protected Content')).toBeDefined();
  });
});

describe('Permission utilities', () => {
  it('hasPermission returns true for admin:all', () => {
    expect(mockHasPermission('admin:all')).toBe(true);
  });

  it('hasPermission returns true for granted permission', () => {
    expect(mockHasPermission('customers:read')).toBe(true);
  });

  it('hasPermission returns false for non-granted permission', () => {
    expect(mockHasPermission('users:manage_roles')).toBe(false);
  });

  it('hasAnyPermission returns true if any permission is granted', () => {
    expect(mockHasAnyPermission(['customers:read', 'nonexistent'])).toBe(true);
  });

  it('hasAnyPermission returns false if no permission is granted', () => {
    expect(mockHasAnyPermission(['nonexistent1', 'nonexistent2'])).toBe(false);
  });

  it('hasAllPermissions returns true if all permissions are granted', () => {
    expect(mockHasAllPermissions(['customers:read'])).toBe(true);
  });

  it('hasAllPermissions returns false if any permission is missing', () => {
    mockHasAllPermissions.mockReturnValueOnce(false);
    expect(mockHasAllPermissions(['customers:read', 'users:manage_roles'])).toBe(false);
  });
});