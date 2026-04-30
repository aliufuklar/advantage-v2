import { useEffect, useState } from 'react';
import { usePurchaseOrders, useSuppliersSimple } from '@/hooks';
import { PurchaseOrderModal } from '@/components/purchasing/PurchaseOrderModal';
import type { PurchaseOrder } from '@/types';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  partial: 'bg-yellow-100 text-yellow-800',
  received: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partial',
  received: 'Received',
  cancelled: 'Cancelled',
};

export function PurchaseOrdersPage() {
  const {
    orders,
    loading,
    error,
    fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    updateStatus,
    receiveItems,
    currentPage,
  } = usePurchaseOrders();

  const { suppliers } = useSuppliersSimple();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedOrderForReceive, setSelectedOrderForReceive] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchOrders({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      page: 1,
      pageSize: 20,
    });
  }, [debouncedSearch, statusFilter, fetchOrders]);

  const handleOpenModal = (order?: PurchaseOrder) => {
    setSelectedOrder(order || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleSave = async (data: Partial<PurchaseOrder>) => {
    setSaving(true);
    try {
      if (selectedOrder) {
        await updateOrder(selectedOrder.id, data);
      } else {
        await createOrder(data);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      await deleteOrder(selectedOrder.id);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await updateStatus(orderId, newStatus);
  };

  const handleReceiveClick = (order: PurchaseOrder) => {
    setSelectedOrderForReceive(order);
    setReceiveModalOpen(true);
  };

  const handleReceiveSave = async (items: Array<{ itemId: string; receivedQuantity: number }>) => {
    if (!selectedOrderForReceive) return;
    setSaving(true);
    try {
      await receiveItems(selectedOrderForReceive.id, items);
    } finally {
      setSaving(false);
      setReceiveModalOpen(false);
      setSelectedOrderForReceive(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchOrders({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      page: newPage,
      pageSize: 20,
    });
  };

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || supplierId;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  const statusTabs = [
    { id: '', label: 'All' },
    { id: 'draft', label: 'Draft' },
    { id: 'sent', label: 'Sent' },
    { id: 'partial', label: 'Partial' },
    { id: 'received', label: 'Received' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Purchase Order
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-4">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by PO number..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Status tabs */}
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              {statusTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    statusFilter === tab.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center">
              <svg className="animate-spin h-6 w-6 text-primary-600 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-gray-500">Loading purchase orders...</span>
            </div>
          </div>
        ) : error ? (
          <div className="p-4 text-red-600 bg-red-50">
            Error: {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery || statusFilter
              ? 'No purchase orders found matching your criteria'
              : 'No purchase orders yet. Create your first PO!'}
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order: PurchaseOrder) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleOpenModal(order)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.poNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.supplierName || getSupplierName(order.supplierId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.items.length} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {order.total.toFixed(2)} TL
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[order.status] || 'bg-gray-100 text-gray-800'
                      }`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.expectedDelivery)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {order.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(order.id, 'sent')}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Send
                          </button>
                        )}
                        {['sent', 'partial'].includes(order.status) && (
                          <button
                            onClick={() => handleReceiveClick(order)}
                            className="text-green-600 hover:text-green-800 text-xs"
                          >
                            Receive
                          </button>
                        )}
                        {order.status !== 'received' && order.status !== 'cancelled' && (
                          <button
                            onClick={() => handleStatusChange(order.id, 'cancelled')}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {orders.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Page {currentPage}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={orders.length < 20}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <PurchaseOrderModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        order={selectedOrder}
        suppliers={suppliers}
        onSave={handleSave}
        onDelete={selectedOrder ? handleDelete : undefined}
        isLoading={saving}
      />

      {/* Receive Modal */}
      {selectedOrderForReceive && (
        <ReceiveItemsModal
          isOpen={receiveModalOpen}
          onClose={() => {
            setReceiveModalOpen(false);
            setSelectedOrderForReceive(null);
          }}
          order={selectedOrderForReceive}
          onSave={handleReceiveSave}
          isLoading={saving}
        />
      )}
    </div>
  );
}

// Receive Items Modal Component
interface ReceiveItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder;
  onSave: (items: Array<{ itemId: string; receivedQuantity: number }>) => Promise<void>;
  isLoading?: boolean;
}

function ReceiveItemsModal({ isOpen, onClose, order, onSave, isLoading }: ReceiveItemsModalProps) {
  const [items, setItems] = useState<Array<{ itemId: string; receivedQuantity: number }>>([]);

  useEffect(() => {
    if (isOpen && order) {
      setItems(order.items.map(item => ({
        itemId: item.id || '',
        receivedQuantity: item.quantity - item.receivedQuantity,
      })));
    }
  }, [isOpen, order]);

  const handleQuantityChange = (index: number, value: number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, receivedQuantity: value } : item
    ));
  };

  const handleSubmit = async () => {
    await onSave(items);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Receive Items - {order.poNumber}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">This Delivery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {order.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.quantity} {item.unit}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.receivedQuantity} {item.unit}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      max={item.quantity - item.receivedQuantity}
                      value={items[index]?.receivedQuantity || 0}
                      onChange={e => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Receive Items'}
          </button>
        </div>
      </div>
    </div>
  );
}
