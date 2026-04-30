import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

interface PermissionGuardProps {
  children: ReactNode;
  requiredPermissions: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function PermissionGuard({
  children,
  requiredPermissions,
  requireAll = false,
  fallback,
  redirectTo,
}: PermissionGuardProps) {
  const { hasAnyPermission, hasAllPermissions } = useAuth();

  const hasAccess = requireAll
    ? hasAllPermissions(requiredPermissions)
    : hasAnyPermission(requiredPermissions);

  if (!hasAccess) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  return <>{children}</>;
}
