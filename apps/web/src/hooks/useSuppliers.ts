import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Supplier } from '@/types';

interface UseSuppliersReturn {
  suppliers: Supplier[];
  loading: boolean;
  error: string | null;
  fetchSuppliers: (params?: { search?: string; page?: number; pageSize?: number }) => Promise<void>;
  createSupplier: (data: Partial<Supplier>) => Promise<Supplier>;
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<Supplier>;
  deleteSupplier: (id: string) => Promise<void>;
  addContact: (supplierId: string, contact: Partial<Supplier['contacts'][0]>) => Promise<void>;
  removeContact: (supplierId: string, contactId: string) => Promise<void>;
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

export function useSuppliers(): UseSuppliersReturn {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchSuppliers = useCallback(async (params?: { search?: string; page?: number; pageSize?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSuppliers({
        page: params?.page || currentPage,
        pageSize: params?.pageSize || pageSize,
        search: params?.search,
      }) as Supplier[];
      setSuppliers(data);
      if (params?.page) setCurrentPage(params.page);
      if (params?.pageSize) setPageSize(params.pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const createSupplier = async (data: Partial<Supplier>) => {
    const result = await api.createSupplier(data);
    await fetchSuppliers();
    return result as Supplier;
  };

  const updateSupplier = async (id: string, data: Partial<Supplier>) => {
    const result = await api.updateSupplier(id, data);
    await fetchSuppliers();
    return result as Supplier;
  };

  const deleteSupplier = async (id: string) => {
    await api.deleteSupplier(id);
    await fetchSuppliers();
  };

  const addContact = async (supplierId: string, contact: Partial<Supplier['contacts'][0]>) => {
    await api.addSupplierContact(supplierId, contact);
    await fetchSuppliers();
  };

  const removeContact = async (supplierId: string, contactId: string) => {
    await api.deleteSupplierContact(supplierId, contactId);
    await fetchSuppliers();
  };

  return {
    suppliers,
    loading,
    error,
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    addContact,
    removeContact,
    totalCount,
    currentPage,
    pageSize,
  };
}
