import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { TransactionModal } from '@/components/finance/TransactionModal';
import type { Account, Transaction } from '@/types';

export function FinancePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [filter, setFilter] = useState<{ type?: string; accountId?: string }>({});

  useEffect(() => {
    Promise.all([
      api.getAccounts(),
      api.getTransactions(),
    ]).then(([accountsData, transactionsData]) => {
      setAccounts(accountsData as Account[]);
      setTransactions((transactionsData as Transaction[]).map((t: Transaction) => ({
        ...t,
        id: t.id || (t as { _id?: string })._id,
      })));
      setLoading(false);
    });
  }, []);

  const handleTransactionSuccess = () => {
    // Refresh data
    Promise.all([
      api.getAccounts(),
      api.getTransactions(),
    ]).then(([accountsData, transactionsData]) => {
      setAccounts(accountsData as Account[]);
      setTransactions((transactionsData as Transaction[]).map((t: Transaction) => ({
        ...t,
        id: t.id || (t as { _id?: string })._id,
      })));
    });
  };

  const filteredTransactions = transactions.filter((t) => {
    if (filter.type && t.type !== filter.type) return false;
    if (filter.accountId && t.accountId !== filter.accountId) return false;
    return true;
  });

  const getAccountName = (accountId?: string) => {
    if (!accountId) return '-';
    const account = accounts.find((a) => a.id === accountId);
    return account?.name || '-';
  };

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

  if (loading) return <div className="text-gray-500">Yükleniyor...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Finans</h1>
        <button
          onClick={() => setShowTransactionModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          + Yeni İşlem
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {accounts.map((account) => (
          <Link
            key={account.id}
            to={`/finance/account/${account.id}`}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getAccountIcon(account.type)}</span>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{account.name}</h3>
                  <span className="text-xs text-gray-400 uppercase">{getAccountTypeLabel(account.type)}</span>
                </div>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {account.balance.toFixed(2)} {account.currency}
            </p>
          </Link>
        ))}
        {accounts.length === 0 && (
          <div className="col-span-3 bg-white rounded-lg shadow p-6 text-center text-gray-500">
            Henüz hesap bulunmuyor. Yeni bir hesap oluşturun.
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium">Son İşlemler</h3>
          <div className="flex gap-2">
            <select
              value={filter.accountId || ''}
              onChange={(e) => setFilter({ ...filter, accountId: e.target.value || undefined })}
              className="border rounded-md px-3 py-1 text-sm"
            >
              <option value="">Tüm Hesaplar</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
            <select
              value={filter.type || ''}
              onChange={(e) => setFilter({ ...filter, type: e.target.value || undefined })}
              className="border rounded-md px-3 py-1 text-sm"
            >
              <option value="">Tüm Türler</option>
              <option value="income">Gelir</option>
              <option value="expense">Gider</option>
            </select>
          </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hesap</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tür</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  İşlem kaydı bulunamadı
                </td>
              </tr>
            ) : (
              filteredTransactions.slice(0, 50).map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getAccountName(transaction.accountId)}
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
                    {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={handleTransactionSuccess}
      />
    </div>
  );
}