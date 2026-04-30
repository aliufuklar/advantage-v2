import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Project, ProjectTask, ProductionOrder, BOM } from '@/types';

type ViewMode = 'kanban' | 'orders' | 'bom';

const STAGES = ['planning', 'in_progress', 'qa', 'done'] as const;
const STAGE_LABELS: Record<string, string> = {
  planning: 'Planlama',
  in_progress: 'Devam Ediyor',
  qa: 'Kalite Kontrol',
  done: 'Tamamlandı',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 border-gray-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export function ProductionPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [projects, setProjects] = useState<Project[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', customerName: '' });
  const [newOrder, setNewOrder] = useState({ bomId: '', quantity: 1, dueDate: '', notes: '' });
  const [newTask, setNewTask] = useState({ title: '', assigneeName: '', dueDate: '', priority: 'normal' as const, stage: 'planning' as const });

  const loadData = useCallback(async () => {
    try {
      const [projectsData, ordersData, bomsData] = await Promise.all([
        api.getProjects(),
        api.getProductionOrders(),
        api.getBOMs(),
      ]);
      setProjects(projectsData as Project[]);
      setProductionOrders(ordersData as ProductionOrder[]);
      setBoms(bomsData as BOM[]);
    } catch (error) {
      console.error('Failed to load production data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateProject = async () => {
    try {
      const created = await api.createProject(newProject);
      setProjects(prev => [...prev, created as Project]);
      setShowProjectModal(false);
      setNewProject({ name: '', description: '', customerName: '' });
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Bu projeyi silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (selectedProject?.id === projectId) setSelectedProject(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleCreateTask = async (projectId: string) => {
    try {
      const updated = await api.createProjectTask(projectId, newTask);
      setProjects(prev => prev.map(p => p.id === projectId ? updated as Project : p));
      setNewTask({ title: '', assigneeName: '', dueDate: '', priority: 'normal', stage: 'planning' });
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateTask = async (projectId: string, taskId: string, updates: Partial<ProjectTask>) => {
    try {
      const updated = await api.updateProjectTask(projectId, taskId, updates);
      setProjects(prev => prev.map(p => p.id === projectId ? updated as Project : p));
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (projectId: string, taskId: string) => {
    if (!confirm('Bu görevi silmek istediğinize emin misiniz?')) return;
    try {
      const updated = await api.deleteProjectTask(projectId, taskId);
      setProjects(prev => prev.map(p => p.id === projectId ? updated as Project : p));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleCreateOrder = async () => {
    try {
      const created = await api.createProductionOrder(newOrder);
      setProductionOrders(prev => [...prev, created as ProductionOrder]);
      setShowOrderModal(false);
      setNewOrder({ bomId: '', quantity: 1, dueDate: '', notes: '' });
    } catch (error) {
      console.error('Failed to create production order:', error);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const updated = await api.updateProductionOrder(orderId, { status });
      setProductionOrders(prev => prev.map(o => o.id === orderId ? updated as ProductionOrder : o));
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Bu üretim siparişini silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteProductionOrder(orderId);
      setProductionOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (error) {
      console.error('Failed to delete order:', error);
    }
  };

  const handleDeleteBOM = async (bomId: string) => {
    if (!confirm('Bu ürün ağacını silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteBOM(bomId);
      setBoms(prev => prev.filter(b => b.id !== bomId));
      if (selectedBOM?.id === bomId) setSelectedBOM(null);
    } catch (error) {
      console.error('Failed to delete BOM:', error);
    }
  };

  const getTasksByStage = (project: Project, stage: string) => {
    return project.tasks.filter(t => t.stage === stage).sort((a, b) => a.order - b.order);
  };

  if (loading) {
    return <div className="text-gray-500">Yükleniyor...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Üretim</h1>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'kanban' ? 'bg-white text-primary-600 shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Projeler
            </button>
            <button
              onClick={() => setViewMode('orders')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'orders' ? 'bg-white text-primary-600 shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Siparişler
            </button>
            <button
              onClick={() => setViewMode('bom')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'bom' ? 'bg-white text-primary-600 shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ürün Ağaçları
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'kanban' && (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowProjectModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 text-sm"
            >
              + Yeni Proje
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              Henüz proje bulunmuyor. Yeni bir proje oluşturun.
            </div>
          ) : (
            <div className="space-y-6">
              {projects.map(project => (
                <div key={project.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div
                    className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
                    onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500">
                        {project.tasks.length} görev • %{Math.round(project.progress)} tamamlandı
                        {project.customerName && ` • ${project.customerName}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Sil
                      </button>
                    </div>
                  </div>

                  {selectedProject?.id === project.id && (
                    <div className="p-4">
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        {STAGES.map(stage => (
                          <div key={stage} className="bg-gray-50 rounded-lg p-3">
                            <h4 className="font-medium text-sm text-gray-700 mb-2">
                              {STAGE_LABELS[stage]} ({getTasksByStage(project, stage).length})
                            </h4>
                            <div className="space-y-2">
                              {getTasksByStage(project, stage).map(task => (
                                <div
                                  key={task.id}
                                  className={`bg-white rounded-lg p-3 border ${PRIORITY_COLORS[task.priority]} shadow-sm`}
                                >
                                  <h5 className="font-medium text-sm text-gray-900">{task.title}</h5>
                                  <div className="mt-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {task.assigneeName && (
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                          {task.assigneeName}
                                        </span>
                                      )}
                                      {task.dueDate && (
                                        <span className="text-xs text-gray-500">
                                          {new Date(task.dueDate).toLocaleDateString('tr-TR')}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex gap-1">
                                      {stage !== 'done' && (
                                        <button
                                          onClick={() => {
                                            const nextStage = STAGES[STAGES.indexOf(stage as typeof STAGES[number]) + 1];
                                            handleUpdateTask(project.id, task.id, { stage: nextStage });
                                          }}
                                          className="text-primary-600 hover:text-primary-800 text-xs"
                                        >
                                          →
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleDeleteTask(project.id, task.id)}
                                        className="text-red-600 hover:text-red-800 text-xs"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  placeholder="Görev başlığı..."
                                  value={newTask.title}
                                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newTask.title) {
                                      handleCreateTask(project.id);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => newTask.title && handleCreateTask(project.id)}
                                  disabled={!newTask.title}
                                  className="bg-primary-600 text-white px-2 py-1 rounded text-sm disabled:opacity-50"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'orders' && (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowOrderModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 text-sm"
            >
              + Yeni Sipariş
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">BOM</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Miktar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Birim Maliyet</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Toplam</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bitiş Tarihi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productionOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.orderNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.bomName || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.unitCost.toFixed(2)} ₺</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.totalCost.toFixed(2)} ₺</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                        className={`px-2 py-1 text-xs rounded-full border-0 cursor-pointer ${STATUS_COLORS[order.status]}`}
                      >
                        <option value="planning">Planlama</option>
                        <option value="in_progress">Devam Ediyor</option>
                        <option value="completed">Tamamlandı</option>
                        <option value="cancelled">İptal</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.dueDate ? new Date(order.dueDate).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
                {productionOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      Henüz üretim siparişi bulunmuyor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'bom' && (
        <div>
          {boms.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              Henüz ürün ağacı bulunmuyor. Yeni bir ürün ağacı oluşturun.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {boms.map(bom => (
                <div
                  key={bom.id}
                  className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-shadow hover:shadow-md ${
                    selectedBOM?.id === bom.id ? 'ring-2 ring-primary-500' : ''
                  }`}
                  onClick={() => setSelectedBOM(selectedBOM?.id === bom.id ? null : bom)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">{bom.name}</h3>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteBOM(bom.id); }}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Sil
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    {bom.items.length} bileşen • v{bom.version}
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {bom.totalCost.toFixed(2)} ₺
                  </p>

                  {selectedBOM?.id === bom.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Bileşenler</h4>
                      <div className="space-y-1">
                        {bom.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item.productName}</span>
                            <span className="text-gray-500">{item.quantity} {item.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Yeni Proje</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proje Adı</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri</label>
                <input
                  type="text"
                  value={newProject.customerName}
                  onChange={(e) => setNewProject(prev => ({ ...prev, customerName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowProjectModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                İptal
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProject.name}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Yeni Üretim Siparişi</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Ağacı</label>
                <select
                  value={newOrder.bomId}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, bomId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Ürün ağacı seçin...</option>
                  {boms.map(bom => (
                    <option key={bom.id} value={bom.id}>{bom.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Miktar</label>
                <input
                  type="number"
                  value={newOrder.quantity}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 1 }))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
                <input
                  type="date"
                  value={newOrder.dueDate}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                <textarea
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowOrderModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                İptal
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={!newOrder.bomId}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductionPage;
