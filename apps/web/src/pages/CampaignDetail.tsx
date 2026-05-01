import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { CampaignDetail, AdPlacement } from '@/types';

const CHANNEL_LABELS: Record<string, string> = {
  social: 'Sosyal Medya',
  print: 'Yazılı Basın',
  online: 'Online',
  tv: 'TV',
  radio: 'Radyo',
};

const CHANNEL_ICONS: Record<string, string> = {
  social: '📱',
  print: '📰',
  online: '🌐',
  tv: '📺',
  radio: '📻',
};

interface PlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  placement?: AdPlacement | null;
  campaignId: string;
}

function PlacementModal({ isOpen, onClose, onSuccess, placement, campaignId }: PlacementModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    channel: 'social',
    date: '',
    cost: 0,
    reach: 0,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const availableChannels = ['social', 'print', 'online', 'tv', 'radio'];

  useEffect(() => {
    if (placement) {
      setFormData({
        name: placement.name,
        channel: placement.channel,
        date: placement.date,
        cost: placement.cost,
        reach: placement.reach || 0,
        notes: placement.notes || '',
      });
    } else {
      setFormData({
        name: '',
        channel: 'social',
        date: new Date().toISOString().split('T')[0],
        cost: 0,
        reach: 0,
        notes: '',
      });
    }
  }, [placement, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { ...formData, campaignId };
      if (placement?.id) {
        await api.updatePlacement(placement.id, data);
      } else {
        await api.createPlacement(data);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save placement:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
        <h2 className="text-xl font-bold mb-4">
          {placement ? 'Yerleşimi Düzenle' : 'Yeni Yerleşim Ekle'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              placeholder="örn: Facebook Reklamı"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kanal</label>
            <select
              value={formData.channel}
              onChange={e => setFormData({ ...formData, channel: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            >
              {availableChannels.map(ch => (
                <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maliyet</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.cost}
                onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Erişim</label>
            <input
              type="number"
              min="0"
              value={formData.reach}
              onChange={e => setFormData({ ...formData, reach: parseInt(e.target.value) || 0 })}
              className="w-full border rounded-md px-3 py-2"
              placeholder="Tahmini erişim"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              rows={3}
            />
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

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<AdPlacement | null>(null);

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const loadCampaign = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getCampaign(id);
      setCampaign(data as CampaignDetail);
    } catch (error) {
      console.error('Failed to load campaign:', error);
      navigate('/media');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlacement = async (placementId: string) => {
    if (!confirm('Bu yerleşimi silmek istediğinizden emin misiniz?')) return;
    try {
      await api.deletePlacement(placementId);
      loadCampaign();
    } catch (error) {
      console.error('Failed to delete placement:', error);
    }
  };

  const handleEditPlacement = (placement: AdPlacement) => {
    setEditingPlacement(placement);
    setShowPlacementModal(true);
  };

  const handleAddPlacement = () => {
    setEditingPlacement(null);
    setShowPlacementModal(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planning: 'border-gray-400 bg-gray-50',
      active: 'border-green-500 bg-green-50',
      paused: 'border-yellow-500 bg-yellow-50',
      completed: 'border-blue-500 bg-blue-50',
    };
    return colors[status] || 'border-gray-400 bg-gray-50';
  };

  if (loading) return <div className="text-gray-500">Yükleniyor...</div>;
  if (!campaign) return <div className="text-gray-500">Kampanya bulunamadı</div>;

  const totalBudget = campaign.budget.totalBudget;
  const totalSpent = campaign.budget.totalSpent;
  const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/media" className="text-primary-600 hover:text-primary-800 mb-2 inline-block">
          ← Medya Planlama
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <p className="text-gray-500 mt-1">{campaign.description}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(campaign.status)}`}>
            {campaign.status === 'planning' && 'Planlama'}
            {campaign.status === 'active' && 'Aktif'}
            {campaign.status === 'paused' && 'Duraklatıldı'}
            {campaign.status === 'completed' && 'Tamamlandı'}
          </span>
        </div>
      </div>

      {/* Campaign Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Dönem</p>
            <p className="font-medium text-gray-900">{campaign.startDate} - {campaign.endDate}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Hedef Kitle</p>
            <p className="font-medium text-gray-900">{campaign.targetAudience || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Kanallar</p>
            <div className="flex flex-wrap gap-1">
              {campaign.channels.map(ch => (
                <span key={ch} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                  {CHANNEL_LABELS[ch] || ch}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Bütçe</p>
            <p className="font-medium text-gray-900">{totalBudget.toFixed(2)} TL</p>
          </div>
        </div>
      </div>

      {/* Budget vs Actual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Bütçe vs Harcama</h3>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Harcama</span>
              <span>{spentPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${spentPercentage > 100 ? 'bg-red-500' : 'bg-primary-600'}`}
                style={{ width: `${Math.min(spentPercentage, 100)}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Bütçe</span>
              <span className="font-medium">{totalBudget.toFixed(2)} TL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Harcama</span>
              <span className={`font-medium ${totalSpent > totalBudget ? 'text-red-600' : 'text-gray-900'}`}>
                {totalSpent.toFixed(2)} TL
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Kalan</span>
              <span className={`font-medium ${totalBudget - totalSpent < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {(totalBudget - totalSpent).toFixed(2)} TL
              </span>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Performans Metrikleri</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Toplam Erişim</span>
              <span className="font-medium text-xl text-blue-600">
                {campaign.budget.totalReach?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Maliyet / Erişim</span>
              <span className="font-medium">
                {campaign.budget.totalReach && campaign.budget.totalReach > 0
                  ? `${(totalSpent / campaign.budget.totalReach).toFixed(2)} TL`
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">ROI</span>
              <span className={`font-medium ${(campaign.budget.roi || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {campaign.budget.roi !== undefined && campaign.budget.roi !== null
                  ? `${campaign.budget.roi.toFixed(1)}%`
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Yerleşim Sayısı</span>
              <span className="font-medium">{campaign.placements?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Channel Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Kanal Dağılımı</h3>
          <div className="space-y-3">
            {campaign.budget.channelBreakdown?.filter(cb => cb.placements > 0).map(cb => (
              <div key={cb.channel} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>{CHANNEL_ICONS[cb.channel] || '📊'}</span>
                  <span className="text-gray-700">{CHANNEL_LABELS[cb.channel] || cb.channel}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{cb.spent.toFixed(2)} TL</span>
                  <span className="text-gray-400 text-xs ml-2">({cb.placements})</span>
                </div>
              </div>
            ))}
            {(!campaign.budget.channelBreakdown || campaign.budget.channelBreakdown.filter(cb => cb.placements > 0).length === 0) && (
              <p className="text-gray-500 text-sm">Henüz kanal verisi yok</p>
            )}
          </div>
        </div>
      </div>

      {/* Placements Timeline */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium">Reklam Yerleşimleri</h3>
          <button
            onClick={handleAddPlacement}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            + Yerleşim Ekle
          </button>
        </div>

        {(!campaign.placements || campaign.placements.length === 0) ? (
          <div className="p-8 text-center text-gray-500">
            Henüz reklam yerleşimi bulunmuyor. Kampanya için yerleşim ekleyin.
          </div>
        ) : (
          <div className="divide-y">
            {campaign.placements
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(placement => (
                <div key={placement.id} className="p-4 flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                    {CHANNEL_ICONS[placement.channel] || '📊'}
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{placement.name}</h4>
                        <p className="text-sm text-gray-500">
                          {CHANNEL_LABELS[placement.channel]} • {placement.date}
                          {placement.reach && ` • ${placement.reach.toLocaleString()} erişim`}
                        </p>
                        {placement.notes && (
                          <p className="text-sm text-gray-400 mt-1">{placement.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{placement.cost.toFixed(2)} TL</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleEditPlacement(placement)}
                            className="text-primary-600 hover:text-primary-800 text-sm"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleDeletePlacement(placement.id!)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {id && (
        <PlacementModal
          isOpen={showPlacementModal}
          onClose={() => setShowPlacementModal(false)}
          onSuccess={loadCampaign}
          placement={editingPlacement}
          campaignId={id}
        />
      )}
    </div>
  );
}