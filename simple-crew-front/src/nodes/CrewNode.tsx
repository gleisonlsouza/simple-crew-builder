import { memo, useState, useEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals, type NodeProps, type Node } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { Users, Trash2, ChevronDown, ChevronUp, Loader2, CheckCircle2, Link, Settings, Clock, AlertCircle, Server } from 'lucide-react';
import { useStore } from '../store/index';
import { FRAMEWORK_CONFIG } from '../config/frameworks.config';
import type { CrewNodeData, AgentNodeData, StateNodeData } from '../types/nodes.types';

export const CrewNode = memo(({ id, data }: NodeProps<Node<CrewNodeData, 'crew'>>) => {
  const { deleteNode, toggleCollapse, onConnect, setActiveNode, focusNodeTree, currentProjectFramework, updateStateConnection } = useStore(
    useShallow((state) => ({
      deleteNode: state.deleteNode,
      toggleCollapse: state.toggleCollapse,
      onConnect: state.onConnect,
      setActiveNode: state.setActiveNode,
      focusNodeTree: state.focusNodeTree,
      currentProjectFramework: state.currentProjectFramework,
      updateStateConnection: state.updateStateConnection,
    }))
  );

  const [isConnectMenuOpen, setIsConnectMenuOpen] = useState(false);
  const status = useStore((state) => state.nodeStatuses[id] || 'idle');
  const errors = useStore((state) => state.nodeErrors[id]);
  
  // Use targeted selectors to avoid re-rendering on every nodes/edges change
  const layout = useStore(state => state.canvasLayout);
  
  const childCount = useStore((state) => state.edges.filter((edge) => edge.source === id).length);
  
  const stateEdgeInfo = useStore((state) => {
    const edge = state.edges.find(e => e.target === id && state.nodes.find(n => n.id === e.source)?.type === 'state');
    if (!edge) return null;
    return { source: edge.source };
  }, (a, b) => JSON.stringify(a) === JSON.stringify(b));

  const stateNodesOptions = useStore((state) => 
    state.nodes
      .filter(n => n.type === 'state')
      .map(n => ({ id: n.id, name: (n.data as StateNodeData).name })),
    (a, b) => JSON.stringify(a) === JSON.stringify(b)
  );
  
  const agentNodesForConnect = useStore((state) => 
    state.nodes
      .filter(n => n.id !== id && n.type === 'agent')
      .map(n => ({ id: n.id, type: n.type, name: (n.data as AgentNodeData).name })),
    (a, b) => JSON.stringify(a) === JSON.stringify(b)
  );

  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
  }, [layout, id, updateNodeInternals]);

  const isAnyNodeRunning = useStore((state) => 
    Object.values(state.nodeStatuses || {}).some(s => s === 'running')
  );

  // Sync selectedStateId with existing edges if not already set
  useEffect(() => {
    if (data.isSnapshot) return;
    if (!data.selectedStateId && currentProjectFramework === 'langgraph' && stateEdgeInfo) {
      // Use a timeout to avoid collision with other state updates during initial load
      const timer = setTimeout(() => {
        updateStateConnection(id, stateEdgeInfo.source, data.showStateConnections ?? true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [id, data.selectedStateId, currentProjectFramework, stateEdgeInfo, updateStateConnection, data.showStateConnections, data.isSnapshot]);

  // Close menus when clicking outside
  useEffect(() => {
    if (!isConnectMenuOpen) return;
    const handleClick = () => setIsConnectMenuOpen(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isConnectMenuOpen]);

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
            : 'hover:ring-2 hover:ring-violet-400';

  return (
    <div 
      data-testid={`node-crew-${id}`}
      onClick={(e) => { e.stopPropagation(); focusNodeTree(id); }}
      className={`group relative bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700 w-64 overflow-visible cursor-pointer ${statusClasses} ${status === 'running' ? 'running node-running-active' : ''} ${
        (data.isDimmed || (isAnyNodeRunning && status !== 'running'))
          ? 'node-dimmed' 
          : 'opacity-100 transition-opacity duration-300'
      } ${data.isTreeRoot ? 'is-tree-root' : ''}`}
      style={{ 
        '--node-color': '#8b5cf6'
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
      {(status === 'error' || errors?.length > 0) && (
        <div className="absolute -top-2 -right-2 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-md z-20 border border-slate-100 dark:border-slate-800 animate-in zoom-in duration-200">
          <AlertCircle className="w-5 h-5 text-red-500" />
        </div>
      )}

      <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-3 py-2 flex items-center gap-2 rounded-t-xl relative">
        <Users className="w-4 h-4 text-white" />
        <h3 
          className="text-white text-sm font-medium truncate flex-1 cursor-text"
          onClick={(e) => { e.stopPropagation(); focusNodeTree(id); }}
          onDoubleClick={(e) => { e.stopPropagation(); setActiveNode(id); }}
        >
          {data.name || FRAMEWORK_CONFIG[currentProjectFramework || 'crewai']?.labels.crew || 'New Crew'}
        </h3>

        {errors?.length > 0 && (
          <div title={errors.join('\n')} className="text-red-200 hover:text-white cursor-help transition-colors">
            <AlertCircle className="w-4 h-4" />
          </div>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setIsConnectMenuOpen(!isConnectMenuOpen); }}
            className={`p-1 rounded hover:bg-white/20 transition-colors nodrag ${isConnectMenuOpen ? 'bg-white/30 text-white' : 'text-white/70 hover:text-white'}`}
            title="Connect to another node"
            aria-label="Connect Crew to an Agent"
            data-testid="btn-connect-crew"
          >
            <Link className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
            className="p-1 rounded hover:bg-white/20 transition-colors text-white/70 hover:text-white nodrag"
            title="Delete node"
            aria-label="Delete Crew"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setActiveNode(id); }}
            className="p-1 rounded hover:bg-white/20 transition-colors text-white/70 hover:text-white nodrag"
            title="Config Crew"
            aria-label="Config Crew"
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
              {agentNodesForConnect.map(targetNode => (
                <button
                  key={targetNode.id}
                  onClick={() => {
                    onConnect({ 
                      source: id, 
                      target: targetNode.id, 
                      sourceHandle: 'right-source', 
                      targetHandle: 'trigger-in' 
                    });
                    setIsConnectMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded transition-colors truncate flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {targetNode.name || `${targetNode.type} #${targetNode.id.slice(-4)}`}
                </button>
              ))}
              {agentNodesForConnect.length === 0 && (
                <p className="text-[10px] text-slate-400 italic text-center py-2">No agents available.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {(!data.isCollapsed || currentProjectFramework === 'langgraph') && (
        <div className="p-3">
          {currentProjectFramework !== 'langgraph' && (
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-md shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Process:</span>
              <span className="text-xs text-slate-800 dark:text-slate-200 capitalize font-bold" data-testid="crew-process">
                {data.process || 'sequential'}
              </span>
            </div>
          )}

          {childCount > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 w-fit px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
                <Users className="w-3.5 h-3.5 text-purple-500" />
                <span className="font-medium" data-testid="agent-count">{childCount} {childCount === 1 ? 'Agent' : 'Agents'}</span>
              </div>
            </div>
          )}

          {currentProjectFramework === 'langgraph' && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1.5">
                <Server className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">State Connection</span>
              </div>
              <div className="space-y-2">
                <select
                  value={data.selectedStateId || ''}
                  onChange={(e) => updateStateConnection(id, e.target.value || null, data.showStateConnections ?? true)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-purple-500 transition-all shadow-sm"
                >
                  <option value="">No State Connected</option>
                  {stateNodesOptions.map(stateNode => (
                      <option key={stateNode.id} value={stateNode.id}>
                        {stateNode.name || `State #${stateNode.id.slice(-4)}`}
                      </option>
                    ))
                  }
                </select>

                <label className="flex items-center gap-2 cursor-pointer group/toggle nodrag" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={data.showStateConnections ?? true}
                    onChange={(e) => updateStateConnection(id, data.selectedStateId || null, e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 group-hover/toggle:text-slate-700 dark:group-hover/toggle:text-slate-200 transition-colors">
                    Show Connection Line
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {currentProjectFramework !== 'langgraph' && currentProjectFramework !== 'crewai' && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleCollapse(id); }}
          className="absolute -bottom-3 right-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-0.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm z-10 transition-colors text-slate-400 dark:text-slate-500 hover:text-purple-500 dark:hover:text-purple-400"
          aria-label={data.isCollapsed ? 'Expand Crew' : 'Collapse Crew'}
        >
          {data.isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Connection Handles */}
      {(() => {
        const isHorizontal = layout === 'horizontal';
        
        return (
          <>
            {/* Trigger Input Handle */}
            <div className={isHorizontal 
              ? "absolute top-[40%] -left-[1px] -translate-y-1/2 flex items-center gap-2 group/h-trigger -translate-x-full pointer-events-none"
              : "absolute left-[40%] -top-[1px] -translate-x-1/2 flex flex-col items-center gap-2 group/h-trigger -translate-y-full pointer-events-none"
            }>
               <span className="text-[9px] font-bold text-cyan-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-trigger:opacity-100 transition-opacity whitespace-nowrap border border-cyan-100 dark:border-cyan-900/30">Trigger In</span>
                <Handle 
                  type="target" 
                  position={isHorizontal ? Position.Left : Position.Top} 
                  id="trigger-in"
                  className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !static !translate-x-0 !translate-y-0 !cursor-crosshair pointer-events-auto shadow-sm" 
                  style={{ backgroundColor: '#06b6d4' }} 
                />
            </div>

            {/* State Input Handle - LangGraph only */}
            {currentProjectFramework === 'langgraph' && (
              <div className={isHorizontal
                ? "absolute top-[60%] -left-[1px] -translate-y-1/2 flex items-center gap-2 group/h-state -translate-x-full pointer-events-none"
                : "absolute left-[60%] -top-[1px] -translate-x-1/2 flex flex-col items-center gap-2 group/h-state -translate-y-full pointer-events-none"
              }>
                 <span className="text-[9px] font-bold text-purple-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-state:opacity-100 transition-opacity whitespace-nowrap border border-purple-100 dark:border-purple-900/30">State In</span>
                  <Handle 
                    type="target" 
                    position={isHorizontal ? Position.Left : Position.Top} 
                    id="state-in"
                    className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !static !translate-x-0 !translate-y-0 !cursor-crosshair pointer-events-auto shadow-sm" 
                    style={{ backgroundColor: '#a855f7' }} 
                  />
              </div>
            )}

            {/* Exec Flow Output Handle */}
            <div className={isHorizontal
              ? "absolute top-1/2 -right-[1px] -translate-y-1/2 flex items-center gap-2 group/h-exec translate-x-full pointer-events-none"
              : "absolute left-1/2 -bottom-[1px] -translate-x-1/2 flex flex-col items-center gap-2 group/h-exec translate-y-full pointer-events-none"
            }>
               <Handle 
                type="source" 
                position={isHorizontal ? Position.Right : Position.Bottom} 
                id="right-source" 
                className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !static !translate-x-0 !translate-y-0 !cursor-crosshair pointer-events-auto shadow-sm" 
                style={{ backgroundColor: '#a855f7' }} 
              />
               <span className="text-[9px] font-bold text-purple-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-exec:opacity-100 transition-opacity whitespace-nowrap border border-purple-100 dark:border-purple-900/30">Exec Flow</span>
            </div>
          </>
        );
      })()}
    </div>
  );
});
