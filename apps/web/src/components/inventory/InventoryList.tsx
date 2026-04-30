import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import type { Product, StockAlert } from '@/types';

interface InventoryListProps {
  onProductSelect?: (product: Product) => void;
  onAddProduct?: () => void;
  onStockMovement?: (product: Product) => void;
}

export function InventoryList({ onProductSelect, onAddProduct, onStockMovement }: InventoryListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, alertsData] = await Promise.all([
        api.getProducts() as Promise<Product[]>,
        api.getStockAlerts() as Promise<StockAlert[]>
      ]);
      setProducts(productsData);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  const locations = useMemo(() => {
    const locs = new Set(products.map(p => p.location).filter(Boolean));
    return Array.from(locs).sort();
  }, [products]);

  const alertProductIds = useMemo(() => {
    return new Set(alerts.map(a => a.productId));
  }, [alerts]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (search) {
        const searchLower = search.toLowerCase();
        if (!product.name.toLowerCase().includes(searchLower) &&
            !product.sku.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      if (categoryFilter && product.category !== categoryFilter) return false;
      if (locationFilter && product.location !== locationFilter) return false;
      if (showLowStock && !alertProductIds.has(product.id || '')) return false;
      return true;
    });
  }, [products, search, categoryFilter, locationFilter, showLowStock, alertProductIds]);

  const getStockStatus = (product: Product) => {
    const alert = alerts.find(a => a.productId === product.id);
    if (!alert) return 'ok';
    if (alert.alertLevel === 'critical') return 'critical';
    if (alert.alertLevel === 'warning') return 'low';
    return 'low';
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return 'bg-green-100 text-green-800';
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'ok': return 'OK';
      case 'low': return 'Dusuk';
      case 'critical': return 'Kritik';
      default: return 'Bilinmiyor';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Urun veya SKU ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Tum Kategoriler</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Tum Konumlar</option>
          {locations.map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showLowStock}
            onChange={(e) => setShowLowStock(e.target.checked)}
            className="rounded"
          />
          Dusuk Stoklu
        </label>
        <button
          onClick={onAddProduct}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          + Urun Ekle
        </button>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urun Adi</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Mevcut Stok</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Min Stok</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Konum</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Birim Maliyet</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Islemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  Urun bulunamadi
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const status = getStockStatus(product);
                return (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onProductSelect?.(product)}
                  >
                    <td className="px-4 py-2 text-sm text-gray-900 font-mono">{product.sku}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{product.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{product.category}</td>
                    <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                      {product.currentStock.toLocaleString('tr-TR')} {product.unit}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-500">
                      {product.minStock.toLocaleString('tr-TR')} {product.unit}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStockStatusColor(status)}`}>
                        {getStockStatusText(status)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">{product.location || '-'}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-500">
                      {product.unitCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </td>
                    <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onStockMovement?.(product)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Harekete Git
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-gray-500">
        Toplam {filteredProducts.length} urun gosteriliyor
      </div>
    </div>
  );
}
