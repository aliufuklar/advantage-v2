import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Product } from '@/types';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onMovementRecorded?: () => void;
}

export function StockMovementModal({ isOpen, onClose, product, onMovementRecorded }: StockMovementModalProps) {
  const [type, setType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchNumber, setBatchNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setQuantity('');
      setReason('');
      setReference('');
      setBatchNumber('');
      setType('in');
      setDate(new Date().toISOString().split('T')[0]);
      setError('');
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setError('');
    setLoading(true);

    try {
      const movement = {
        productId: product.id,
        type,
        quantity: parseFloat(quantity),
        reason,
        reference: reference || undefined,
        date,
        batchNumber: batchNumber || undefined,
      };

      await api.createStockMovement(movement);
      onMovementRecorded?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hareket kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const typeLabels = {
    in: 'Giris (Stok Girisi)',
    out: 'Cikis (Stok Cikisi)',
    adjustment: 'Duzeltme'
  };

  const reasonOptions = type === 'in'
    ? ['Tedarikci siparisi', 'Geri donus', 'Duzeltme girisi', 'Transfer girisi']
    : type === 'out'
    ? ['Satis', 'Transfer', 'Iade', 'Kayip/Zayi', 'Duzeltme cikisi']
    : ['Sayim duzeltmesi', 'Kayip/Zayi', 'Diger duzeltme'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Stok Hareketi</h3>
          {product && (
            <p className="text-sm text-gray-500 mt-1">
              {product.name} ({product.sku})
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hareket Turu</label>
            <div className="grid grid-cols-3 gap-2">
              {(['in', 'out', 'adjustment'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3 py-2 text-sm rounded-md border ${
                    type === t
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {typeLabels[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Miktar</label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Neden/Sebep</label>
            <select
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Seciniz...</option>
              {reasonOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referans (Istege bagli)</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Siparis no, fatura no, vb."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parti Numarasi (Istege bagli)</label>
            <input
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Parti/seri numarasi"
            />
          </div>

          {product && type !== 'adjustment' && (
            <div className={`p-3 rounded-md text-sm ${
              type === 'in' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
            }`}>
              <div className="font-medium">Mevcut Stok: {product.currentStock.toLocaleString('tr-TR')} {product.unit}</div>
              <div className="text-xs mt-1">
                {type === 'in' ? 'Islem sonrasi yeni stok: ' : 'Islem sonrasi yeni stok: '}
                {(type === 'in'
                  ? product.currentStock + parseFloat(quantity || '0')
                  : product.currentStock - parseFloat(quantity || '0')
                ).toLocaleString('tr-TR')} {product.unit}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Iptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
