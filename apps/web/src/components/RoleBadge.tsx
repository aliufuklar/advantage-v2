import type { UserRole } from '@/types';

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

const roleColors: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  manager: 'bg-blue-100 text-blue-800 border-blue-200',
  sales: 'bg-green-100 text-green-800 border-green-200',
  warehouse: 'bg-orange-100 text-orange-800 border-orange-200',
  finance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  viewer: 'bg-gray-100 text-gray-800 border-gray-200',
  user: 'bg-slate-100 text-slate-800 border-slate-200',
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  sales: 'Satış',
  warehouse: 'Depo',
  finance: 'Finans',
  viewer: 'Görüntüleyici',
  user: 'Kullanıcı',
};

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${roleColors[role] || roleColors.user} ${className}`}
    >
      {roleLabels[role] || role}
    </span>
  );
}
