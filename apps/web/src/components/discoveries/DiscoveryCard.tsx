import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Discovery } from '@/types';

interface DiscoveryCardProps {
  discovery: Discovery;
  onClick: () => void;
}

const priorityColors = {
  high: 'bg-red-100 text-red-800 border-red-200',
  normal: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
};

const statusColors = {
  new: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
};

export function DiscoveryCard({ discovery, onClick }: DiscoveryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: discovery.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">
          {discovery.discoveryNumber}
        </span>
        <div className={`w-2 h-2 rounded-full ${statusColors[discovery.status]}`} />
      </div>

      {/* Title */}
      <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
        {discovery.title || 'Untitled Discovery'}
      </h4>

      {/* Customer */}
      {discovery.customerName && (
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="truncate">{discovery.customerName}</span>
        </div>
      )}

      {/* Meta info */}
      <div className="flex items-center justify-between">
        {/* Priority badge */}
        <span className={`text-xs px-2 py-1 rounded-full border ${priorityColors[discovery.priority]}`}>
          {discovery.priority === 'high' ? 'Yüksek' : discovery.priority === 'low' ? 'Düşük' : 'Normal'}
        </span>

        {/* Due date */}
        {discovery.dueDate && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{new Date(discovery.dueDate).toLocaleDateString('tr-TR')}</span>
          </div>
        )}
      </div>

      {/* Measurements count */}
      {discovery.measurements && discovery.measurements.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {discovery.measurements.length} ölçüm
          </span>
        </div>
      )}

      {/* Site visits count */}
      {discovery.siteVisits && discovery.siteVisits.length > 0 && (
        <div className="mt-1">
          <span className="text-xs text-gray-400">
            {discovery.siteVisits.length} ziyaret
          </span>
        </div>
      )}
    </div>
  );
}