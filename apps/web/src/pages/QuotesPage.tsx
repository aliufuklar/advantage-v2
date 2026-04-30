import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Quote, Customer, QuotePDFData } from '@/types';
import { QuoteModal } from '@/components/quotes/QuoteModal';
import { PDFPreview } from '@/components/quotes/PDFPreview';

export function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [pdfData, setPdfData] = useState<QuotePDFData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [quotesData, customersData] = await Promise.all([
        api.getQuotes() as Promise<Quote[]>,
        api.getCustomers() as Promise<{ customers: Customer[] }>,
      ]);
      setQuotes(quotesData);
      setCustomers(customersData.customers || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuote = () => {
    setEditingQuote(null);
    setModalOpen(true);
  };

  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote);
    setModalOpen(true);
  };

  const handleSaveQuote = async (savedQuote: Quote) => {
    if (editingQuote) {
      setQuotes(quotes.map(q => q.id === savedQuote.id ? savedQuote : q));
    } else {
      setQuotes([savedQuote, ...quotes]);
    }
  };

  const handleCopyQuote = async (quoteId: string) => {
    setActionLoading(quoteId);
    try {
      const copied = await api.copyQuote(quoteId) as Quote;
      setQuotes([copied, ...quotes]);
    } catch (error) {
      console.error('Failed to copy quote:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (quoteId: string) => {
    setActionLoading(quoteId);
    try {
      const approved = await api.approveQuote(quoteId) as Quote;
      setQuotes(quotes.map(q => q.id === approved.id ? approved : q));
    } catch (error) {
      console.error('Failed to approve quote:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (quoteId: string) => {
    const reason = prompt('Red nedeni:');
    if (reason === null) return;
    setActionLoading(quoteId);
    try {
      const rejected = await api.rejectQuote(quoteId, reason) as Quote;
      setQuotes(quotes.map(q => q.id === rejected.id ? rejected : q));
    } catch (error) {
      console.error('Failed to reject quote:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvertToOrder = async (quoteId: string) => {
    if (!confirm('Bu teklifi siparişe dönüştürmek istediğinize emin misiniz?')) return;
    setActionLoading(quoteId);
    try {
      const result = await api.convertQuoteToOrder(quoteId) as { orderId: string; orderNumber: string };
      const updatedQuote = quotes.find(q => q.id === quoteId);
      if (updatedQuote) {
        setQuotes(quotes.map(q => q.id === quoteId ? { ...q, orderId: result.orderId } : q));
      }
      alert(`Sipariş oluşturuldu: ${result.orderNumber}`);
    } catch (error) {
      console.error('Failed to convert to order:', error);
      alert('Dönüştürme başarısız: ' + (error as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePreviewPDF = async (quoteId: string) => {
    try {
      const data = await api.getQuotePDFData(quoteId) as QuotePDFData;
      setPdfData(data);
    } catch (error) {
      console.error('Failed to load PDF data:', error);
    }
  };

  const handleDelete = async (quoteId: string) => {
    if (!confirm('Bu teklifi silmek istediğinize emin misiniz?')) return;
    setActionLoading(quoteId);
    try {
      await api.deleteQuote(quoteId);
      setQuotes(quotes.filter(q => q.id !== quoteId));
    } catch (error) {
      console.error('Failed to delete quote:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    const labels = {
      draft: 'Taslak',
      pending: 'Onay Bekliyor',
      approved: 'Onaylandı',
      rejected: 'Reddedildi',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${classes[status as keyof typeof classes] || classes.draft}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (loading) return <div className="text-gray-500">Yükleniyor...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Teklifler</h1>
        <button
          onClick={handleCreateQuote}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          + Yeni Teklif
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teklif No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Başlık</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Toplam</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Geçerlilik</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {quotes.map((quote) => (
              <tr key={quote.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {quote.quoteNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {quote.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {quote.customerName || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {quote.total.toFixed(2)} {quote.currency === 'TRY' ? '₺' : quote.currency === 'EUR' ? '€' : '$'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(quote.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {quote.validUntil || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex justify-end items-center space-x-1">
                    <button
                      onClick={() => handlePreviewPDF(quote.id)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="PDF Önizleme"
                    >
                      📄
                    </button>
                    <button
                      onClick={() => handleEditQuote(quote)}
                      className="p-1 text-gray-600 hover:text-gray-800"
                      title="Düzenle"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleCopyQuote(quote.id)}
                      disabled={actionLoading === quote.id}
                      className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                      title="Kopyala"
                    >
                      📋
                    </button>
                    {quote.status !== 'approved' && (
                      <>
                        <button
                          onClick={() => handleApprove(quote.id)}
                          disabled={actionLoading === quote.id || quote.status === 'rejected'}
                          className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                          title="Onayla"
                        >
                          ✅
                        </button>
                        <button
                          onClick={() => handleReject(quote.id)}
                          disabled={actionLoading === quote.id}
                          className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                          title="Reddet"
                        >
                          ❌
                        </button>
                      </>
                    )}
                    {quote.status === 'approved' && !quote.orderId && (
                      <button
                        onClick={() => handleConvertToOrder(quote.id)}
                        disabled={actionLoading === quote.id}
                        className="p-1 text-purple-600 hover:text-purple-800 disabled:opacity-50"
                        title="Siparişe Dönüştür"
                      >
                        📦
                      </button>
                    )}
                    {quote.orderId && (
                      <span className="text-xs text-purple-600" title="Siparişe dönüştürüldü">
                        📦
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(quote.id)}
                      disabled={actionLoading === quote.id}
                      className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                      title="Sil"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {quotes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Henüz teklif bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <QuoteModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveQuote}
        quote={editingQuote}
        customers={customers}
      />

      {pdfData && (
        <PDFPreview
          data={pdfData}
          onClose={() => setPdfData(null)}
        />
      )}
    </div>
  );
}