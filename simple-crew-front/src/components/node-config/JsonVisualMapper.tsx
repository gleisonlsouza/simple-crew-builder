import React, { useState } from 'react';
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

interface DraggableJsonItemProps {
  id: string;
  label: string;
  path: string;
  isBranch?: boolean;
}

export const DraggableJsonItem: React.FC<DraggableJsonItemProps> = ({ id, label, path, isBranch }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { path }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-grab active:cursor-grabbing transition-colors ${
        isDragging 
          ? 'bg-orange-500/20 text-orange-500 shadow-lg border border-orange-500/30 ring-1 ring-orange-500/50' 
          : 'hover:bg-brand-bg text-brand-text/90'
      } ${isBranch ? 'font-bold text-[11px]' : 'font-mono text-[10px]'}`}
    >
      <GripVertical className="w-3 h-3 text-brand-muted shrink-0" />
      <span className="truncate max-w-[150px]">{label}</span>
    </div>
  );
};

interface JsonTreeProps {
  data: unknown;
  path?: string;
  label: string;
}

export const JsonTree: React.FC<JsonTreeProps> = ({ data, path = '', label }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const isObject = data !== null && typeof data === 'object' && !Array.isArray(data);
  const isArray = Array.isArray(data);
  const hasChildren = (isObject && Object.keys(data).length > 0) || (isArray && data.length > 0);
  
  const currentPath = path || label;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 group">
        {hasChildren ? (
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="p-0.5 hover:bg-brand-bg rounded-md transition-colors shrink-0"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3 text-brand-muted" /> : <ChevronRight className="w-3 h-3 text-brand-muted" />}
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}
        
        <DraggableJsonItem 
          id={currentPath} 
          label={label} 
          path={currentPath} 
          isBranch={hasChildren}
        />
        
        {hasChildren && (
          <span className="text-[9px] text-brand-muted opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-1">
            {isArray ? `[${data.length}]` : '{...}'}
          </span>
        )}
      </div>
      
      {isExpanded && hasChildren && (
        <div className="pl-6 flex flex-col gap-1 border-l border-brand-border/30 ml-2">
          {isObject && Object.entries(data).map(([key, value]) => (
            <JsonTree 
              key={key} 
              data={value} 
              label={key} 
              path={path ? `${path}.${key}` : key} 
            />
          ))}
          {isArray && data.map((item, index) => (
            <JsonTree 
              key={index} 
              data={item} 
              label={`[${index}]`} 
              path={`${path}[${index}]`} 
            />
          ))}
        </div>
      )}
    </div>
  );
};
