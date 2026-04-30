import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Product, StockAlert, InventoryValuation, StockTake } from '@/types';
import { InventoryList } from '@/components/inventory/InventoryList';
import { StockMovementModal } from '@/components/inventory/StockMovementModal';
import { StockAlertsWidget } from '@/components/inventory/StockAlertsWidget';

type Tab = 'list' | 'alerts' | 'stocktake' | 'movements';

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [valuation, setValuation] = useState<InventoryValuation | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockMovementProduct, setStockMovementProduct] = useState<Product | null>(null);
  const [showStockMovementModal, setShowStockMovementModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [stocktakes, setStocktakes] = useState<StockTake[]>([]);
  const [currentStocktake, setCurrentStocktake] = useState<StockTake | null>(null);
  const [stocktakeLoading, setStocktakeLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [alertsData, valuationData] = await Promise.all([
        api.getStockAlerts() as Promise<StockAlert[]>,
        api.getInventoryValuation() as Promise<InventoryValuation>
      ]);
      setAlerts(alertsData);
      setValuation(valuationData);
    } catch (error) {
      console.error('Failed to load inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleStockMovement = (product: Product) => {
    setStockMovementProduct(product);
    setShowStockMovementModal(true);
  };

  const handleMovementRecorded = () => {
    loadData();
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setShowProductModal(true);
  };

  const handleStocktakeCreate = async () => {
    try {
      await api.createStocktake({
        reference: `ST-${Date.now()}`,
        notes: ''
      });
      await loadStocktakes();
    } catch (error) {
      console.error('Failed to create stocktake:', error);
    }
  };

  const loadStocktakes = async () => {
    try {
      const data = await api.getStocktakes() as StockTake[];
      setStocktakes(data);
    } catch (error) {
      console.error('Failed to load stocktakes:', error);
    }
  };

  const handleStocktakeSelect = async (stocktake: StockTake) => {
    try {
      const data = await api.getStocktake(stocktake.id!) as StockTake;
      setCurrentStocktake(data);
    } catch (error) {
      console.error('Failed to load stocktake:', error);
    }
  };

  const handleStocktakeCountUpdate = async (itemIndex: number, countedQuantity: number) => {
    if (!currentStocktake) return;
    const updatedItems = [...currentStocktake.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      countedQuantity,
      variance: countedQuantity - updatedItems[itemIndex].systemQuantity
    };
    setCurrentStocktake({ ...currentStocktake, items: updatedItems });
  };

  const handleStocktakeSave = async () => {
    if (!currentStocktake) return;
    try {
      await api.updateStocktake(currentStocktake.id!, currentStocktake);
    } catch (error) {
      console.error('Failed to save stocktake:', error);
    }
  };

  const handleStocktakeComplete = async () => {
    if (!currentStocktake) return;
    setStocktakeLoading(true);
    try {
      await api.completeStocktake(currentStocktake.id!);
      setCurrentStocktake(null);
      await loadStocktakes();
      loadData();
    } catch (error) {
      console.error('Failed to complete stocktake:', error);
    } finally {
      setStocktakeLoading(false);
    }
  };

  const tabs = [
    { id: 'list' as Tab, label: 'Urun Listesi' },
    { id: 'alerts' as Tab, label: 'Stok Uyarilari' },
    { id: 'stocktake' as Tab, label: 'Sayim' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Envanter</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.id === 'alerts' && alerts.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                  {alerts.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Valuation Summary */}
      {valuation && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium">Toplam Deger</div>
            <div className="text-2xl font-bold text-blue-900">
              {valuation.totalValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-600 font-medium">Toplam Urun Cesidi</div>
            <div className="text-2xl font-bold text-green-900">{valuation.totalProducts}</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-sm text-purple-600 font-medium">Toplam Stok Birimi</div>
            <div className="text-2xl font-bold text-purple-900">
              {valuation.totalUnits.toLocaleString('tr-TR')}
            </div>
          </div>
        </div>
      )}

      {/* Stock Alerts Widget */}
      {activeTab !== 'alerts' && alerts.length > 0 && (
        <div className="mb-6">
          <StockAlertsWidget compact />
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'list' && (
        <InventoryList
          onProductSelect={handleProductSelect}
          onAddProduct={handleAddProduct}
          onStockMovement={handleStockMovement}
        />
      )}

      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StockAlertsWidget />
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Urun Yonetimi</h3>
            {selectedProduct ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">{selectedProduct.name}</h4>
                    <p className="text-sm text-gray-500">SKU: {selectedProduct.sku}</p>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    x
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Kategori:</span>
                    <span className="ml-2 text-gray-900">{selectedProduct.category}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Birim:</span>
                    <span className="ml-2 text-gray-900">{selectedProduct.unit}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Mevcut Stok:</span>
                    <span className="ml-2 text-gray-900">{selectedProduct.currentStock.toLocaleString('tr-TR')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Min Stok:</span>
                    <span className="ml-2 text-gray-900">{selectedProduct.minStock.toLocaleString('tr-TR')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Birim Maliyet:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedProduct.unitCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Konum:</span>
                    <span className="ml-2 text-gray-900">{selectedProduct.location || '-'}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => handleStockMovement(selectedProduct)}
                    className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    Stok Hareketi
                  </button>
                  <button
                    onClick={() => setShowProductModal(true)}
                    className="flex-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Duzenle
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>Ozellikleri gormek icin bir urun secin</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'stocktake' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-gray-700">Sayimlar</h3>
                <button
                  onClick={handleStocktakeCreate}
                  className="px-3 py-1.5 text-xs text-white bg-green-600 rounded hover:bg-green-700"
                >
                  + Yeni Sayim
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stocktakes.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Henuz sayim yok</p>
                ) : (
                  stocktakes.map(st => (
                    <button
                      key={st.id}
                      onClick={() => handleStocktakeSelect(st)}
                      className={`w-full p-3 text-left rounded-lg border ${
                        currentStocktake?.id === st.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-sm">{st.reference}</div>
                      <div className="text-xs text-gray-500">{st.date}</div>
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                        st.status === 'completed' ? 'bg-green-100 text-green-800' :
                        st.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {st.status === 'completed' ? 'Tamamlandi' :
                         st.status === 'cancelled' ? 'Iptal' : 'Devam Ediyor'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {currentStocktake ? (
              <div className="bg-white rounded-lg shadow">
                <div className="px-4 py-3 border-b flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{currentStocktake.reference}</h3>
                    <p className="text-sm text-gray-500">{currentStocktake.date}</p>
                  </div>
                  <div className="flex gap-2">
                    {currentStocktake.status === 'in_progress' && (
                      <>
                        <button
                          onClick={handleStocktakeSave}
                          className="px-3 py-1.5 text-xs text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
                        >
                          Kaydet
                        </button>
                        <button
                          onClick={handleStocktakeComplete}
                          disabled={stocktakeLoading}
                          className="px-3 py-1.5 text-xs text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {stocktakeLoading ? 'Tamamlaniyor...' : 'Tamamla'}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setCurrentStocktake(null)}
                      className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
                <div className="p-4 max-h-[500px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Urun Adi</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Sistem Miktari</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Sayilan Miktar</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Fark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {currentStocktake.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-sm font-mono">{item.sku}</td>
                          <td className="px-3 py-2 text-sm">{item.productName}</td>
                          <td className="px-3 py-2 text-sm text-right">{item.systemQuantity}</td>
                          <td className="px-3 py-2 text-right">
                            {currentStocktake.status === 'in_progress' ? (
                              <input
                                type="number"
                                min="0"
                                value={item.countedQuantity}
                                onChange={(e) => handleStocktakeCountUpdate(idx, parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded"
                              />
                            ) : (
                              <span className="text-sm">{item.countedQuantity}</span>
                            )}
                          </td>
                          <td className={`px-3 py-2 text-sm text-right font-medium ${
                            item.variance === 0 ? 'text-green-600' :
                            item.variance > 0 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {item.variance > 0 ? '+' : ''}{item.variance}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                <p>Sayim gormek icin soldan bir sayim secin</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stock Movement Modal */}
      <StockMovementModal
        isOpen={showStockMovementModal}
        onClose={() => {
          setShowStockMovementModal(false);
          setStockMovementProduct(null);
        }}
        product={stockMovementProduct}
        onMovementRecorded={handleMovementRecorded}
      />

      {/* Product Modal */}
      <ProductModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSaved={() => {
          setShowProductModal(false);
          setSelectedProduct(null);
          loadData();
        }}
      />
    </div>
  );
}

// Product Modal Component
interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSaved: () => void;
}

function ProductModal({ isOpen, onClose, product, onSaved }: ProductModalProps) {
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'general',
    unit: 'adet',
    minStock: 0,
    currentStock: 0,
    location: '',
    unitCost: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku,
        name: product.name,
        category: product.category,
        unit: product.unit,
        minStock: product.minStock,
        currentStock: product.currentStock,
        location: product.location || '',
        unitCost: product.unitCost,
      });
    } else {
      setFormData({
        sku: '',
        name: '',
        category: 'general',
        unit: 'adet',
        minStock: 0,
        currentStock: 0,
        location: '',
        unitCost: 0,
      });
    }
    setError('');
  }, [product, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (product?.id) {
        await api.updateProduct(product.id, formData);
      } else {
        await api.createProduct(formData);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Islem basarisiz');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium">
            {product ? 'Urun Duzenle' : 'Yeni Urun'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Urun Adi</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birim</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Stok</label>
              <input
                type="number"
                min="0"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birim Maliyet</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mevcut Stok</label>
              <input
                type="number"
                min="0"
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Konum</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded">
              Iptal
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm text-white bg-blue-600 rounded disabled:opacity-50">
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
