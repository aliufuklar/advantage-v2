import { useState } from 'react';
import type { EInvoice, EInvoiceItem } from '@/types';

interface InvoiceFormProps {
  invoice?: EInvoice | null;
  onSave: (data: Partial<EInvoice>) => Promise<void>;
  onClose: () => void;
}

export function InvoiceForm({ invoice, onSave, onClose }: InvoiceFormProps) {
  const [customerTitle, setCustomerTitle] = useState(invoice?.customerTitle || '');
  const [customerTaxId, setCustomerTaxId] = useState(invoice?.customerTaxId || '');
  const [issueDate, setIssueDate] = useState(invoice?.issueDate || new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<EInvoiceItem[]>(invoice?.items || [
    { description: '', quantity: 1, unit: 'adet', unitPrice: 0, total: 0 }
  ]);
  const [saving, setSaving] = useState(false);

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * 0.20;
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleItemChange = (index: number, field: keyof EInvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate total
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit: 'adet', unitPrice: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { subtotal, taxAmount, total } = calculateTotals();
      await onSave({
        customerTitle,
        customerTaxId,
        issueDate,
        items,
        subtotal,
        taxAmount,
        total,
      });
    } finally {
      setSaving(false);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">
            {invoice ? 'E-Fatura Düzenle' : 'Yeni E-Fatura'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alıcı Ünvanı *
              </label>
              <input
                type="text"
                value={customerTitle}
                onChange={e => setCustomerTitle(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="Müşteri/Şirket adı"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alıcı Vergi Numarası *
              </label>
              <input
                type="text"
                value={customerTaxId}
                onChange={e => setCustomerTaxId(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="Vergi kimlik numarası"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fatura Tarihi
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          {/* Items */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Fatura Kalemleri</h3>
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-2">Açıklama</th>
                  <th className="pb-2 w-20">Adet</th>
                  <th className="pb-2 w-20">Birim</th>
                  <th className="pb-2 w-28">Birim Fiyat</th>
                  <th className="pb-2 w-28">Toplam</th>
                  <th className="pb-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => handleItemChange(index, 'description', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1"
                        placeholder="Ürün/Hizmet açıklaması"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border border-gray-300 px-2 py-1"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={e => handleItemChange(index, 'unit', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={e => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border border-gray-300 px-2 py-1"
                      />
                    </td>
                    <td className="py-2 text-right text-gray-700">
                      {item.total.toFixed(2)} ₺
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              + Kalem Ekle
            </button>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Ara Toplam:</span>
                  <span className="font-medium">{subtotal.toFixed(2)} ₺</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">KDV (%20):</span>
                  <span className="font-medium">{taxAmount.toFixed(2)} ₺</span>
                </div>
                <div className="flex justify-between py-1 border-t pt-2 mt-2">
                  <span className="font-semibold">Genel Toplam:</span>
                  <span className="font-bold text-lg">{total.toFixed(2)} ₺</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
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

export default InvoiceForm;