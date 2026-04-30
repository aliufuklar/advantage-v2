import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { StockAlert } from '@/types';

interface StockAlertsWidgetProps {
  compact?: boolean;
}

export function StockAlertsWidget({ compact = false }: StockAlertsWidgetProps) {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await api.getStockAlerts() as StockAlert[];
      setAlerts(data);
    } catch (error) {
      console.error('Failed to load stock alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertColor = (alertLevel: string) => {
    switch (alertLevel) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low': return 'bg-orange-50 border-orange-200 text-orange-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getAlertIcon = (alertLevel: string) => {
    switch (alertLevel) {
      case 'critical': return '⛔';
      case 'warning': return '⚠️';
      case 'low': return '📉';
      default: return 'ℹ️';
    }
  };

  const getAlertBadge = (alertLevel: string) => {
    switch (alertLevel) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Stok Uyarilari</h3>
        <div className="flex items-center justify-center p-4 text-green-600">
          <span className="text-2xl mr-2">✅</span>
          <span className="text-sm">Tum urnlerin stok seviyesi normal</span>
        </div>
      </div>
    );
  }

  const criticalCount = alerts.filter(a => a.alertLevel === 'critical').length;
  const warningCount = alerts.filter(a => a.alertLevel === 'warning').length;

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Stok Uyarilari</h3>
          {criticalCount > 0 && (
            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
              {criticalCount} kritik
            </span>
          )}
        </div>
        <div className="space-y-1">
          {alerts.slice(0, 5).map((alert, idx) => (
            <div key={idx} className={`p-2 rounded text-xs ${getAlertColor(alert.alertLevel)}`}>
              <div className="font-medium">{alert.productName}</div>
              <div className="text-opacity-80">
                Mevcut: {alert.currentStock.toLocaleString('tr-TR')} / Min: {alert.minStock.toLocaleString('tr-TR')}
              </div>
            </div>
          ))}
          {alerts.length > 5 && (
            <div className="text-xs text-gray-500 text-center pt-1">
              +{alerts.length - 5} daha fazla
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Stok Uyarilari</h3>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                {criticalCount} kritik
              </span>
            )}
            {warningCount > 0 && (
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                {warningCount} uyari
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${getAlertColor(alert.alertLevel)}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">{getAlertIcon(alert.alertLevel)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{alert.productName}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getAlertBadge(alert.alertLevel)}`}>
                      {alert.alertLevel === 'critical' ? 'Kritik' : alert.alertLevel === 'warning' ? 'Dusuk' : 'Normal'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs opacity-80">
                    <span className="font-medium">{alert.currentStock.toLocaleString('tr-TR')}</span>
                    <span className="mx-1">/</span>
                    <span>Min: {alert.minStock.toLocaleString('tr-TR')}</span>
                  </div>
                  <div className="mt-1 text-xs opacity-70">
                    Stok yetersizligi: {(alert.minStock - alert.currentStock).toLocaleString('tr-TR')} birim
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-2 bg-gray-50 rounded-b-lg text-xs text-gray-500 text-center">
        Toplam {alerts.length} urun uyarisi
      </div>
    </div>
  );
}
