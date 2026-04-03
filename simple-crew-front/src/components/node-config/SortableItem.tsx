import React from 'react';
import { GripVertical } from 'lucide-react';
import { 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
  id: string;
  name: string;
}

export function SortableItem({ id, name }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-2.5 bg-brand-card border rounded-lg mb-2 transition-shadow ${
        isDragging 
          ? 'opacity-90 ring-2 ring-blue-500 dark:ring-blue-400 shadow-lg border-blue-200 dark:border-blue-800' 
          : 'border-brand-border shadow-sm hover:border-blue-400 dark:hover:border-blue-500'
      }`}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab active:cursor-grabbing hover:bg-brand-bg p-1.5 rounded text-brand-muted hover:text-brand-text transition-colors"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium text-brand-text truncate">{name}</span>
    </div>
  );
}
