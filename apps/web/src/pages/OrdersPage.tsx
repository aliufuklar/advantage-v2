import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Order, Quote } from '@/types';
import { OrderModal } from '@/components/OrderModal';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
  urgent: 'bg-red-600 text-white',
};

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrderForEInvoice, setSelectedOrderForEInvoice] = useState<Order | null>(null);
  const [creatingEInvoice, setCreatingEInvoice] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getOrders(),
      api.getQuotes(),
    ]).then(([ordersData, quotesData]) => {
      setOrders(ordersData as Order[]);
      setQuotes((quotesData as Quote[]).filter(q => q.status === 'approved'));
      setLoading(false);
    });
  }, []);

  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setModalOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const handleSaveOrder = async (orderData: Partial<Order>) => {
    try {
      if (selectedOrder) {
        const updated = await api.updateOrder(selectedOrder.id, orderData);
        setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated as Order : o));
      } else {
        const created = await api.createOrder(orderData);
        setOrders(prev => [...prev, created as Order]);
      }
      setModalOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Failed to save order:', error);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const updated = await api.updateOrder(orderId, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? updated as Order : o));
    } catch (error) {
      console.error('Failed to change status:', error);
    }
  };

  const handleSendEInvoice = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrderForEInvoice(order);
    setCreatingEInvoice(true);
    try {
      const einvoice = await api.createEInvoiceFromOrder(order.id);
      alert(`E-Fatura oluşturuldu: ${(einvoice as any).invoiceNumber}`);
      // Refresh orders to show einvoiceId
      const updated = await api.getOrders();
      setOrders(updated as Order[]);
    } catch (error) {
      console.error('Failed to create e-invoice:', error);
      alert('E-Fatura oluşturulamadı');
    } finally {
      setCreatingEInvoice(false);
      setSelectedOrderForEInvoice(null);
    }
  };

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  if (loading) return <div className="text-gray-500">Yükleniyor...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Siparişler</h1>
        <button
          onClick={handleCreateOrder}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          + Yeni Sipariş
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {['all', 'pending', 'in_progress', 'completed', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              statusFilter === status
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'Tümü' : status}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Başlık</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Toplam</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Öncelik</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bitiş Tarihi</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checklist</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-Fatura</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredOrders.map((order) => {
              const completedChecklist = order.checklist?.filter(i => i.completed).length || 0;
              const totalChecklist = order.checklist?.length || 0;
              const checklistProgress = totalChecklist > 0 ? (completedChecklist / totalChecklist) * 100 : 0;

              return (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleEditOrder(order)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.orderNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customerName || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.total.toFixed(2)} ₺</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={order.status}
                      onChange={e => {
                        e.stopPropagation();
                        handleStatusChange(order.id, e.target.value);
                      }}
                      onClick={e => e.stopPropagation()}
                      className={`px-2 py-1 text-xs rounded-full border-0 cursor-pointer ${getStatusBadge(order.status)}`}
                    >
                      {STATUS_TRANSITIONS[order.status]?.length > 0 ? (
                        STATUS_TRANSITIONS[order.status].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))
                      ) : (
                        <option value={order.status}>{order.status}</option>
                      )}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${PRIORITY_COLORS[order.priority] || PRIORITY_COLORS.normal}`}>
                      {order.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.dueDate ? new Date(order.dueDate).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {totalChecklist > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full"
                            style={{ width: `${checklistProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {completedChecklist}/{totalChecklist}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(order as any).einvoiceId ? (
                      <span className="text-xs text-green-600">{(order as any).einvoiceId}</span>
                    ) : (
                      <button
                        onClick={(e) => handleSendEInvoice(order, e)}
                        disabled={creatingEInvoice}
                        className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        {creatingEInvoice && selectedOrderForEInvoice?.id === order.id ? 'Oluşturuluyor...' : 'E-Fatura Gönder'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <OrderModal
        order={selectedOrder}
        quotes={quotes}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedOrder(null);
        }}
        onSave={handleSaveOrder}
      />
    </div>
  );
}

function getStatusBadge(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export default OrdersPage;
