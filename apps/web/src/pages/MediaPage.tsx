import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Campaign, MediaBudget } from '@/types';

const CHANNEL_LABELS: Record<string, string> = {
  social: 'Sosyal Medya',
  print: 'Yazılı Basın',
  online: 'Online',
  tv: 'TV',
  radio: 'Radyo',
};

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planlama',
  active: 'Aktif',
  paused: 'Duraklatıldı',
  completed: 'Tamamlandı',
};

const STATUS_STYLES: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
};

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  campaign?: Campaign | null;
}

function CampaignModal({ isOpen, onClose, onSuccess, campaign }: CampaignModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'planning',
    budget: 0,
    channels: [] as string[],
    targetAudience: '',
  });
  const [loading, setLoading] = useState(false);
  const availableChannels = ['social', 'print', 'online', 'tv', 'radio'];

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        description: campaign.description,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        status: campaign.status,
        budget: campaign.budget,
        channels: campaign.channels,
        targetAudience: campaign.targetAudience || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        status: 'planning',
        budget: 0,
        channels: [],
        targetAudience: '',
      });
    }
  }, [campaign, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (campaign) {
        await api.updateCampaign(campaign.id, formData);
      } else {
        await api.createCampaign(formData);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{campaign ? 'Kampanyayı Düzenle' : 'Yeni Kampanya'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kampanya Adı</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bütçe</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.budget}
                onChange={e => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="planning">Planlama</option>
                <option value="active">Aktif</option>
                <option value="paused">Duraklatıldı</option>
                <option value="completed">Tamamlandı</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Kitle</label>
            <input
              type="text"
              value={formData.targetAudience}
              onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              placeholder="örn: 25-40 yaş, şehir merkezi"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kanallar</label>
            <div className="flex flex-wrap gap-2">
              {availableChannels.map(channel => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => toggleChannel(channel)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    formData.channels.includes(channel)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {CHANNEL_LABELS[channel]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MediaPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [budget, setBudget] = useState<MediaBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [campaignsData, budgetData] = await Promise.all([
        api.getCampaigns(filterStatus ? { status: filterStatus } : undefined),
        api.getMediaBudgetSummary(),
      ]);
      setCampaigns(campaignsData as Campaign[]);
      setBudget(budgetData as MediaBudget);
    } catch (error) {
      console.error('Failed to load media data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kampanyayı silmek istediğinizden emin misiniz?')) return;
    try {
      await api.deleteCampaign(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingCampaign(null);
    setShowModal(true);
  };

  if (loading) return <div className="text-gray-500">Yükleniyor...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Medya Planlama</h1>
        <button
          onClick={handleCreate}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          + Yeni Kampanya
        </button>
      </div>

      {/* Budget Summary Widget */}
      {budget && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 mb-1">Toplam Bütçe</p>
            <p className="text-2xl font-bold text-gray-900">{budget.totalBudget.toFixed(2)} TL</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 mb-1">Harcama</p>
            <p className="text-2xl font-bold text-red-600">{budget.totalSpent.toFixed(2)} TL</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 mb-1">Kalan</p>
            <p className="text-2xl font-bold text-green-600">{budget.remaining.toFixed(2)} TL</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 mb-1">Toplam Erişim</p>
            <p className="text-2xl font-bold text-blue-600">{budget.totalReach.toLocaleString()}</p>
            {budget.roi !== undefined && budget.roi !== null && (
              <p className="text-xs text-gray-500">ROI: {budget.roi.toFixed(1)}%</p>
            )}
          </div>
        </div>
      )}

      {/* Channel Breakdown */}
      {budget && (
        <div className="bg-white rounded-lg shadow p-4 mb-8">
          <h3 className="text-lg font-medium mb-4">Kanal Bazlı Harcama</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {budget.channelBreakdown.map(cb => (
              <div key={cb.channel} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">{CHANNEL_LABELS[cb.channel] || cb.channel}</p>
                <p className="text-lg font-bold text-gray-900">{cb.spent.toFixed(2)} TL</p>
                <p className="text-xs text-gray-400">{cb.placements} yerleşim</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium">Kampanyalar</h3>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border rounded-md px-3 py-1 text-sm"
          >
            <option value="">Tüm Durumlar</option>
            <option value="planning">Planlama</option>
            <option value="active">Aktif</option>
            <option value="paused">Duraklatıldı</option>
            <option value="completed">Tamamlandı</option>
          </select>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kampanya</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dönem</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bütçe</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Harcama</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kanallar</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Henüz kampanya bulunmuyor
                </td>
              </tr>
            ) : (
              campaigns.map(campaign => (
                <tr key={campaign.id}>
                  <td className="px-6 py-4">
                    <Link
                      to={`/media/${campaign.id}`}
                      className="text-primary-600 hover:text-primary-800 font-medium"
                    >
                      {campaign.name}
                    </Link>
                    <p className="text-sm text-gray-500">{campaign.description}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.startDate} - {campaign.endDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${STATUS_STYLES[campaign.status]}`}>
                      {STATUS_LABELS[campaign.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.budget.toFixed(2)} TL
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-900">{campaign.spent.toFixed(2)} TL</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {campaign.channels.map(ch => (
                        <span key={ch} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                          {CHANNEL_LABELS[ch] || ch}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleEdit(campaign)}
                      className="text-primary-600 hover:text-primary-800 mr-3"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CampaignModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={loadData}
        campaign={editingCampaign}
      />
    </div>
  );
}