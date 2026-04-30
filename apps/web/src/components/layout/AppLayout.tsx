import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { RoleBadge } from '@/components/RoleBadge';
import { NAV_ITEMS, UserRole } from '@/types';

export function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  // Get navigation items based on user's primary role
  const primaryRole = (user?.roles?.[0] as UserRole) || 'user';
  const navItems = NAV_ITEMS[primaryRole] || NAV_ITEMS.user;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    location.pathname === item.path
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                    <div className="flex gap-1">
                      {user.roles.map((role) => (
                        <RoleBadge key={role} role={role as UserRole} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
