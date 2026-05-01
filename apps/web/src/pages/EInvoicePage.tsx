import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { EInvoice, EInvoiceSettings } from '@/types';
import { InvoiceForm } from '@/components/einvoice/InvoiceForm';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  read: 'bg-green-600 text-white',
  error: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  draft: ' Taslak',
  sent: ' Gönderildi',
  delivered: ' Teslim Edildi',
  read: ' Okundu',
  error: ' Hata',
};

export function EInvoicePage() {
  const [eInvoices, setEInvoices] = useState<EInvoice[]>([]);
  const [settings, setSettings] = useState<EInvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<EInvoice | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getEInvoices(),
      api.getEInvoiceSettings(),
    ]).then(([einvoicesData, settingsData]) => {
      setEInvoices(einvoicesData as EInvoice[]);
      setSettings(settingsData as EInvoiceSettings);
      setLoading(false);
    });
  }, []);

  const handleCreateInvoice = () => {
    setEditingInvoice(null);
    setShowForm(true);
  };

  const handleEditInvoice = (invoice: EInvoice) => {
    setEditingInvoice(invoice);
    setShowForm(true);
  };

  const handleSaveInvoice = async (invoiceData: Partial<EInvoice>) => {
    try {
      if (editingInvoice) {
        const updated = await api.updateEInvoice(editingInvoice.id, invoiceData);
        setEInvoices(prev => prev.map(i => i.id === editingInvoice.id ? updated as EInvoice : i));
      } else {
        const created = await api.createEInvoice(invoiceData);
        setEInvoices(prev => [created as EInvoice, ...prev]);
      }
      setShowForm(false);
      setEditingInvoice(null);
    } catch (error) {
      console.error('Failed to save invoice:', error);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    setSendingId(invoiceId);
    try {
      const updated = await api.sendEInvoice(invoiceId);
      setEInvoices(prev => prev.map(i => i.id === invoiceId ? updated as EInvoice : i));
    } catch (error) {
      console.error('Failed to send invoice:', error);
    } finally {
      setSendingId(null);
    }
  };

  const handleSimulateDelivery = async (invoiceId: string) => {
    try {
      const updated = await api.simulateDelivery(invoiceId);
      setEInvoices(prev => prev.map(i => i.id === invoiceId ? updated as EInvoice : i));
    } catch (error) {
      console.error('Failed to simulate delivery:', error);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Bu e-faturayı silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteEInvoice(invoiceId);
      setEInvoices(prev => prev.filter(i => i.id !== invoiceId));
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    }
  };

  const handleSaveSettings = async (newSettings: EInvoiceSettings) => {
    try {
      const updated = await api.updateEInvoiceSettings(newSettings);
      setSettings(updated as EInvoiceSettings);
      alert('Ayarlar kaydedildi');
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const filteredInvoices = statusFilter === 'all'
    ? eInvoices
    : eInvoices.filter(i => i.status === statusFilter);

  if (loading) return <div className="text-gray-500">Yükleniyor...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">E-Fatura</h1>
        <button
          onClick={handleCreateInvoice}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          + Yeni Fatura
        </button>
      </div>

      {/* Settings Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">E-Fatura Ayarları</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Sağlayıcı</label>
            <select
              value={settings?.provider || 'parasut'}
              onChange={e => setSettings(prev => prev ? { ...prev, provider: e.target.value } : null)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="parasut">Paraşüt</option>
              <option value="kolaysoft">Kolaysoft</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Şirket Unvanı</label>
            <input
              type="text"
              value={settings?.companyTitle || ''}
              onChange={e => setSettings(prev => prev ? { ...prev, companyTitle: e.target.value } : null)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="Şirket adınız..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Vergi Kimlik Numarası</label>
            <input
              type="text"
              value={settings?.taxId || ''}
              onChange={e => setSettings(prev => prev ? { ...prev, taxId: e.target.value } : null)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="1234567890"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Adres</label>
            <input
              type="text"
              value={settings?.address || ''}
              onChange={e => setSettings(prev => prev ? { ...prev, address: e.target.value } : null)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="Adres..."
            />
          </div>
        </div>
        <button
          onClick={() => settings && handleSaveSettings(settings)}
          className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >
          Ayarları Kaydet
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {['all', 'draft', 'sent', 'delivered', 'read', 'error'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              statusFilter === status
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'Tümü' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fatura No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alıcı</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vergi No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Toplam</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredInvoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {invoice.invoiceNumber || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('tr-TR') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {invoice.customerTitle || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {invoice.customerTaxId || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {invoice.total.toFixed(2)} ₺
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[invoice.status] || STATUS_COLORS.draft}`}>
                    {STATUS_LABELS[invoice.status] || invoice.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    {invoice.status === 'draft' && (
                      <>
                        <button
                          onClick={() => handleEditInvoice(invoice)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleSendInvoice(invoice.id)}
                          disabled={sendingId === invoice.id}
                          className="text-green-600 hover:text-green-800 disabled:opacity-50"
                        >
                          {sendingId === invoice.id ? 'Gönderiliyor...' : 'Gönder'}
                        </button>
                      </>
                    )}
                    {invoice.status === 'sent' && (
                      <button
                        onClick={() => handleSimulateDelivery(invoice.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Simüle Teslim
                      </button>
                    )}
                    {invoice.status === 'draft' && (
                      <button
                        onClick={() => handleDeleteInvoice(invoice.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Henüz e-fatura bulunmuyor
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Form Modal */}
      {showForm && (
        <InvoiceForm
          invoice={editingInvoice}
          onSave={handleSaveInvoice}
          onClose={() => {
            setShowForm(false);
            setEditingInvoice(null);
          }}
        />
      )}
    </div>
  );
}

export default EInvoicePage;