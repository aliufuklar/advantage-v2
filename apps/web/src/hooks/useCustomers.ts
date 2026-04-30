import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Customer } from '@/types';

interface UseCustomersReturn {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  fetchCustomers: (params?: { search?: string; customerType?: string; page?: number; pageSize?: number }) => Promise<void>;
  createCustomer: (data: Partial<Customer>) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

export function useCustomers(): UseCustomersReturn {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchCustomers = useCallback(async (params?: { search?: string; customerType?: string; page?: number; pageSize?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCustomers({
        page: params?.page || currentPage,
        pageSize: params?.pageSize || pageSize,
        search: params?.search,
        customerType: params?.customerType,
      }) as Customer[];
      setCustomers(data);
      // Update pagination state
      if (params?.page) setCurrentPage(params.page);
      if (params?.pageSize) setPageSize(params.pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const createCustomer = async (data: Partial<Customer>) => {
    const result = await api.createCustomer(data);
    await fetchCustomers();
    return result as Customer;
  };

  const updateCustomer = async (id: string, data: Partial<Customer>) => {
    const result = await api.updateCustomer(id, data);
    await fetchCustomers();
    return result as Customer;
  };

  const deleteCustomer = async (id: string) => {
    await api.deleteCustomer(id);
    await fetchCustomers();
  };

  return {
    customers,
    loading,
    error,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    totalCount,
    currentPage,
    pageSize,
  };
}