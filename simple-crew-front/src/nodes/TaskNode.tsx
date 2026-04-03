import { memo, useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { CheckSquare, Trash2, Loader2, CheckCircle2, AlertCircle, Clock, Settings, Plus, X, Terminal } from 'lucide-react';
import { useStore } from '../store/index';
import type { TaskNodeData } from '../types/nodes.types';
import { ToolConfigurationModal } from '../components/ToolConfigurationModal';

export const TaskNode = memo(({ id, data }: NodeProps<Node<TaskNodeData, 'task'>>) => {
  const { deleteNode, setActiveNode, updateNodeData, customTools, globalTools } = useStore(
    useShallow((state) => ({
      deleteNode: state.deleteNode,
      setActiveNode: state.setActiveNode,
      updateNodeData: state.updateNodeData,
      customTools: state.customTools,
      globalTools: state.globalTools,
    }))
  );

  const [isToolSelectorOpen, setIsToolSelectorOpen] = useState(false);
  const [isGlobalSelectorOpen, setIsGlobalSelectorOpen] = useState(false);
  const [isToolConfigModalOpen, setIsToolConfigModalOpen] = useState(false);
  const [toolToConfigure, setToolToConfigure] = useState<any>(null);
  const [editingToolIndex, setEditingToolIndex] = useState<number | null>(null);

  // Close menus when clicking outside
  useEffect(() => {
    if (!isToolSelectorOpen && !isGlobalSelectorOpen) return;
    const handleClick = () => {
      setIsToolSelectorOpen(false);
      setIsGlobalSelectorOpen(false);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isToolSelectorOpen, isGlobalSelectorOpen]);

  const status = useStore((state) => state.nodeStatuses[id] || 'idle');
  const errors = useStore((state) => state.nodeErrors[id]);

  const statusClasses = errors?.length
    ? 'ring-2 ring-red-400 ring-offset-2'
    : status === 'waiting'
      ? 'ring-2 ring-amber-400/50 ring-offset-1'
      : status === 'running'
        ? 'ring-2 ring-blue-500 ring-offset-2 animate-pulse'
        : status === 'success'
          ? 'ring-2 ring-green-500 ring-offset-2'
          : status === 'error'
            ? 'ring-2 ring-red-500 ring-offset-2'
            : 'hover:ring-2 hover:ring-emerald-400';

  return (
    <div
      className={`group relative bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700 w-56 overflow-visible transition-all duration-300 cursor-pointer ${statusClasses} ${status === 'running' ? 'running' : ''}`}
      style={{
        '--node-color': '#10b981',
        backfaceVisibility: 'hidden',
        transformStyle: 'preserve-3d',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'optimizeLegibility'
      } as React.CSSProperties}
    >

      {status === 'waiting' && (
        <div className="absolute -top-2 -right-2 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-md z-20 border border-slate-100 dark:border-slate-800 animate-in zoom-in duration-200">
          <Clock className="w-5 h-5 text-amber-500" />
        </div>
      )}
      {status === 'running' && (
        <div className="absolute -top-2 -right-2 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-md z-20 border border-slate-100 dark:border-slate-800">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        </div>
      )}
      {status === 'success' && (
        <div className="absolute -top-2 -right-2 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-md z-20 border border-slate-100 dark:border-slate-800">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        </div>
      )}
      {status === 'error' && (
        <div className="absolute -top-2 -right-2 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-md z-20 border border-slate-100 dark:border-slate-800 animate-in zoom-in duration-200">
          <AlertCircle className="w-5 h-5 text-red-500" />
        </div>
      )}

      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2 flex items-center gap-2 rounded-t-xl relative">
        <CheckSquare className="w-4 h-4 text-white" />
        <h3
          className="text-white text-sm font-medium truncate flex-1 cursor-text"
          onDoubleClick={(e) => { e.stopPropagation(); setActiveNode(id); }}
        >
          {data.name || 'New Task'}
        </h3>

        {errors?.length > 0 && (
          <div title={errors.join('\n')} className="text-red-200 hover:text-white cursor-help transition-colors">
            <AlertCircle className="w-4 h-4" />
          </div>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
            className="p-1 rounded hover:bg-white/20 transition-colors text-white/70 hover:text-white nodrag"
            title="Delete node"
            aria-label="Delete Task"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setActiveNode(id); }}
            className="p-1 rounded hover:bg-white/20 transition-colors text-white/70 hover:text-white nodrag"
            title="Config Task"
            aria-label="Config Task"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-slate-100 dark:border-slate-800/50">
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2" title={data.description}>
          {data.description || 'No description defined'}
        </p>
      </div>

      <div className="px-3 pb-3 pt-2">
        <div className="space-y-2">

          {/* Default CrewAI Tools Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Default Tools</span>
              </div>
              <div className="relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsGlobalSelectorOpen(!isGlobalSelectorOpen); }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-blue-500 transition-colors nodrag"
                >
                  <Plus className="w-3 h-3" />
                </button>
                {isGlobalSelectorOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-[110] p-1 animate-in fade-in zoom-in-95 duration-150 nodrag">
                    <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700 mb-1">Add CrewAI Tool</div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {['Search', 'Web', 'Files & Documents', 'RAG / DATABASE'].map(cat => {
                        const catTools = globalTools.filter(t => t.category === cat && t.isEnabled && !((data as any).globalToolIds || []).some((e: any) => (typeof e === 'string' ? e : e.id) === t.id));
                        if (catTools.length === 0) return null;
                        return (
                          <div key={cat} className="mb-2 last:mb-0">
                            <div className="px-2 py-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest">{cat}</div>
                            {catTools.map(tool => (
                              <button
                                key={tool.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (tool.user_config_schema) {
                                    setToolToConfigure(tool);
                                    setIsToolConfigModalOpen(true);
                                    setIsGlobalSelectorOpen(false);
                                  } else {
                                    const currentIds = data.globalToolIds || [];
                                    updateNodeData(id, { globalToolIds: [...currentIds, tool.id] });
                                    setIsGlobalSelectorOpen(false);
                                  }
                                }}
                                className="w-full text-left px-2 py-1.5 text-[10px] text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded flex items-center justify-between group"
                              >
                                <span className="truncate">{tool.name}</span>
                                <Plus className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" />
                              </button>
                            ))}
                          </div>
                        );
                      })}
                      {globalTools.filter(t => t.isEnabled && !((data as any).globalToolIds || []).some((e: any) => (typeof e === 'string' ? e : e.id) === t.id)).length === 0 && (
                        <div className="px-2 py-2 text-[9px] text-slate-400 italic text-center">No more tools enabled</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1 min-h-[1.25rem]">
              {(data.globalToolIds || []).length > 0 ? (
                (data.globalToolIds || []).map((gtid, index) => {
                  const actualId = typeof gtid === 'string' ? gtid : (gtid as any).id;
                  const tool = globalTools.find(t => t.id === actualId);
                  if (!tool) return null;
                  return (
                    <span 
                      key={actualId} 
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (tool.user_config_schema) {
                          setToolToConfigure(tool);
                          setEditingToolIndex(index);
                          setIsToolConfigModalOpen(true);
                        }
                      }}
                      className={`px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[10px] font-medium rounded border border-blue-100 dark:border-blue-800/50 truncate max-w-full flex items-center gap-1 group/chip transition-all ${tool.user_config_schema ? 'cursor-help hover:border-blue-400' : ''}`}
                      title={tool.user_config_schema ? 'Double-click to configure' : ''}
                    >
                      {tool.name}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          updateNodeData(id, { globalToolIds: (data.globalToolIds || []).filter((_, i) => i !== index) });
                        }}
                        className="opacity-0 group-hover/chip:opacity-100 p-0.5 hover:text-red-500 transition-opacity"
                      >
                        <X className="w-2 h-2" />
                      </button>
                    </span>
                  );
                })
              ) : (
                <span className="text-[9px] text-slate-400 italic">No default tools</span>
              )}
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800/50 my-2" />

          {/* Custom Tools Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom Tools</span>
              </div>
              <div className="relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsToolSelectorOpen(!isToolSelectorOpen); }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-500 transition-colors nodrag"
                >
                  <Plus className="w-3 h-3" />
                </button>
                {isToolSelectorOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-[110] p-1 animate-in fade-in zoom-in-95 duration-150 nodrag">
                    <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700 mb-1">Add Custom Tool</div>
                    <div className="max-h-32 overflow-y-auto custom-scrollbar">
                      {customTools.filter(t => !(data.customToolIds || []).includes(t.id)).map(tool => (
                        <button
                          key={tool.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            const currentIds = data.customToolIds || [];
                            updateNodeData(id, { customToolIds: [...currentIds, tool.id] });
                            setIsToolSelectorOpen(false);
                          }}
                          className="w-full text-left px-2 py-1.5 text-[10px] text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded flex items-center justify-between group"
                        >
                          <span className="truncate">{tool.name}</span>
                          <Plus className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" />
                        </button>
                      ))}
                      {customTools.filter(t => !(data.customToolIds || []).includes(t.id)).length === 0 && (
                        <div className="px-2 py-2 text-[9px] text-slate-400 italic text-center">No more tools</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1 min-h-[1.25rem]">
              {(data.customToolIds || []).length > 0 ? (
                data.customToolIds!.map(tid => {
                  const tool = customTools.find(t => t.id === tid);
                  if (!tool) return null;
                  return (
                    <span 
                      key={tid} 
                      className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium rounded border border-emerald-100 dark:border-emerald-800/50 truncate max-w-full flex items-center gap-1 group/chip"
                    >
                      {tool.name}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          updateNodeData(id, { customToolIds: (data.customToolIds || []).filter(sid => sid !== tid) });
                        }}
                        className="opacity-0 group-hover/chip:opacity-100 p-0.5 hover:text-red-500 transition-opacity"
                      >
                        <X className="w-2 h-2" />
                      </button>
                    </span>
                  );
                })
              ) : (
                <span className="text-[9px] text-slate-400 italic">No custom tools</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Top} id="top-target" className="w-2 h-2 bg-gray-400 border-none hover:bg-emerald-500 transition-colors" />
      <Handle type="target" position={Position.Right} id="right-target" className="w-2 h-2 bg-gray-400 border-none hover:bg-emerald-500 transition-colors" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="w-2 h-2 bg-gray-400 border-none hover:bg-emerald-500 transition-colors" />
      <Handle type="target" position={Position.Left} id="left-target" className="w-2 h-2 bg-gray-400 border-none hover:bg-emerald-500 transition-colors" />

      {toolToConfigure && (
        <ToolConfigurationModal
          tool={toolToConfigure}
          isOpen={isToolConfigModalOpen}
          initialConfig={editingToolIndex !== null ? (data.globalToolIds![editingToolIndex] as any).config : undefined}
          onClose={() => {
            setIsToolConfigModalOpen(false);
            setToolToConfigure(null);
            setEditingToolIndex(null);
          }}
          onSave={(config) => {
            const currentIds = [...(data.globalToolIds || [])];
            if (editingToolIndex !== null) {
                currentIds[editingToolIndex] = { id: toolToConfigure.id, config };
            } else {
                currentIds.push({ id: toolToConfigure.id, config });
            }
            updateNodeData(id, { globalToolIds: currentIds });
            setEditingToolIndex(null);
          }}
        />
      )}
    </div>
  );
});
