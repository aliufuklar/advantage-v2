import { useState, useEffect } from 'react';
import type { Order, OrderItem, ChecklistItem, Quote } from '@/types';
import { ChecklistPanel } from './ChecklistPanel';

interface OrderModalProps {
  order?: Order | null;
  quotes?: Quote[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (order: Partial<Order>) => void;
}

type Tab = 'items' | 'checklist' | 'timeline';

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
  urgent: 'bg-red-600 text-white',
};

const STATUS_OPTIONS = ['pending', 'in_progress', 'completed', 'cancelled'];
const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent'];

export function OrderModal({ order, quotes = [], isOpen, onClose, onSave }: OrderModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('items');
  const [formData, setFormData] = useState({
    title: '',
    quoteId: '',
    customerId: '',
    customerName: '',
    items: [] as OrderItem[],
    taxRate: 20,
    currency: 'TRY',
    status: 'pending',
    priority: 'normal',
    dueDate: '',
    checklist: [] as ChecklistItem[],
    notes: '',
  });

  const [newItem, setNewItem] = useState<OrderItem>({
    description: '',
    quantity: 1,
    unit: 'adet',
    unitPrice: 0,
    total: 0,
  });

  useEffect(() => {
    if (order) {
      setFormData({
        title: order.title || '',
        quoteId: order.quoteId || '',
        customerId: order.customerId || '',
        customerName: order.customerName || '',
        items: order.items || [],
        taxRate: order.taxRate || 20,
        currency: order.currency || 'TRY',
        status: order.status || 'pending',
        priority: order.priority || 'normal',
        dueDate: order.dueDate || '',
        checklist: order.checklist || [],
        notes: order.notes || '',
      });
    } else {
      setFormData({
        title: '',
        quoteId: '',
        customerId: '',
        customerName: '',
        items: [],
        taxRate: 20,
        currency: 'TRY',
        status: 'pending',
        priority: 'normal',
        dueDate: '',
        checklist: [],
        notes: '',
      });
    }
  }, [order]);

  const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = subtotal * (formData.taxRate / 100);
  const total = subtotal + taxAmount;

  const addItem = () => {
    if (!newItem.description.trim()) return;
    const itemTotal = newItem.quantity * newItem.unitPrice;
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...newItem, total: itemTotal }],
    }));
    setNewItem({ description: '', quantity: 1, unit: 'adet', unitPrice: 0, total: 0 });
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const createFromQuote = (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (quote) {
      setFormData(prev => ({
        ...prev,
        quoteId: quote.id,
        customerId: quote.customerId || '',
        customerName: quote.customerName || '',
        items: quote.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      }));
    }
  };

  const handleSave = () => {
    onSave({
      ...order,
      ...formData,
      subtotal,
      taxAmount,
      total,
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {order ? 'Siparişi Düzenle' : 'Yeni Sipariş'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Durum</label>
              <select
                value={formData.status}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className={`w-full px-3 py-1.5 text-sm rounded border ${getStatusBadge(formData.status)} border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500`}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Öncelik</label>
              <select
                value={formData.priority}
                onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className={`w-full px-3 py-1.5 text-sm rounded border ${PRIORITY_COLORS[formData.priority]}`}
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bitiş Tarihi</label>
              <input
                type="datetime-local"
                value={formData.dueDate}
                onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Kayıt No</label>
              <input
                type="text"
                value={order?.orderNumber || 'Yeni'}
                disabled
                className="w-full px-3 py-1.5 text-sm bg-gray-100 border border-gray-300 rounded text-gray-500"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-b flex gap-4">
          <button
            onClick={() => setActiveTab('items')}
            className={`px-4 py-2 text-sm font-medium rounded-t border-b-2 ${
              activeTab === 'items'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Kalemler
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-4 py-2 text-sm font-medium rounded-t border-b-2 ${
              activeTab === 'checklist'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Checklist ({formData.checklist.filter(i => i.completed).length}/{formData.checklist.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 text-sm font-medium rounded-t border-b-2 ${
              activeTab === 'timeline'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Timeline
          </button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Başlık</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Müşteri</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={e => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              {quotes.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Teklifden Oluştur</label>
                  <select
                    value={formData.quoteId}
                    onChange={e => {
                      if (e.target.value) createFromQuote(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Teklif seçin...</option>
                    {quotes.map(q => (
                      <option key={q.id} value={q.id}>{q.quoteNumber} - {q.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kalem Ekle</label>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Açıklama"
                      value={newItem.description}
                      onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      placeholder="Miktar"
                      value={newItem.quantity}
                      onChange={e => setNewItem(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="text"
                      placeholder="Birim"
                      value={newItem.unit}
                      onChange={e => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      placeholder="Birim Fiyat"
                      value={newItem.unitPrice}
                      onChange={e => setNewItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <button
                    onClick={addItem}
                    className="px-4 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                  >
                    Ekle
                  </button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Açıklama</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Miktar</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Birim</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Birim Fiyat</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Toplam</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{item.unit}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.total.toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => removeItem(index)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-4 text-sm">
                <span>Ara Toplam: <strong>{subtotal.toFixed(2)} ₺</strong></span>
                <span>KDV ({formData.taxRate}%): <strong>{taxAmount.toFixed(2)} ₺</strong></span>
                <span>Toplam: <strong className="text-primary-600">{total.toFixed(2)} ₺</strong></span>
              </div>
            </div>
          )}

          {activeTab === 'checklist' && (
            <ChecklistPanel
              checklist={formData.checklist}
              onChecklistChange={checklist => setFormData(prev => ({ ...prev, checklist }))}
            />
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-3">
              {order?.timeline && order.timeline.length > 0 ? (
                order.timeline.map((entry, index) => (
                  <div key={index} className="flex gap-3 text-sm">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary-600" />
                      {index < order.timeline.length - 1 && <div className="w-0.5 h-full bg-gray-300 mt-1" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-gray-900">{entry.action}</p>
                      {entry.details && <p className="text-gray-500">{entry.details}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(entry.timestamp).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">Henüz timeline kaydı yok.</p>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-100"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderModal;
