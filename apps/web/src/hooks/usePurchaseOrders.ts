import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { PurchaseOrder, Supplier } from '@/types';

interface UsePurchaseOrdersReturn {
  orders: PurchaseOrder[];
  loading: boolean;
  error: string | null;
  fetchOrders: (params?: { search?: string; status?: string; supplierId?: string; page?: number; pageSize?: number }) => Promise<void>;
  createOrder: (data: Partial<PurchaseOrder>) => Promise<PurchaseOrder>;
  updateOrder: (id: string, data: Partial<PurchaseOrder>) => Promise<PurchaseOrder>;
  deleteOrder: (id: string) => Promise<void>;
  updateStatus: (id: string, status: string) => Promise<void>;
  receiveItems: (id: string, items: Array<{ itemId: string; receivedQuantity: number }>) => Promise<void>;
  currentPage: number;
  pageSize: number;
}

export function usePurchaseOrders(): UsePurchaseOrdersReturn {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchOrders = useCallback(async (params?: { search?: string; status?: string; supplierId?: string; page?: number; pageSize?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPurchaseOrders({
        page: params?.page || currentPage,
        pageSize: params?.pageSize || pageSize,
        search: params?.search,
        status: params?.status,
        supplierId: params?.supplierId,
      }) as PurchaseOrder[];
      setOrders(data);
      if (params?.page) setCurrentPage(params.page);
      if (params?.pageSize) setPageSize(params.pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const createOrder = async (data: Partial<PurchaseOrder>) => {
    const result = await api.createPurchaseOrder(data);
    await fetchOrders();
    return result as PurchaseOrder;
  };

  const updateOrder = async (id: string, data: Partial<PurchaseOrder>) => {
    const result = await api.updatePurchaseOrder(id, data);
    await fetchOrders();
    return result as PurchaseOrder;
  };

  const deleteOrder = async (id: string) => {
    await api.deletePurchaseOrder(id);
    await fetchOrders();
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updatePOStatus(id, status);
    await fetchOrders();
  };

  const receiveItems = async (id: string, items: Array<{ itemId: string; receivedQuantity: number }>) => {
    await api.receivePOItems(id, items);
    await fetchOrders();
  };

  return {
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
    pageSize,
  };
}

interface UseSuppliersSimpleReturn {
  suppliers: Supplier[];
  loading: boolean;
  fetchSuppliers: () => Promise<void>;
}

export function useSuppliersSimple(): UseSuppliersSimpleReturn {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSuppliers({ pageSize: 100 }) as Supplier[];
      setSuppliers(data);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  return {
    suppliers,
    loading,
    fetchSuppliers,
  };
}
