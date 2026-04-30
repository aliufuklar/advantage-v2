import { useState } from 'react';
import { api } from '@/lib/api';
import type { BOM, BOMItem } from '@/types';

interface BOMEditorProps {
  bom?: BOM | null;
  onSave?: (bom: BOM) => void;
  onClose?: () => void;
}

export function BOMEditor({ bom, onSave, onClose }: BOMEditorProps) {
  const [name, setName] = useState(bom?.name || '');
  const [productId, setProductId] = useState(bom?.productId || '');
  const [productName, setProductName] = useState(bom?.productName || '');
  const [items, setItems] = useState<BOMItem[]>(bom?.items || []);
  const [saving, setSaving] = useState(false);

  const addItem = () => {
    setItems(prev => [
      ...prev,
      { productName: '', quantity: 1, unit: 'adet', unitCost: 0 }
    ]);
  };

  const updateItem = (index: number, updates: Partial<BOMItem>) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, ...updates } : item
    ));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

  const handleSave = async () => {
    if (!name) return;

    setSaving(true);
    try {
      let result;
      if (bom?.id) {
        result = await api.updateBOM(bom.id, { name, productId, productName, items });
      } else {
        result = await api.createBOM({ name, productId, productName, items });
      }
      if (onSave) onSave(result as BOM);
      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to save BOM:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-medium">
          {bom?.id ? 'Ürün Ağacını Düzenle' : 'Yeni Ürün Ağacı'}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ×
        </button>
      </div>

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ürün Ağacı Adı *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Ürün X Ürün Ağacı"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ürün Kodu
            </label>
            <input
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="Ürün ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ürün Adı
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Son ürün adı"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-gray-900">Bileşenler</h3>
          <button
            onClick={addItem}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            + Bileşen Ekle
          </button>
        </div>

        {items.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
            Henüz bileşen eklenmedi. "Bileşen Ekle" butonuna tıklayın.
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Bileşen Adı
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">
                    Miktar
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">
                    Birim
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">
                    Birim Maliyet
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">
                    Toplam
                  </th>
                  <th className="px-4 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => updateItem(index, { productName: e.target.value })}
                        placeholder="Bileşen adı"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(index, { unit: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="adet">adet</option>
                        <option value="kg">kg</option>
                        <option value="lt">lt</option>
                        <option value="m">m</option>
                        <option value="m²">m²</option>
                        <option value="m³">m³</option>
                        <option value="paket">paket</option>
                        <option value="kutu">kutu</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.unitCost}
                        onChange={(e) => updateItem(index, { unitCost: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {(item.quantity * item.unitCost).toFixed(2)} ₺
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <div className="text-lg font-semibold text-gray-900">
          Toplam Maliyet: {totalCost.toFixed(2)} ₺
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={!name || saving}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BOMEditor;
