import { useState } from 'react';
import type { ChecklistItem } from '@/types';

interface ChecklistPanelProps {
  checklist: ChecklistItem[];
  onChecklistChange: (checklist: ChecklistItem[]) => void;
  readOnly?: boolean;
}

export function ChecklistPanel({ checklist, onChecklistChange, readOnly = false }: ChecklistPanelProps) {
  const [newItemLabel, setNewItemLabel] = useState('');

  const completedCount = checklist.filter(item => item.completed).length;
  const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

  const addItem = () => {
    if (!newItemLabel.trim()) return;
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      label: newItemLabel.trim(),
      completed: false,
    };
    onChecklistChange([...checklist, newItem]);
    setNewItemLabel('');
  };

  const toggleItem = (id: string) => {
    const updated = checklist.map(item => {
      if (item.id === id) {
        const now = new Date().toISOString();
        return {
          ...item,
          completed: !item.completed,
          completedAt: !item.completed ? now : undefined,
          completedBy: !item.completed ? 'current-user' : undefined,
        };
      }
      return item;
    });
    onChecklistChange(updated);
  };

  const deleteItem = (id: string) => {
    onChecklistChange(checklist.filter(item => item.id !== id));
  };

  const updateItemLabel = (id: string, label: string) => {
    onChecklistChange(
      checklist.map(item => (item.id === id ? { ...item, label } : item))
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Checklist</span>
          <span className="text-xs text-gray-500">
            {completedCount}/{checklist.length} tamamlandı
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {checklist.map(item => (
          <div
            key={item.id}
            className={`flex items-start gap-2 p-2 rounded border ${
              item.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => toggleItem(item.id)}
              disabled={readOnly}
              className="mt-1 h-4 w-4 rounded border-gray-400 text-green-600 focus:ring-green-500"
            />
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={item.label}
                onChange={e => updateItemLabel(item.id, e.target.value)}
                disabled={readOnly}
                className={`w-full bg-transparent border-0 text-sm focus:ring-0 p-0 ${
                  item.completed ? 'line-through text-gray-400' : 'text-gray-900'
                }`}
              />
              {item.completed && item.completedAt && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(item.completedAt).toLocaleString('tr-TR')}
                </p>
              )}
            </div>
            {!readOnly && (
              <button
                onClick={() => deleteItem(item.id)}
                className="text-gray-400 hover:text-red-500 text-sm"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={newItemLabel}
            onChange={e => setNewItemLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Yeni madde ekle..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            onClick={addItem}
            className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
          >
            Ekle
          </button>
        </div>
      )}
    </div>
  );
}

export default ChecklistPanel;
