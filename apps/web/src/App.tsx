import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { QuotesPage } from '@/pages/QuotesPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { DiscoveriesPage } from '@/pages/DiscoveriesPage';
import { PersonnelPage } from '@/pages/PersonnelPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { FinancePage } from '@/pages/FinancePage';
import { ProductionPage } from '@/pages/ProductionPage';
import { AccountDetail } from '@/pages/AccountDetail';
import { SuppliersPage } from '@/pages/SuppliersPage';
import { PurchaseOrdersPage } from '@/pages/PurchaseOrdersPage';
import { SupplierQuotesPage } from '@/pages/SupplierQuotesPage';
import { AccessDenied } from '@/pages/AccessDeniedPage';
import { AIStudioPage } from '@/pages/AIStudioPage';
import { EInvoicePage } from '@/pages/EInvoicePage';
import { MediaPage } from '@/pages/MediaPage';
import { CampaignDetailPage } from '@/pages/CampaignDetail';
import { PermissionGuard } from '@/components/PermissionGuard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/access-denied" element={<AccessDenied />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route
          path="customers"
          element={
            <PermissionGuard requiredPermissions={['customers:read']} redirectTo="/access-denied">
              <CustomersPage />
            </PermissionGuard>
          }
        />
        <Route
          path="quotes"
          element={
            <PermissionGuard requiredPermissions={['quotes:read']} redirectTo="/access-denied">
              <QuotesPage />
            </PermissionGuard>
          }
        />
        <Route
          path="orders"
          element={
            <PermissionGuard requiredPermissions={['orders:read']} redirectTo="/access-denied">
              <OrdersPage />
            </PermissionGuard>
          }
        />
        <Route
          path="production"
          element={
            <PermissionGuard requiredPermissions={['production:read']} redirectTo="/access-denied">
              <ProductionPage />
            </PermissionGuard>
          }
        />
        <Route
          path="discoveries"
          element={
            <PermissionGuard requiredPermissions={['discoveries:read']} redirectTo="/access-denied">
              <DiscoveriesPage />
            </PermissionGuard>
          }
        />
        <Route
          path="personnel"
          element={
            <PermissionGuard requiredPermissions={['personnel:read']} redirectTo="/access-denied">
              <PersonnelPage />
            </PermissionGuard>
          }
        />
        <Route
          path="inventory"
          element={
            <PermissionGuard requiredPermissions={['inventory:read']} redirectTo="/access-denied">
              <InventoryPage />
            </PermissionGuard>
          }
        />
        <Route
          path="finance"
          element={
            <PermissionGuard requiredPermissions={['finance:read']} redirectTo="/access-denied">
              <FinancePage />
            </PermissionGuard>
          }
        />
        <Route
          path="finance/account/:id"
          element={
            <PermissionGuard requiredPermissions={['finance:read']} redirectTo="/access-denied">
              <AccountDetail />
            </PermissionGuard>
          }
        />
        <Route
          path="purchasing"
          element={
            <PermissionGuard requiredPermissions={['purchasing:read']} redirectTo="/access-denied">
              <SuppliersPage />
            </PermissionGuard>
          }
        />
        <Route
          path="purchasing/orders"
          element={
            <PermissionGuard requiredPermissions={['purchasing:read']} redirectTo="/access-denied">
              <PurchaseOrdersPage />
            </PermissionGuard>
          }
        />
        <Route
          path="purchasing/quotes"
          element={
            <PermissionGuard requiredPermissions={['purchasing:read']} redirectTo="/access-denied">
              <SupplierQuotesPage />
            </PermissionGuard>
          }
        />
        <Route
          path="ai-studio"
          element={
            <PermissionGuard requiredPermissions={['quotes:read']} redirectTo="/access-denied">
              <AIStudioPage />
            </PermissionGuard>
          }
        />
        <Route
          path="e-invoices"
          element={
            <PermissionGuard requiredPermissions={['orders:read']} redirectTo="/access-denied">
              <EInvoicePage />
            </PermissionGuard>
          }
        />
        <Route
          path="media"
          element={
            <PermissionGuard requiredPermissions={['media:read']} redirectTo="/access-denied">
              <MediaPage />
            </PermissionGuard>
          }
        />
        <Route
          path="media/:id"
          element={
            <PermissionGuard requiredPermissions={['media:read']} redirectTo="/access-denied">
              <CampaignDetailPage />
            </PermissionGuard>
          }
        />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
