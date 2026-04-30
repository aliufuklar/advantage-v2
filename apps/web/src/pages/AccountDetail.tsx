import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Account, Transaction, TransactionCategory } from '@/types';

export function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ type?: string; category?: string }>({});

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getAccount(id),
      api.getTransactions({ accountId: id }),
      api.getCategories(),
    ]).then(([accountData, transactionsData, categoriesData]) => {
      setAccount(accountData as Account);
      setTransactions((transactionsData as Transaction[]).map((t: Transaction) => ({
        ...t,
        id: t.id || (t as { _id?: string })._id,
      })));
      setCategories(categoriesData as TransactionCategory[]);
      setLoading(false);
    });
  }, [id]);

  const filteredTransactions = transactions.filter((t) => {
    if (filter.type && t.type !== filter.type) return false;
    if (filter.category && t.category !== filter.category) return false;
    return true;
  });

  // Calculate this month's totals
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthTransactions = transactions.filter((t) => t.date >= monthStart);
  const monthIncome = monthTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const monthExpense = monthTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  if (loading) return <div className="text-gray-500">Yükleniyor...</div>;
  if (!account) return <div className="text-red-500">Hesap bulunamadı</div>;

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cash: 'Nakit',
      bank: 'Banka',
      credit_card: 'Kredi Kartı',
    };
    return labels[type] || type;
  };

  const getAccountIcon = (type: string) => {
    const icons: Record<string, string> = {
      cash: '💵',
      bank: '🏦',
      credit_card: '💳',
    };
    return icons[type] || '💰';
  };

  return (
    <div>
      <div className="mb-6">
        <Link to="/finance" className="text-primary-600 hover:text-primary-700 text-sm">
          ← Finans Sayfasına Dön
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getAccountIcon(account.type)}</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
              <span className="text-sm text-gray-500">{getAccountTypeLabel(account.type)}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Bakiye</p>
            <p className="text-3xl font-bold text-gray-900">
              {account.balance.toFixed(2)} {account.currency}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-green-500 text-xl">↑</span>
            <span className="text-sm text-gray-500">Bu Ay Gelir</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{monthIncome.toFixed(2)} {account.currency}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-red-500 text-xl">↓</span>
            <span className="text-sm text-gray-500">Bu Ay Gider</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{monthExpense.toFixed(2)} {account.currency}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-500 text-xl">◎</span>
            <span className="text-sm text-gray-500">Net (Bu Ay)</span>
          </div>
          <p className={`text-2xl font-bold ${monthIncome - monthExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(monthIncome - monthExpense).toFixed(2)} {account.currency}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium">İşlem Geçmişi</h3>
          <div className="flex gap-2">
            <select
              value={filter.type || ''}
              onChange={(e) => setFilter({ ...filter, type: e.target.value || undefined })}
              className="border rounded-md px-3 py-1 text-sm"
            >
              <option value="">Tüm Türler</option>
              <option value="income">Gelir</option>
              <option value="expense">Gider</option>
            </select>
            <select
              value={filter.category || ''}
              onChange={(e) => setFilter({ ...filter, category: e.target.value || undefined })}
              className="border rounded-md px-3 py-1 text-sm"
            >
              <option value="">Tüm Kategoriler</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tür</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  İşlem kaydı bulunamadı
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.date}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.category || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        transaction.type === 'income'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {transaction.type === 'income' ? 'Gelir' : 'Gider'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toFixed(2)} {account.currency}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}