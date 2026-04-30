import { useState, useEffect } from 'react';
import type { PurchaseOrder, Supplier, POItem } from '@/types';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  suppliers: Supplier[];
  onSave: (data: Partial<PurchaseOrder>) => Promise<void>;
  onDelete?: () => Promise<void>;
  isLoading?: boolean;
}

const emptyPOItem: POItem = {
  id: '',
  productId: '',
  description: '',
  quantity: 1,
  unit: 'adet',
  unitPrice: 0,
  receivedQuantity: 0,
  total: 0,
};

export function PurchaseOrderModal({ isOpen, onClose, order, suppliers, onSave, onDelete, isLoading }: PurchaseOrderModalProps) {
  const [formData, setFormData] = useState({
    supplierId: '',
    items: [] as POItem[],
    taxRate: 18,
    notes: '',
    expectedDelivery: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState<POItem>({ ...emptyPOItem });

  useEffect(() => {
    if (order) {
      setFormData({
        supplierId: order.supplierId || '',
        items: order.items || [],
        taxRate: order.taxRate || 18,
        notes: order.notes || '',
        expectedDelivery: order.expectedDelivery ? order.expectedDelivery.split('T')[0] : '',
      });
    } else {
      setFormData({
        supplierId: '',
        items: [],
        taxRate: 18,
        notes: '',
        expectedDelivery: '',
      });
    }
    setErrors({});
  }, [order, isOpen]);

  const calculateTotals = (items: POItem[], taxRate: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleItemChange = (index: number, field: keyof POItem, value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      // Recalculate total if quantity or unitPrice changed
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) : newItems[index].quantity;
        const price = field === 'unitPrice' ? Number(value) : newItems[index].unitPrice;
        newItems[index].total = qty * price;
      }

      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    if (!newItem.description.trim()) {
      setErrors(prev => ({ ...prev, newItem: 'Description is required' }));
      return;
    }
    const itemWithId = {
      ...newItem,
      id: `new_${Date.now()}`,
      total: newItem.quantity * newItem.unitPrice,
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, itemWithId] }));
    setNewItem({ ...emptyPOItem });
    if (errors.newItem) {
      setErrors(prev => ({ ...prev, newItem: '' }));
    }
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.supplierId) {
      newErrors.supplierId = 'Supplier is required';
    }
    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const totals = calculateTotals(formData.items, formData.taxRate);
      const data: Partial<PurchaseOrder> = {
        supplierId: formData.supplierId,
        items: formData.items,
        taxRate: formData.taxRate,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        notes: formData.notes,
        expectedDelivery: formData.expectedDelivery || undefined,
      };
      await onSave(data);
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Are you sure you want to delete this purchase order?')) return;
    setSaving(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to delete' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const totals = calculateTotals(formData.items, formData.taxRate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {order ? `Edit Purchase Order ${order.poNumber}` : 'New Purchase Order'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={saving}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {errors.submit}
            </div>
          )}

          <div className="space-y-6">
            {/* Supplier Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier *
              </label>
              <select
                value={formData.supplierId}
                onChange={e => handleInputChange('supplierId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.supplierId ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={!!order}
              >
                <option value="">Select a supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.supplierId && <p className="mt-1 text-sm text-red-600">{errors.supplierId}</p>}
            </div>

            {/* Expected Delivery */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={formData.expectedDelivery}
                onChange={e => handleInputChange('expectedDelivery', e.target.value)}
                className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Line Items */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Line Items</h3>

              {/* Add new item form */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-3">Add New Item</h4>
                <div className="grid grid-cols-12 gap-3">
                  <input
                    type="text"
                    value={newItem.description}
                    onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description *"
                    className="col-span-4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="number"
                    value={newItem.quantity}
                    onChange={e => setNewItem(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                    placeholder="Qty"
                    min="1"
                    className="col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={newItem.unit}
                    onChange={e => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="Unit"
                    className="col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="number"
                    value={newItem.unitPrice}
                    onChange={e => setNewItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                    placeholder="Unit Price"
                    min="0"
                    step="0.01"
                    className="col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={addItem}
                    className="col-span-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
                  >
                    Add
                  </button>
                </div>
                {errors.newItem && <p className="mt-1 text-sm text-red-600">{errors.newItem}</p>}
              </div>

              {/* Items table */}
              {formData.items.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No items added yet</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.items.map((item, index) => (
                      <tr key={item.id || index}>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={e => handleItemChange(index, 'description', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            min="1"
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={e => handleItemChange(index, 'unit', e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={e => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-28 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.total.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal:</span>
                  <span className="font-medium">{totals.subtotal.toFixed(2)} TL</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Tax Rate (%):</span>
                  <input
                    type="number"
                    value={formData.taxRate}
                    onChange={e => handleInputChange('taxRate', parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 text-right"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax Amount:</span>
                  <span className="font-medium">{totals.taxAmount.toFixed(2)} TL</span>
                </div>
                <div className="flex justify-between text-lg border-t border-gray-200 pt-2">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold text-primary-600">{totals.total.toFixed(2)} TL</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={e => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Additional notes..."
              />
            </div>

            {/* Read-only info for existing orders */}
            {order && (
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">PO Number</label>
                  <p className="text-gray-900 font-medium">{order.poNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                  <p className="text-gray-900">{order.status}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Created</label>
                  <p className="text-gray-700">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString('tr-TR') : '-'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div>
            {order && onDelete && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Delete PO
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {saving ? 'Saving...' : 'Save Purchase Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
