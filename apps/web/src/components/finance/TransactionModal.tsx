import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Account, TransactionCategory } from '@/types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accountId?: string;
}

export function TransactionModal({ isOpen, onClose, onSuccess, accountId }: TransactionModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category: '',
    accountId: accountId || '',
    reference: '',
  });

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        api.getAccounts(),
        api.getCategories(),
      ]).then(([accountsData, categoriesData]) => {
        setAccounts(accountsData as Account[]);
        setCategories(categoriesData as TransactionCategory[]);

        // Set default account if provided
        if (accountId) {
          setFormData((prev) => ({ ...prev, accountId }));
        } else if ((accountsData as Account[]).length > 0) {
          setFormData((prev) => ({ ...prev, accountId: (accountsData as Account[])[0].id }));
        }
      });
    }
  }, [isOpen, accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.accountId || !formData.category) {
      return;
    }

    setLoading(true);
    try {
      await api.createTransaction({
        ...formData,
        amount: parseFloat(formData.amount),
      });
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        type: 'expense',
        category: '',
        accountId: accounts[0]?.id || '',
        reference: '',
      });
    } catch (error) {
      console.error('Transaction failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === formData.type);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Yeni İşlem</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex gap-4 mb-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'expense' })}
              className={`flex-1 py-2 rounded-md font-medium transition-colors ${
                formData.type === 'expense'
                  ? 'bg-red-100 text-red-800 border-2 border-red-500'
                  : 'bg-gray-100 text-gray-600 border-2 border-transparent'
              }`}
            >
              Gider
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'income' })}
              className={`flex-1 py-2 rounded-md font-medium transition-colors ${
                formData.type === 'income'
                  ? 'bg-green-100 text-green-800 border-2 border-green-500'
                  : 'bg-gray-100 text-gray-600 border-2 border-transparent'
              }`}
            >
              Gelir
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full border rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="İşlem açıklaması..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tutar</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full border rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hesap</label>
            <select
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              className="w-full border rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Hesap seçin...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full border rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Kategori seçin...</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referans/Fiş No (Opsiyonel)</label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              className="w-full border rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Fiş numarası, çek no, vb."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 rounded-md text-white ${
                formData.type === 'income'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-50`}
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}