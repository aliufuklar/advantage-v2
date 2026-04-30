import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Quote, Customer } from '@/types';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quote: Quote) => void;
  quote?: Quote | null;
  customers: Customer[];
}

interface ItemRow {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function calculateItemTotal(item: ItemRow): number {
  return item.quantity * item.unitPrice - item.discount;
}

export function QuoteModal({ isOpen, onClose, onSave, quote, customers }: QuoteModalProps) {
  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<ItemRow[]>([]);
  const [taxRate, setTaxRate] = useState(20);
  const [currency, setCurrency] = useState('TRY');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const subtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const filteredCustomers = customers.filter(c =>
    c.legalName.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.shortName?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  useEffect(() => {
    if (quote) {
      setTitle(quote.title);
      setCustomerId(quote.customerId || '');
      setCustomerName(quote.customerName || '');
      setItems(quote.items.map(item => ({
        ...item,
        id: generateId()
      })));
      setTaxRate(quote.taxRate);
      setCurrency(quote.currency);
      setValidUntil(quote.validUntil || '');
      setNotes(quote.notes || '');
      setStatus(quote.status);
    } else {
      setTitle('');
      setCustomerId('');
      setCustomerName('');
      setItems([{ id: generateId(), description: '', quantity: 1, unit: 'adet', unitPrice: 0, discount: 0 }]);
      setTaxRate(20);
      setCurrency('TRY');
      setValidUntil('');
      setNotes('');
      setStatus('draft');
    }
  }, [quote, isOpen]);

  const handleAddItem = () => {
    setItems([...items, { id: generateId(), description: '', quantity: 1, unit: 'adet', unitPrice: 0, discount: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof ItemRow, value: string | number) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleCustomerSelect = (customer: Customer) => {
    setCustomerId(customer.id);
    setCustomerName(customer.legalName);
    setCustomerSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const quoteData = {
        title,
        customerId: customerId || null,
        customerName: customerName || null,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: calculateItemTotal(item)
        })),
        taxRate,
        currency,
        validUntil: validUntil || null,
        notes: notes || null,
        status
      };

      let savedQuote: Quote;
      if (quote?.id) {
        savedQuote = await api.updateQuote(quote.id, quoteData) as Quote;
      } else {
        savedQuote = await api.createQuote(quoteData) as Quote;
      }

      onSave(savedQuote);
      onClose();
    } catch (error) {
      console.error('Failed to save quote:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">{quote ? 'Teklif Düzenle' : 'Yeni Teklif'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlık *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri</label>
              <input
                type="text"
                value={customerSearch || customerName}
                onChange={e => {
                  setCustomerSearch(e.target.value);
                  setCustomerName(e.target.value);
                }}
                onFocus={() => setCustomerSearch(customerName)}
                placeholder="Müşteri ara..."
                className="w-full border rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {customerSearch && filteredCustomers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCustomerSelect(c)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50"
                    >
                      {c.legalName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">KDV Oranı (%)</label>
              <input
                type="number"
                value={taxRate}
                onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full border rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Para Birimi</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geçerlilik Tarihi</label>
              <input
                type="date"
                value={validUntil}
                onChange={e => setValidUntil(e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="draft">Taslak</option>
                <option value="pending">Onay Bekliyor</option>
                <option value="approved">Onaylandı</option>
                <option value="rejected">Reddedildi</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Kalemler</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                + Kalem Ekle
              </button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Açıklama</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-20">Miktar</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-20">Birim</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-28">Birim Fiyat</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-28">İskonto</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-28">Toplam</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="Açıklama"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={e => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.discount}
                          onChange={e => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">
                        {calculateItemTotal(item).toFixed(2)} {currency}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                          disabled={items.length === 1}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <div className="text-right space-y-1">
              <div className="text-sm text-gray-500">Ara Toplam: <span className="font-medium">{subtotal.toFixed(2)} {currency}</span></div>
              <div className="text-sm text-gray-500">KDV ({taxRate}%): <span className="font-medium">{taxAmount.toFixed(2)} {currency}</span></div>
              <div className="text-lg font-semibold">Toplam: {total.toFixed(2)} {currency}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full border rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Ek notlar..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving || !title}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}