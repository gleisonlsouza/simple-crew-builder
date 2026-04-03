import { memo, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { User, Trash2, ChevronDown, ChevronUp, CheckSquare, Loader2, CheckCircle2, AlertCircle, Clock, Cpu, Link, Settings, Package, Terminal, Plus, X } from 'lucide-react';
import { useStore } from '../store/index';
import type { AgentNodeData } from '../types/nodes.types';
import type { NodeStatus } from '../types/store.types';

import { ToolConfigurationModal } from '../components/ToolConfigurationModal';

export const AgentNode = memo(({ id, data }: NodeProps<Node<AgentNodeData, 'agent'>>) => {
  const { deleteNode, toggleCollapse, updateNodeData, nodes, onConnect, setActiveNode, mcpServers, customTools, globalTools } = useStore(
    useShallow((state) => ({
      deleteNode: state.deleteNode,
      toggleCollapse: state.toggleCollapse,
      updateNodeData: state.updateNodeData,
      nodes: state.nodes,
      onConnect: state.onConnect,
      setActiveNode: state.setActiveNode,
      mcpServers: state.mcpServers,
      customTools: state.customTools,
      globalTools: state.globalTools,
    }))
  );

  const [isConnectMenuOpen, setIsConnectMenuOpen] = useState(false);
  const [isMcpSelectorOpen, setIsMcpSelectorOpen] = useState(false);
  const [isToolSelectorOpen, setIsToolSelectorOpen] = useState(false);
  const [isGlobalSelectorOpen, setIsGlobalSelectorOpen] = useState(false);
  const [isToolConfigModalOpen, setIsToolConfigModalOpen] = useState(false);
  const [toolToConfigure, setToolToConfigure] = useState<any>(null);
  const [editingToolIndex, setEditingToolIndex] = useState<number | null>(null); // Adicionado para edição
  const models = useStore((state) => state.models);
  const status = useStore((state) => (state.nodeStatuses[id] as NodeStatus) || 'idle');
  const errors = useStore((state) => state.nodeErrors[id]);

  const childCount = useStore((state) => state.edges.filter((edge) => edge.source === id).length);

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
            : 'hover:ring-2 hover:ring-blue-400';

  return (
    <div
      className={`group relative bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700 w-56 overflow-visible transition-colors transition-shadow duration-300 cursor-pointer ${statusClasses} ${status === 'running' ? 'running' : ''}`}
      style={{
        '--node-color': '#3b82f6',
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

      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-3 py-2 flex items-center gap-2 rounded-t-xl relative">
        <User className="w-4 h-4 text-white" />
        <h3
          className="text-white text-sm font-medium truncate flex-1 cursor-text"
          onDoubleClick={(e) => { e.stopPropagation(); setActiveNode(id); }}
        >
          {data.name || 'New Agent'}
        </h3>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setIsConnectMenuOpen(!isConnectMenuOpen); }}
            className={`p-1 rounded hover:bg-white/20 transition-colors nodrag ${isConnectMenuOpen ? 'bg-white/30 text-white' : 'text-white/70 hover:text-white'}`}
            title="Connect to another node"
            aria-label="Connect Agent to a Task"
            data-testid="btn-connect-agent"
          >
            <Link className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
            className="p-1 rounded hover:bg-white/20 transition-colors text-white/70 hover:text-white nodrag"
            title="Delete node"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setActiveNode(id); }}
            className="p-1 rounded hover:bg-white/20 transition-colors text-white/70 hover:text-white nodrag"
            title="Config Agent"
            aria-label="Config Agent"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {isConnectMenuOpen && (
          <div
            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-[100] p-2 animate-in fade-in slide-in-from-top-2 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
              {nodes
                .filter(n => n.id !== id && n.type === 'task')
                .map(targetNode => (
                  <button
                    key={targetNode.id}
                    onClick={() => {
                      onConnect({
                        source: id,
                        target: targetNode.id,
                        sourceHandle: 'right-source',
                        targetHandle: 'top-target'
                      });
                      setIsConnectMenuOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors truncate flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {(targetNode.data as any).name || `${targetNode.type} #${targetNode.id.slice(-4)}`}
                  </button>
                ))}
              {nodes.filter(n => n.id !== id && n.type === 'task').length === 0 && (
                <p className="text-[10px] text-slate-400 italic text-center py-2">No tasks available.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2" title={data.goal}>
          {data.goal || 'No goal defined'}
        </p>

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Model</span>
          </div>
          <select
            value={data.modelId || ''}
            onChange={(e) => updateNodeData(id, { modelId: e.target.value || undefined })}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          >
            <option value="">Default ({models.find(m => m.isDefault)?.name || 'Not set'})</option>
            {models.map(model => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>

          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MCP Servers</span>
              </div>
              <div className="relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsMcpSelectorOpen(!isMcpSelectorOpen); }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-amber-500 transition-colors nodrag"
                >
                  <Plus className="w-3 h-3" />
                </button>
                {isMcpSelectorOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-[100] p-1 animate-in fade-in zoom-in-95 duration-150 nodrag">
                    <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700 mb-1">Add MCP Server</div>
                    <div className="max-h-32 overflow-y-auto custom-scrollbar">
                      {mcpServers.filter(s => !(data.mcpServerIds || []).includes(s.id)).map(server => (
                        <button
                          key={server.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            const currentIds = data.mcpServerIds || [];
                            updateNodeData(id, { mcpServerIds: [...currentIds, server.id] });
                            setIsMcpSelectorOpen(false);
                          }}
                          className="w-full text-left px-2 py-1.5 text-[10px] text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded flex items-center justify-between group"
                        >
                          <span className="truncate">{server.name}</span>
                          <Plus className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" />
                        </button>
                      ))}
                      {mcpServers.filter(s => !(data.mcpServerIds || []).includes(s.id)).length === 0 && (
                        <div className="px-2 py-2 text-[9px] text-slate-400 italic text-center">No more servers</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1 min-h-[1.25rem]">
              {(data.mcpServerIds || []).length > 0 ? (
                (data.mcpServerIds || []).map(mid => {
                  const server = mcpServers.find(s => s.id === mid);
                  if (!server) return null;
                  return (
                    <span 
                      key={mid} 
                      className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] font-medium rounded border border-amber-100 dark:border-amber-800/50 truncate max-w-full flex items-center gap-1 group/chip"
                    >
                      {server.name}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          updateNodeData(id, { mcpServerIds: (data.mcpServerIds || []).filter(sid => sid !== mid) });
                        }}
                        className="opacity-0 group-hover/chip:opacity-100 p-0.5 hover:text-red-500 transition-opacity"
                      >
                        <X className="w-2 h-2" />
                      </button>
                    </span>
                  );
                })
              ) : (
                <span className="text-[9px] text-slate-400 italic">No MCP servers</span>
              )}
            </div>
          </div>

          <div className="mt-2 space-y-1.5">
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
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-[100] p-1 animate-in fade-in zoom-in-95 duration-150 nodrag">
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
                (data.customToolIds || []).map(tid => {
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

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
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
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-[100] p-1 animate-in fade-in zoom-in-95 duration-150 nodrag">
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
        </div>

        {childCount > 0 && (
          <div className="mt-2 flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 w-fit px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
              <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-medium">{childCount} {childCount === 1 ? 'Task' : 'Tasks'}</span>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); toggleCollapse(id); }}
        className="absolute -bottom-3 right-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-0.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm z-10 transition-colors text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400"
      >
        {data.isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      <Handle type="target" position={Position.Top} id="top-target" className="w-2 h-2 bg-gray-400 border-none hover:bg-blue-500 transition-colors" />
      <Handle type="source" position={Position.Top} id="top-source" className="w-2 h-2 bg-gray-400 border-none hover:bg-blue-500 transition-colors" />
      <Handle type="target" position={Position.Right} id="right-target" className="w-2 h-2 bg-gray-400 border-none hover:bg-blue-500 transition-colors" />
      <Handle type="source" position={Position.Right} id="right-source" className="w-2 h-2 bg-gray-400 border-none hover:bg-blue-500 transition-colors" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="w-2 h-2 bg-gray-400 border-none hover:bg-blue-500 transition-colors" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="w-2 h-2 bg-gray-400 border-none hover:bg-blue-500 transition-colors" />
      <Handle type="target" position={Position.Left} id="left-target" className="w-2 h-2 bg-gray-400 border-none hover:bg-blue-500 transition-colors" />
      <Handle type="source" position={Position.Left} id="left-source" className="w-2 h-2 bg-gray-400 border-none hover:bg-blue-500 transition-colors" />

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

      {/* Global Click Handler to close menus */}
      {(isMcpSelectorOpen || isToolSelectorOpen || isGlobalSelectorOpen) && (
        <div 
          className="fixed inset-0 z-[50] nodrag cursor-default" 
          onClick={(e) => { e.stopPropagation(); setIsMcpSelectorOpen(false); setIsToolSelectorOpen(false); setIsGlobalSelectorOpen(false); }} 
        />
      )}
    </div>
  );
});
