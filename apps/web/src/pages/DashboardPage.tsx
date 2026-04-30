import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { FinanceSummaryWidget } from '@/components/finance/FinanceSummaryWidget';

interface Stats {
  totalCustomers: number;
  totalQuotes: number;
  totalOrders: number;
  totalPersonnel: number;
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalCustomers: 0, totalQuotes: 0, totalOrders: 0, totalPersonnel: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [customers, quotes, orders, personnel] = await Promise.all([
          api.getCustomers(),
          api.getQuotes(),
          api.getOrders(),
          api.getPersonnel(),
        ]);
        setStats({
          totalCustomers: (customers as unknown[]).length,
          totalQuotes: (quotes as unknown[]).length,
          totalOrders: (orders as unknown[]).length,
          totalPersonnel: (personnel as unknown[]).length,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <div className="text-gray-500">Yükleniyor...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="mb-8">
        <FinanceSummaryWidget />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Müşteriler" value={stats.totalCustomers} icon="👥" />
        <StatCard title="Teklifler" value={stats.totalQuotes} icon="📋" />
        <StatCard title="Siparişler" value={stats.totalOrders} icon="📦" />
        <StatCard title="Personel" value={stats.totalPersonnel} icon="👷" />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </div>
  );
}