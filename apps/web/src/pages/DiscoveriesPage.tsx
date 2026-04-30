import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Discovery } from '@/types';
import { KanbanBoard } from '@/components/discoveries/KanbanBoard';
import { DiscoveryModal } from '@/components/discoveries/DiscoveryModal';

export function DiscoveriesPage() {
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDiscovery, setSelectedDiscovery] = useState<Discovery | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  useEffect(() => {
    loadDiscoveries();
  }, []);

  const loadDiscoveries = async () => {
    try {
      setLoading(true);
      const data = await api.getDiscoveries() as Discovery[];
      setDiscoveries(data);
    } catch (err) {
      console.error('Failed to load discoveries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (discoveryId: string, newStatus: string) => {
    try {
      await api.updateDiscoveryStage(discoveryId, newStatus);
      setDiscoveries(prev =>
        prev.map(d =>
          d.id === discoveryId ? { ...d, status: newStatus as Discovery['status'] } : d
        )
      );
    } catch (err) {
      console.error('Failed to update stage:', err);
      alert('Durum güncellenirken hata oluştu');
    }
  };

  const handleDiscoveryClick = (discovery: Discovery) => {
    setSelectedDiscovery(discovery);
    setIsModalOpen(true);
  };

  const handleNewDiscovery = () => {
    setSelectedDiscovery(null);
    setIsModalOpen(true);
  };

  const handleSaveDiscovery = async (data: Partial<Discovery>) => {
    try {
      if (selectedDiscovery) {
        // Update existing
        const updated = await api.updateDiscovery(selectedDiscovery.id, data) as Discovery;
        setDiscoveries(prev => prev.map(d => d.id === updated.id ? updated : d));
      } else {
        // Create new
        const created = await api.createDiscovery(data) as Discovery;
        setDiscoveries(prev => [...prev, created]);
      }
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteDiscovery = async () => {
    if (!selectedDiscovery) return;
    try {
      await api.deleteDiscovery(selectedDiscovery.id);
      setDiscoveries(prev => prev.filter(d => d.id !== selectedDiscovery.id));
    } catch (err) {
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Keşifler</h1>
          <p className="text-sm text-gray-500 mt-1">
            {discoveries.length} keşif
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'kanban'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'table'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Tablo
            </button>
          </div>

          <button
            onClick={handleNewDiscovery}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Yeni Keşif
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'kanban' ? (
        <KanbanBoard
          discoveries={discoveries}
          onDiscoveryClick={handleDiscoveryClick}
          onStageChange={handleStageChange}
        />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keşif No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Başlık</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Öncelik</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bitiş Tarihi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {discoveries.map((discovery) => (
                <tr
                  key={discovery.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleDiscoveryClick(discovery)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {discovery.discoveryNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {discovery.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {discovery.customerName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      discovery.status === 'completed' ? 'bg-green-100 text-green-800' :
                      discovery.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {discovery.status === 'completed' ? 'Tamamlandı' :
                       discovery.status === 'in_progress' ? 'Devam Ediyor' : 'Yeni'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      discovery.priority === 'high' ? 'bg-red-100 text-red-800' :
                      discovery.priority === 'low' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {discovery.priority === 'high' ? 'Yüksek' :
                       discovery.priority === 'low' ? 'Düşük' : 'Normal'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {discovery.dueDate ? new Date(discovery.dueDate).toLocaleDateString('tr-TR') : '-'}
                  </td>
                </tr>
              ))}
              {discoveries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Henüz keşif bulunmuyor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <DiscoveryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        discovery={selectedDiscovery}
        onSave={handleSaveDiscovery}
        onDelete={selectedDiscovery ? handleDeleteDiscovery : undefined}
      />
    </div>
  );
}