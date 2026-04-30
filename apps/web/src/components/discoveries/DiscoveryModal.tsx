import { useState, useEffect } from 'react';
import type { Discovery, Measurement, SiteVisit } from '@/types';
import { api } from '@/lib/api';

interface DiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  discovery: Discovery | null;
  onSave: (data: Partial<Discovery>) => Promise<void>;
  onDelete?: () => Promise<void>;
  isLoading?: boolean;
}

type TabType = 'basic' | 'measurements' | 'siteVisits' | 'timeline';

const emptyMeasurement: Measurement = { label: '', value: '', unit: '' };
const emptySiteVisit: SiteVisit = { date: new Date().toISOString().split('T')[0], notes: '', photos: [] };

const priorityLabels = {
  high: { label: 'Yüksek', color: 'bg-red-100 text-red-800 border-red-200' },
  normal: { label: 'Normal', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  low: { label: 'Düşük', color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const statusLabels = {
  new: { label: 'Yeni', color: 'bg-gray-500' },
  in_progress: { label: 'Devam Ediyor', color: 'bg-blue-500' },
  completed: { label: 'Tamamlandı', color: 'bg-green-500' },
};

export function DiscoveryModal({
  isOpen,
  onClose,
  discovery,
  onSave,
  onDelete,
  isLoading,
}: DiscoveryModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [formData, setFormData] = useState({
    title: '',
    customerId: '',
    customerName: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    status: 'new' as 'new' | 'in_progress' | 'completed',
    priority: 'normal' as 'low' | 'normal' | 'high',
    notes: '',
    dueDate: '',
    measurements: [] as Measurement[],
    siteVisits: [] as SiteVisit[],
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Array<{ id: string; customerNumber: string; legalName: string; shortName?: string }>>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [newMeasurement, setNewMeasurement] = useState<Measurement>({ ...emptyMeasurement });
  const [newSiteVisit, setNewSiteVisit] = useState<SiteVisit>({ ...emptySiteVisit });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (discovery) {
      setFormData({
        title: discovery.title || '',
        customerId: discovery.customerId || '',
        customerName: discovery.customerName || '',
        contactPerson: discovery.contactPerson || '',
        contactPhone: discovery.contactPhone || '',
        contactEmail: discovery.contactEmail || '',
        address: discovery.address || '',
        status: discovery.status || 'new',
        priority: discovery.priority || 'normal',
        notes: discovery.notes || '',
        dueDate: discovery.dueDate || '',
        measurements: discovery.measurements || [],
        siteVisits: discovery.siteVisits || [],
      });
    } else {
      setFormData({
        title: '',
        customerId: '',
        customerName: '',
        contactPerson: '',
        contactPhone: '',
        contactEmail: '',
        address: '',
        status: 'new',
        priority: 'normal',
        notes: '',
        dueDate: '',
        measurements: [],
        siteVisits: [],
      });
    }
    setErrors({});
    setActiveTab('basic');
    setCustomerSearch('');
    setCustomerResults([]);
    setShowCustomerDropdown(false);
  }, [discovery, isOpen]);

  // Customer search
  useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearch.length < 2) {
        setCustomerResults([]);
        return;
      }

      try {
        const results = await api.searchCustomers(customerSearch);
        setCustomerResults(results as Array<{ id: string; customerNumber: string; legalName: string; shortName?: string }>);
        setShowCustomerDropdown(true);
      } catch (err) {
        console.error('Customer search failed:', err);
      }
    };

    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [customerSearch]);

  const selectCustomer = (customer: { id: string; legalName: string; shortName?: string }) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.legalName,
    }));
    setCustomerSearch(customer.legalName);
    setShowCustomerDropdown(false);
  };

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Başlık zorunludur';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Kayıt başarısız' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Bu keşfi silmek istediğinizden emin misiniz?')) return;
    setSaving(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Silme başarısız' });
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToOrder = async () => {
    if (!discovery) return;
    if (!confirm('Bu keşfi siparişe dönüştürmek istediğinizden emin misiniz?')) return;
    setConverting(true);
    try {
      const result = await api.convertDiscoveryToOrder(discovery.id) as { orderNumber: string };
      alert(`Sipariş oluşturuldu: ${result.orderNumber}`);
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Dönüştürme başarısız' });
    } finally {
      setConverting(false);
    }
  };

  // Measurement handlers
  const addMeasurement = () => {
    if (!newMeasurement.label.trim()) return;
    setFormData(prev => ({
      ...prev,
      measurements: [...prev.measurements, { ...newMeasurement }]
    }));
    setNewMeasurement({ ...emptyMeasurement });
  };

  const removeMeasurement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      measurements: prev.measurements.filter((_, i) => i !== index)
    }));
  };

  const updateMeasurement = (index: number, field: keyof Measurement, value: string) => {
    setFormData(prev => ({
      ...prev,
      measurements: prev.measurements.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      )
    }));
  };

  // Site visit handlers
  const addSiteVisit = () => {
    if (!newSiteVisit.date) return;
    setFormData(prev => ({
      ...prev,
      siteVisits: [...prev.siteVisits, { ...newSiteVisit, photos: newSiteVisit.photos || [] }]
    }));
    setNewSiteVisit({ ...emptySiteVisit });
  };

  const removeSiteVisit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      siteVisits: prev.siteVisits.filter((_, i) => i !== index)
    }));
  };

  const updateSiteVisit = (index: number, field: keyof SiteVisit, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      siteVisits: prev.siteVisits.map((v, i) =>
        i === index ? { ...v, [field]: value } : v
      )
    }));
  };

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string }[] = [
    { id: 'basic', label: 'Temel Bilgiler' },
    { id: 'measurements', label: `Ölçümler (${formData.measurements.length})` },
    { id: 'siteVisits', label: `Ziyaretler (${formData.siteVisits.length})` },
    { id: 'timeline', label: 'Geçmiş' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {discovery ? 'Keşfi Düzenle' : 'Yeni Keşif'}
            </h2>
            {discovery && (
              <span className="text-sm text-gray-500">{discovery.discoveryNumber}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={saving}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Başlık *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => handleInputChange('title', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Keşif başlığı"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                  )}
                </div>

                {/* Customer Search */}
                <div className="col-span-2 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Müşteri
                  </label>
                  <input
                    type="text"
                    value={customerSearch || formData.customerName || ''}
                    onChange={e => {
                      setCustomerSearch(e.target.value);
                      if (!e.target.value) {
                        handleInputChange('customerId', '');
                        handleInputChange('customerName', '');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Müşteri ara..."
                  />
                  {showCustomerDropdown && customerResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {customerResults.map(customer => (
                        <button
                          key={customer.id}
                          onClick={() => selectCustomer(customer)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex justify-between items-center"
                        >
                          <span className="font-medium">{customer.legalName}</span>
                          <span className="text-xs text-gray-500">{customer.customerNumber}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    İletişim Kişisi
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={e => handleInputChange('contactPerson', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Ad Soyad"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={e => handleInputChange('contactPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="+90 555 123 4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={e => handleInputChange('contactEmail', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={e => handleInputChange('dueDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adres
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={e => handleInputChange('address', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Adres bilgisi"
                  />
                </div>

                {/* Status and Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durum
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-3 h-3 rounded-full ${statusLabels[formData.status].color}`} />
                    <span className="text-sm font-medium text-gray-700">
                      {statusLabels[formData.status].label}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Öncelik
                  </label>
                  <div className="flex gap-2 mt-2">
                    {(['low', 'normal', 'high'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => handleInputChange('priority', p)}
                        className={`px-3 py-1 text-sm rounded-full border ${
                          formData.priority === p
                            ? priorityLabels[p].color + ' border-current'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        {priorityLabels[p].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notlar
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={e => handleInputChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Keşif notları..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Measurements Tab */}
          {activeTab === 'measurements' && (
            <div className="space-y-4">
              {/* Add new measurement form */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">Yeni Ölçüm Ekle</h4>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={newMeasurement.label}
                    onChange={e => setNewMeasurement(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Ölçüm adı (örn: Boyut) *"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={newMeasurement.value}
                    onChange={e => setNewMeasurement(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="Değer (örn: 100) *"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={newMeasurement.unit || ''}
                    onChange={e => setNewMeasurement(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="Birim (örn: cm)"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <button
                  onClick={addMeasurement}
                  disabled={!newMeasurement.label.trim() || !newMeasurement.value.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Ölçüm Ekle
                </button>
              </div>

              {/* Measurement list */}
              {formData.measurements.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Henüz ölçüm eklenmedi</p>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ölçüm</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Değer</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Birim</th>
                        <th className="px-4 py-2 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {formData.measurements.map((m, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={m.label}
                              onChange={e => updateMeasurement(i, 'label', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={m.value}
                              onChange={e => updateMeasurement(i, 'value', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={m.unit || ''}
                              onChange={e => updateMeasurement(i, 'unit', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => removeMeasurement(i)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Site Visits Tab */}
          {activeTab === 'siteVisits' && (
            <div className="space-y-4">
              {/* Add new site visit form */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">Yeni Ziyaret Ekle</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Tarih *</label>
                    <input
                      type="date"
                      value={newSiteVisit.date}
                      onChange={e => setNewSiteVisit(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Notlar</label>
                    <input
                      type="text"
                      value={newSiteVisit.notes || ''}
                      onChange={e => setNewSiteVisit(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Ziyaret notları"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <button
                  onClick={addSiteVisit}
                  disabled={!newSiteVisit.date}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Ziyaret Ekle
                </button>
              </div>

              {/* Site visit list */}
              {formData.siteVisits.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Henüz ziyaret eklenmedi</p>
              ) : (
                <div className="space-y-3">
                  {formData.siteVisits.map((visit, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary-100 text-primary-700 rounded-lg p-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <input
                              type="date"
                              value={visit.date}
                              onChange={e => updateSiteVisit(i, 'date', e.target.value)}
                              className="font-medium px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                            {visit.notes && <p className="text-sm text-gray-500 mt-1">{visit.notes}</p>}
                          </div>
                        </div>
                        <button
                          onClick={() => removeSiteVisit(i)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {discovery?.timeline && discovery.timeline.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                  <div className="space-y-4">
                    {discovery.timeline.map((entry, i) => (
                      <div key={i} className="relative flex items-start gap-4 pl-10">
                        <div className="absolute left-2.5 w-3 h-3 rounded-full bg-primary-500 border-2 border-white" />
                        <div className="flex-1 bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">
                              {entry.action === 'created' && 'Keşif Oluşturuldu'}
                              {entry.action === 'updated' && 'Güncellendi'}
                              {entry.action === 'status_changed' && 'Durum Değiştirildi'}
                              {entry.action === 'converted_to_order' && 'Siparişe Dönüştürüldü'}
                              {!['created', 'updated', 'status_changed', 'converted_to_order'].includes(entry.action) && entry.action}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(entry.timestamp).toLocaleString('tr-TR')}
                            </span>
                          </div>
                          {entry.userName && (
                            <p className="text-sm text-gray-500">{entry.userName}</p>
                          )}
                          {entry.details && (
                            <p className="text-sm text-gray-600 mt-1">{entry.details}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Henüz geçmiş kaydı yok</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {discovery && onDelete && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Keşfi Sil
              </button>
            )}
            {discovery && discovery.status === 'completed' && (
              <button
                onClick={handleConvertToOrder}
                disabled={converting}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {converting && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Siparişe Dönüştür
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              İptal
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}