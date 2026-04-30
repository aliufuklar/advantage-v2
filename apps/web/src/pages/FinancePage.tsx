import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Account } from '@/types';

export function FinancePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAccounts().then((data) => {
      setAccounts(data as Account[]);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-gray-500">Yükleniyor...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Finans</h1>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
          + Yeni İşlem
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {accounts.map((account) => (
          <div key={account.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">{account.name}</h3>
            <p className="text-2xl font-bold text-gray-900">{account.balance.toFixed(2)} {account.currency}</p>
            <span className="text-xs text-gray-400 uppercase">{account.type}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium">Son İşlemler</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tür</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tutar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" colSpan={4}>
                İşlem kaydı bulunamadı
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}