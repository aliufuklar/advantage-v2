import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Discovery } from '@/types';
import { DiscoveryCard } from './DiscoveryCard';

interface Column {
  id: string;
  title: string;
  color: string;
}

const COLUMNS: Column[] = [
  { id: 'new', title: 'Yeni', color: 'bg-gray-100' },
  { id: 'in_progress', title: 'Devam Ediyor', color: 'bg-blue-100' },
  { id: 'completed', title: 'Tamamlandı', color: 'bg-green-100' },
];

interface KanbanBoardProps {
  discoveries: Discovery[];
  onDiscoveryClick: (discovery: Discovery) => void;
  onStageChange: (discoveryId: string, newStatus: string) => Promise<void>;
}

export function KanbanBoard({ discoveries, onDiscoveryClick, onStageChange }: KanbanBoardProps) {
  const [activeDiscovery, setActiveDiscovery] = useState<Discovery | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getDiscoveriesByStatus = (status: string) => {
    return discoveries.filter(d => d.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const discovery = discoveries.find(d => d.id === active.id);
    if (discovery) {
      setActiveDiscovery(discovery);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDiscovery(null);

    if (!over) return;

    const discoveryId = active.id as string;
    const overId = over.id as string;

    // Determine if dropped on a column or another card
    const isColumn = COLUMNS.some(col => col.id === overId);

    let newStatus: string;
    if (isColumn) {
      newStatus = overId;
    } else {
      // Dropped on a card - find which column that card belongs to
      const targetCard = discoveries.find(d => d.id === overId);
      if (targetCard) {
        newStatus = targetCard.status;
      } else {
        return;
      }
    }

    const discovery = discoveries.find(d => d.id === discoveryId);
    if (discovery && discovery.status !== newStatus) {
      await onStageChange(discoveryId, newStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(column => {
          const columnDiscoveries = getDiscoveriesByStatus(column.id);
          return (
            <div
              key={column.id}
              className={`flex-shrink-0 w-80 ${column.color} rounded-lg p-3`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-semibold text-gray-700">{column.title}</h3>
                <span className="bg-white text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
                  {columnDiscoveries.length}
                </span>
              </div>

              {/* Column Content */}
              <SortableContext
                items={columnDiscoveries.map(d => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 min-h-[200px]">
                  {columnDiscoveries.map(discovery => (
                    <DiscoveryCard
                      key={discovery.id}
                      discovery={discovery}
                      onClick={() => onDiscoveryClick(discovery)}
                    />
                  ))}
                  {columnDiscoveries.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-8">
                      Drag items here
                    </div>
                  )}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeDiscovery ? (
          <div className="opacity-90 rotate-3">
            <DiscoveryCard discovery={activeDiscovery} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}