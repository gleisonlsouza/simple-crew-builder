import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { User, Trash2, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle, Clock, Cpu, Settings } from 'lucide-react';
import { useStore } from '../store/index';
import type { AgentNodeData } from '../types/nodes.types';
import type { NodeStatus } from '../types/store.types';



export const AgentNode = memo(({ id, data }: NodeProps<Node<AgentNodeData, 'agent'>>) => {
  const { deleteNode, toggleCollapse, updateNodeData, setActiveNode } = useStore(
    useShallow((state) => ({
      deleteNode: state.deleteNode,
      toggleCollapse: state.toggleCollapse,
      updateNodeData: state.updateNodeData,
      setActiveNode: state.setActiveNode,
    }))
  );


  const models = useStore((state) => state.models);
  const status = useStore((state) => (state.nodeStatuses[id] as NodeStatus) || 'idle');
  const errors = useStore((state) => state.nodeErrors[id]);



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
      onClick={(e) => { e.stopPropagation(); setActiveNode(id); }}
      className={`group relative bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700 w-64 overflow-visible cursor-pointer ${statusClasses} ${status === 'running' ? 'running' : ''} ${
        data.isDimmed 
          ? 'opacity-40 grayscale pointer-events-none transition-all duration-700 scale-95' 
          : 'opacity-100 transition-all duration-500 scale-100'
      }`}
      style={{
        '--node-color': '#3b82f6',
        backfaceVisibility: 'hidden',
        transformStyle: 'preserve-3d',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'optimizeLegibility'
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
        {/* Task Handle - 20% */}
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="out-task" 
          className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !cursor-crosshair pointer-events-auto group/h-task z-10" 
          style={{ backgroundColor: '#3b82f6', left: '20%' }} 
        >
           <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-blue-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-task:opacity-100 transition-opacity whitespace-nowrap border border-blue-100 dark:border-blue-900/30 pointer-events-none">Tasks</span>
        </Handle>
        
        {/* Tool Handle - 40% */}
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="out-tool" 
          className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !cursor-crosshair pointer-events-auto group/h-tool z-10" 
          style={{ backgroundColor: '#f97316', left: '40%' }} 
        >
           <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-orange-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-tool:opacity-100 transition-opacity whitespace-nowrap border border-orange-100 dark:border-orange-900/30 pointer-events-none">Tools</span>
        </Handle>

        {/* MCP Handle - 60% */}
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="out-mcp" 
          className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !cursor-crosshair pointer-events-auto group/h-mcp z-10" 
          style={{ backgroundColor: '#ec4899', left: '60%' }} 
        >
           <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-pink-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-mcp:opacity-100 transition-opacity whitespace-nowrap border border-pink-100 dark:border-pink-900/30 pointer-events-none">MCP</span>
        </Handle>

        {/* Execution Output Handle - 80% */}
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="agent-out" 
          className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !cursor-crosshair pointer-events-auto group/h-agent-out z-10 font-bold" 
          style={{ backgroundColor: '#2563eb', left: '80%' }} 
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
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
            >
              <option value="">Default ({models.find(m => m.isDefault)?.name || 'Not set'})</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); toggleCollapse(id); }}
        className="absolute -bottom-3 right-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-0.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm z-10 transition-colors text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400"
      >
        {data.isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

    </div>
  );
});
