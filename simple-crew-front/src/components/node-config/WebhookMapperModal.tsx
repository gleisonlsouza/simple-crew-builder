import React, { useState, useMemo } from 'react';
import { X, Zap, Search, ChevronRight, ChevronDown, ListTree, GripVertical } from 'lucide-react';
import { useDraggable, useDroppable, DndContext, type DragEndEvent } from '@dnd-kit/core';
import type { WebhookNodeData } from '../../types/nodes.types';

interface WebhookMapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: WebhookNodeData;
  nodeId: string;
  updateNodeData: (id: string, data: Partial<WebhookNodeData>) => void;
  allProjectVariables: string[];
}

interface DraggableJsonItemProps {
  id: string;
  label: string;
  path: string;
  isBranch?: boolean;
}

const DraggableJsonItem: React.FC<DraggableJsonItemProps> = ({ id, label, path, isBranch }) => {
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

interface DropZoneProps {
  id: string;
  label: string;
  value: string;
  onClear: () => void;
}

const TargetDropZone: React.FC<DropZoneProps> = ({ id, label, value, onClear }) => {
  const { isOver, setNodeRef } = useDroppable({
    id
  });

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col gap-1.5 p-3 rounded-xl border transition-all duration-300 ${
        isOver 
          ? 'bg-orange-500/10 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.15)] scale-[1.02]' 
          : 'bg-brand-bg/50 border-brand-border/30'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">{label}</span>
        {value && (
          <button onClick={onClear} className="text-brand-muted hover:text-rose-500 transition-colors">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className={`flex items-center h-9 px-3 rounded-lg border text-xs font-mono transition-colors ${
        value 
          ? 'bg-orange-500/5 border-orange-500/30 text-orange-500' 
          : 'bg-brand-bg border-brand-border/50 text-brand-muted italic'
      }`}>
        {value || 'Drop JSON object here...'}
      </div>
    </div>
  );
};

interface JsonTreeProps {
  data: any;
  path?: string;
  label: string;
}

const JsonTree: React.FC<JsonTreeProps> = ({ data, path = '', label }) => {
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

export const WebhookMapperModal: React.FC<WebhookMapperModalProps> = ({
  isOpen,
  onClose,
  data,
  nodeId,
  updateNodeData,
  allProjectVariables
}) => {
  const [sampleJson, setSampleJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const parsedJson = useMemo(() => {
    if (!sampleJson.trim()) return null;
    try {
      return JSON.parse(sampleJson);
    } catch (e: any) {
      return null;
    }
  }, [sampleJson]);

  // Handle errors in a separate effect
  React.useEffect(() => {
    if (!sampleJson.trim()) {
      setJsonError(null);
      return;
    }
    try {
      JSON.parse(sampleJson);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e.message);
    }
  }, [sampleJson]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.data.current?.path) {
      const targetVariable = over.id as string;
      const sourcePath = active.data.current.path as string;
      const formattedPath = `{{ $json.${sourcePath} }}`;
      
      const currentMappings = { ...(data.fieldMappings || {}) } as Record<string, string>;
      currentMappings[targetVariable] = formattedPath;
      updateNodeData(nodeId, { fieldMappings: currentMappings });
    }
  };

  const clearMapping = (variable: string) => {
    const currentMappings = { ...(data.fieldMappings || {}) } as Record<string, string>;
    delete currentMappings[variable];
    updateNodeData(nodeId, { fieldMappings: currentMappings });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-bg/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl h-full max-h-[85vh] bg-brand-card border border-brand-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between bg-brand-bg/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-brand-text leading-none">Visual Input Mapper</h2>
              <p className="text-xs text-brand-muted mt-1 italic">Drag JSON keys to project variables</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-brand-bg rounded-lg text-brand-muted hover:text-brand-text transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <DndContext onDragEnd={handleDragEnd}>
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel: JSON Schema */}
            <div className="w-1/2 flex flex-col border-r border-brand-border">
              <div className="p-4 border-b border-brand-border bg-brand-bg/20">
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-2 block">Sample Payload</label>
                <textarea
                  className={`w-full h-32 bg-brand-bg border rounded-xl p-3 text-xs font-mono focus:ring-2 focus:ring-orange-500 transition-all ${
                    jsonError ? 'border-rose-500 focus:ring-rose-500' : 'border-brand-border'
                  }`}
                  placeholder='Paste a sample JSON here... (e.g. { "user": { "id": 123, "name": "Jane" } })'
                  value={sampleJson}
                  onChange={(e) => setSampleJson(e.target.value)}
                />
                {jsonError && <p className="text-[10px] text-rose-500 mt-2 font-medium">Invalid JSON: {jsonError}</p>}
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {!parsedJson ? (
                  <div className="h-full flex flex-col items-center justify-center text-brand-muted gap-4 opacity-50">
                    <ListTree className="w-12 h-12" />
                    <p className="text-xs font-medium italic text-center max-w-[200px]">
                      Paste a sample JSON above to explore its structure.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">JSON Structure (Draggable)</span>
                    </div>
                    <JsonTree data={parsedJson} label="root" />
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Targets */}
            <div className="w-1/2 flex flex-col bg-brand-bg/5">
              <div className="p-4 border-b border-brand-border bg-brand-bg/20">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                  <input
                    type="text"
                    placeholder="Search variables..."
                    className="w-full bg-brand-bg border border-brand-border rounded-xl pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-orange-500 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="flex flex-col gap-4">
                  {allProjectVariables
                    .filter(v => v.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(variable => (
                      <TargetDropZone
                        key={variable}
                        id={variable}
                        label={variable}
                        value={(data.fieldMappings || {})[variable] || ''}
                        onClear={() => clearMapping(variable)}
                      />
                    ))}
                  {allProjectVariables.length === 0 && (
                    <div className="text-center py-12 opacity-50 italic">
                       No dynamic variables detected in your project yet. 
                       Add them using {'{key}'} in your nodes.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DndContext>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brand-border bg-brand-bg/50 flex items-center justify-between">
          <p className="text-[10px] text-brand-muted italic">
            Mappings are saved automatically to your webhook node.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-lg transition-all transform active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
