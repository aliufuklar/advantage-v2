import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SupplierQuote, QuoteComparison } from '@/types';

interface UseSupplierQuotesReturn {
  quotes: SupplierQuote[];
  loading: boolean;
  error: string | null;
  fetchQuotes: (params?: { search?: string; supplierId?: string; productId?: string; status?: string; page?: number; pageSize?: number }) => Promise<void>;
  createQuote: (data: Partial<SupplierQuote>) => Promise<SupplierQuote>;
  updateQuote: (id: string, data: Partial<SupplierQuote>) => Promise<SupplierQuote>;
  deleteQuote: (id: string) => Promise<void>;
  updateQuoteStatus: (id: string, status: string) => Promise<void>;
  compareQuotes: (productId: string) => Promise<QuoteComparison>;
  convertToPO: (quoteId: string) => Promise<void>;
  currentPage: number;
  pageSize: number;
}

export function useSupplierQuotes(): UseSupplierQuotesReturn {
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchQuotes = useCallback(async (params?: { search?: string; supplierId?: string; productId?: string; status?: string; page?: number; pageSize?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSupplierQuotes({
        page: params?.page || currentPage,
        pageSize: params?.pageSize || pageSize,
        search: params?.search,
        supplierId: params?.supplierId,
        productId: params?.productId,
        status: params?.status,
      }) as SupplierQuote[];
      setQuotes(data);
      if (params?.page) setCurrentPage(params.page);
      if (params?.pageSize) setPageSize(params.pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch supplier quotes');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const createQuote = async (data: Partial<SupplierQuote>) => {
    const result = await api.createSupplierQuote(data);
    await fetchQuotes();
    return result as SupplierQuote;
  };

  const updateQuote = async (id: string, data: Partial<SupplierQuote>) => {
    const result = await api.updateSupplierQuote(id, data);
    await fetchQuotes();
    return result as SupplierQuote;
  };

  const deleteQuote = async (id: string) => {
    await api.deleteSupplierQuote(id);
    await fetchQuotes();
  };

  const updateQuoteStatus = async (id: string, status: string) => {
    await api.updateSupplierQuoteStatus(id, status);
    await fetchQuotes();
  };

  const compareQuotes = async (productId: string) => {
    const result = await api.compareSupplierQuotes(productId);
    return result as QuoteComparison;
  };

  const convertToPO = async (quoteId: string) => {
    await api.convertQuoteToPO(quoteId);
    await fetchQuotes();
  };

  return {
    quotes,
    loading,
    error,
    fetchQuotes,
    createQuote,
    updateQuote,
    deleteQuote,
    updateQuoteStatus,
    compareQuotes,
    convertToPO,
    currentPage,
    pageSize,
  };
}
