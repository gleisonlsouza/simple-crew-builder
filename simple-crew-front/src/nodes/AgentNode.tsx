import { memo, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { User, Trash2, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle, Clock, Cpu, Settings, Server, CheckSquare, Wrench } from 'lucide-react';
import { useStore } from '../store/index';
import type { AgentNodeData, StateNodeData, StateField } from '../types/nodes.types';
import type { NodeStatus } from '../types/store.types';



export const AgentNode = memo(({ id, data }: NodeProps<Node<AgentNodeData, 'agent'>>) => {
  const { deleteNode, toggleCollapse, updateNodeData, setActiveNode, focusNodeTree, updateStateConnection } = useStore(
    useShallow((state) => ({
      deleteNode: state.deleteNode,
      toggleCollapse: state.toggleCollapse,
      updateNodeData: state.updateNodeData,
      setActiveNode: state.setActiveNode,
      focusNodeTree: state.focusNodeTree,
      updateStateConnection: state.updateStateConnection,
    }))
  );


  const models = useStore((state) => state.models);
  const status = useStore((state) => (state.nodeStatuses[id] as NodeStatus) || 'idle');
  const errors = useStore((state) => state.nodeErrors[id]);
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const currentProjectFramework = useStore((state) => state.currentProjectFramework);
  
  const tasksCount = edges.filter(e => e.source === id && e.sourceHandle === 'out-task').length;
  const toolsCount = edges.filter(e => e.source === id && e.sourceHandle === 'out-tool').length;
  const mcpCount = edges.filter(e => e.source === id && e.sourceHandle === 'out-mcp').length;

  // Sync selectedStateId with existing edges if not already set
  useEffect(() => {
    if (!data.selectedStateId && currentProjectFramework === 'langgraph') {
      const stateEdge = edges.find(e => e.source === id && nodes.find(n => n.id === e.target)?.type === 'state');
      if (stateEdge) {
        let fieldKey = null;
        if (stateEdge.targetHandle?.startsWith('field-in-')) {
          fieldKey = stateEdge.targetHandle.replace('field-in-', '');
        }
        
        const timer = setTimeout(() => {
          updateStateConnection(id, stateEdge.target, data.showStateConnections ?? true, fieldKey);
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [id, data.selectedStateId, currentProjectFramework, edges, nodes, updateStateConnection, data.showStateConnections]);



  const statusClasses = errors?.length
    ? 'ring-2 ring-red-400 ring-offset-2'
    : status === 'waiting'
      ? 'ring-2 ring-amber-400/50 ring-offset-1'
      : status === 'running'
        ? 'ring-2 ring-blue-500 ring-offset-4 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]'
        : status === 'success'
          ? 'ring-2 ring-green-500 ring-offset-2 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
          : status === 'error'
            ? 'ring-2 ring-red-500 ring-offset-2 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
            : 'hover:ring-2 hover:ring-blue-400';

  return (
    <div
      data-testid="node-agent"
      onClick={(e) => { e.stopPropagation(); focusNodeTree(id); }}
      className={`group relative bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700 w-64 overflow-visible cursor-pointer ${statusClasses} ${status === 'running' ? 'running' : ''} ${
        data.isDimmed 
          ? 'opacity-40 pointer-events-none transition-opacity duration-300' 
          : 'opacity-100 transition-opacity duration-300'
      } ${data.isTreeRoot ? 'is-tree-root' : ''}`}
      style={{
        '--node-color': '#3b82f6'
      } as React.CSSProperties}
    >
      {/* Main Execution Flow Handle (Top) */}
      <div className="absolute left-[40%] -top-[1px] -translate-x-1/2 flex flex-col items-center gap-2 group/h-crew -translate-y-full pointer-events-none">
         <span className="text-[9px] font-bold text-blue-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-crew:opacity-100 transition-opacity whitespace-nowrap border border-blue-100 dark:border-blue-900/30">Execution In</span>
         <Handle 
           type="target" 
           position={Position.Top} 
           id="agent-in" 
           className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !static !translate-x-0 !cursor-crosshair pointer-events-auto shadow-sm" 
           style={{ backgroundColor: '#2563eb' }} 
         />
      </div>

      {/* Structured Output Schema Handle (Top) */}
      <div className="absolute left-[60%] -top-[1px] -translate-x-1/2 flex flex-col items-center gap-2 group/h-schema -translate-y-full pointer-events-none">
         <span className="text-[9px] font-bold text-teal-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-schema:opacity-100 transition-opacity whitespace-nowrap border border-teal-100 dark:border-teal-900/30">Schema In</span>
         <Handle 
           type="target" 
           position={Position.Top} 
           id="schema-input" 
           className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !static !translate-x-0 !cursor-crosshair pointer-events-auto shadow-sm" 
           style={{ backgroundColor: '#14b8a6' }} 
         />
      </div>

      {/* Handles at the Bottom (Sources for Delegation & Flow) */}
      <>
        {/* Task Handle - 16% */}
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="out-task" 
          className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !cursor-crosshair pointer-events-auto group/h-task z-10" 
          style={{ backgroundColor: '#3b82f6', left: '16%' }} 
        >
           <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-blue-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-task:opacity-100 transition-opacity whitespace-nowrap border border-blue-100 dark:border-blue-900/30 pointer-events-none">Tasks</span>
        </Handle>
        
        {/* Tool Handle - 33% */}
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="out-tool" 
          className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !cursor-crosshair pointer-events-auto group/h-tool z-10" 
          style={{ backgroundColor: '#f97316', left: '33%' }} 
        >
           <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-orange-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-tool:opacity-100 transition-opacity whitespace-nowrap border border-orange-100 dark:border-orange-900/30 pointer-events-none">Tools</span>
        </Handle>

        {/* MCP Handle - 50% */}
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="out-mcp" 
          className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !cursor-crosshair pointer-events-auto group/h-mcp z-10" 
          style={{ backgroundColor: '#ec4899', left: '50%' }} 
        >
           <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-pink-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-mcp:opacity-100 transition-opacity whitespace-nowrap border border-pink-100 dark:border-pink-900/30 pointer-events-none">MCP</span>
        </Handle>

        {/* Data Output Handle - 67% */}
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="data-out" 
          className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !cursor-crosshair pointer-events-auto group/h-data-out z-10" 
          style={{ backgroundColor: '#a855f7', left: '67%' }} 
        >
           <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-purple-600 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-data-out:opacity-100 transition-opacity whitespace-nowrap border border-purple-100 dark:border-purple-900/30 pointer-events-none uppercase">Data Out</span>
        </Handle>

        {/* Execution Output Handle - 84% */}
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="agent-out" 
          className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !cursor-crosshair pointer-events-auto group/h-agent-out z-10 font-bold" 
          style={{ backgroundColor: '#2563eb', left: '84%' }} 
        >
           <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-blue-600 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-agent-out:opacity-100 transition-opacity whitespace-nowrap border border-blue-100 dark:border-blue-900/30 pointer-events-none uppercase">Execution Out</span>
        </Handle>
      </>

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
          onClick={(e) => { e.stopPropagation(); focusNodeTree(id); }}
          onDoubleClick={(e) => { e.stopPropagation(); setActiveNode(id); }}
        >
          {data.name || 'New Agent'}
        </h3>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
      </div>

      <div className="p-4">
        <div className="space-y-1 mb-4">
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Goal</span>
           <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2" title={data.goal}>
             {data.goal || 'No goal defined'}
           </p>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Model</span>
            </div>
            <select
              value={data.modelId || ''}
              onChange={(e) => updateNodeData(id, { modelId: e.target.value || undefined })}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 transition-[opacity,filter,color,background-color,border-color] shadow-sm"
            >
              <option value="">Default ({models.find(m => m.isDefault)?.name || 'Not set'})</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-1.5">
              <Server className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">State Connection</span>
            </div>
            <div className="space-y-2">
              <select
                value={data.selectedStateId ? `${data.selectedStateId}${data.selectedStateKey ? `:${data.selectedStateKey}` : ''}` : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    updateStateConnection(id, null, data.showStateConnections ?? true);
                  } else {
                    const [stateId, key] = val.split(':');
                    updateStateConnection(id, stateId, data.showStateConnections ?? true, key || null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-purple-500 transition-all shadow-sm"
              >
                <option value="">No State Connected</option>
                {nodes
                  .filter(n => n.type === 'state')
                  .flatMap(stateNode => {
                    const stateData = stateNode.data as StateNodeData;
                    const fields = stateData.fields || [];
                    const stateName = stateData.name || `State #${stateNode.id.slice(-4)}`;
                    
                    if (fields.length === 0) {
                      return [<option key={stateNode.id} value={stateNode.id}>{stateName} (Entire State)</option>];
                    }
                    
                    return fields.map((f: StateField) => (
                      <option key={`${stateNode.id}-${f.key}`} value={`${stateNode.id}:${f.key}`}>
                        {stateName} &gt; {f.key}
                      </option>
                    ));
                  })
                }
              </select>

              <label className="flex items-center gap-2 cursor-pointer group/toggle nodrag" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={data.showStateConnections ?? true}
                  onChange={(e) => updateStateConnection(id, data.selectedStateId || null, e.target.checked, data.selectedStateKey || null)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 group-hover/toggle:text-slate-700 dark:group-hover/toggle:text-slate-200 transition-colors">
                  Show Connection Line
                </span>
              </label>

          {data.isCollapsed && currentProjectFramework === 'langgraph' && (tasksCount > 0 || toolsCount > 0 || mcpCount > 0) && (
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-3">
                {tasksCount > 0 && (
                  <div className="flex items-center gap-1.5" title={`${tasksCount} tasks recolhidas`}>
                    <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{tasksCount}</span>
                  </div>
                )}
                {toolsCount > 0 && (
                  <div className="flex items-center gap-1.5" title={`${toolsCount} ferramentas recolhidas`}>
                    <Wrench className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{toolsCount}</span>
                  </div>
                )}
                {mcpCount > 0 && (
                  <div className="flex items-center gap-1.5" title={`${mcpCount} servidores MCP recolhidos`}>
                    <Server className="w-3.5 h-3.5 text-pink-500" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{mcpCount}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  </div>

      <button
        onClick={(e) => { 
          e.stopPropagation(); 
          const allowedHandles = currentProjectFramework === 'langgraph' 
            ? ['out-task', 'out-tool', 'out-mcp'] 
            : undefined;
          toggleCollapse(id, allowedHandles); 
        }}
        className="absolute -bottom-3 right-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-0.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm z-10 transition-colors text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400"
      >
        {data.isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

    </div>
  );
});
