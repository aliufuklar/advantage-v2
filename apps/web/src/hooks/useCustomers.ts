import { useState } from 'react';
import { api } from '@/lib/api';
import type { Customer } from '@/types';

interface UseCustomersReturn {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  fetchCustomers: () => Promise<void>;
  createCustomer: (data: Omit<Customer, 'id' | 'customerNumber' | 'balance' | 'isActive' | 'createdAt'>) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
}

export function useCustomers(): UseCustomersReturn {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCustomers();
      setCustomers(data as Customer[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const createCustomer = async (data: Omit<Customer, 'id' | 'customerNumber' | 'balance' | 'isActive' | 'createdAt'>) => {
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
  };
}