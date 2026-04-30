import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { StockAlert } from '@/types';

export function InventoryPage() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStockAlerts().then((data) => {
      setAlerts(data as StockAlert[]);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-gray-500">Yükleniyor...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Envanter</h1>

      {alerts.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800">Stok Uyarıları</h3>
          <ul className="mt-2 space-y-1">
            {alerts.map((alert, idx) => (
              <li key={idx} className="text-sm text-yellow-700">
                <span className="font-medium">{alert.productName}</span>: {alert.currentStock} / min {alert.minStock}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        Envanter listesi yakında eklenecek
      </div>
    </div>
  );
}