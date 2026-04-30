import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { RoleBadge } from '@/components/RoleBadge';

export function AccessDenied() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Erişim Reddedildi</h1>
        <p className="text-gray-600 mb-6">
          Bu sayfaya erişim yetkiniz bulunmamaktadır. Yetkili olmadığınız kaynaklara erişmeye
          çalıştığınızı tespit ettik.
        </p>

        {user && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Oturum Bilgileri:</p>
            <p className="font-medium text-gray-900">{user.fullName}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="mt-2 flex justify-center gap-1">
              {user.roles.map((role) => (
                <RoleBadge key={role} role={role as any} />
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Link
            to="/"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
