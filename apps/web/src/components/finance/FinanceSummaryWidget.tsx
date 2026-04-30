import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { FinanceSummary } from '@/types';

export function FinanceSummaryWidget() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFinanceSummary()
      .then((data) => {
        setSummary(data as FinanceSummary);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Finansal Özet</h3>
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Finansal Özet</h3>
        <div className="text-gray-500">Veri yüklenemedi</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Finansal Özet</h3>

      <div className="space-y-4">
        <div className="flex justify-between items-center pb-3 border-b">
          <span className="text-sm text-gray-500">Toplam Bakiye</span>
          <span className="text-xl font-bold text-gray-900">
            {summary.totalBalance.toFixed(2)} {summary.currency}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Nakit</p>
            <p className="text-sm font-medium text-gray-900">{summary.totalCashBalance.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Banka</p>
            <p className="text-sm font-medium text-gray-900">{summary.totalBankBalance.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Kredi Kartı</p>
            <p className="text-sm font-medium text-gray-900">{summary.totalCreditCardBalance.toFixed(2)}</p>
          </div>
        </div>

        <div className="pt-3 border-t">
          <p className="text-sm text-gray-500 mb-2">Bu Ay</p>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-green-600">Gelir</span>
            <span className="text-sm font-medium text-green-600">
              +{summary.monthIncome.toFixed(2)} {summary.currency}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-red-600">Gider</span>
            <span className="text-sm font-medium text-red-600">
              -{summary.monthExpense.toFixed(2)} {summary.currency}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm font-medium text-gray-700">Net</span>
            <span className={`text-sm font-bold ${summary.monthNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.monthNet >= 0 ? '+' : ''}{summary.monthNet.toFixed(2)} {summary.currency}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}