import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { CheckSquare, Trash2, Loader2, CheckCircle2, AlertCircle, Clock, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../store/index';
import type { TaskNodeData } from '../types/nodes.types';


export const TaskNode = memo(({ id, data }: NodeProps<Node<TaskNodeData, 'task'>>) => {
  const { deleteNode, toggleCollapse, setActiveNode, focusNodeTree, framework } = useStore(
    useShallow((state) => ({
      deleteNode: state.deleteNode,
      toggleCollapse: state.toggleCollapse,
      setActiveNode: state.setActiveNode,
      focusNodeTree: state.focusNodeTree,
      framework: state.currentProjectFramework,
    }))
  );

  const status = useStore((state) => state.nodeStatuses[id] || 'idle');
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
            : 'hover:ring-2 hover:ring-emerald-400';

  return (
    <div
      data-testid="node-task"
      onClick={(e) => { e.stopPropagation(); focusNodeTree(id); }}
      className={`group relative bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700 w-56 overflow-visible cursor-pointer ${statusClasses} ${status === 'running' ? 'running' : ''} ${
        data.isDimmed 
          ? 'opacity-40 pointer-events-none transition-opacity duration-300' 
          : 'opacity-100 transition-opacity duration-300'
      } ${data.isTreeRoot ? 'is-tree-root' : ''}`}
      style={{
        '--node-color': '#10b981'
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
          onClick={(e) => { e.stopPropagation(); focusNodeTree(id); }}
          onDoubleClick={(e) => { e.stopPropagation(); setActiveNode(id); }}
        >
          {data.name || 'New Task'}
        </h3>

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

      {!data.isCollapsed && (
        <div className="p-3">
          <div className="space-y-1 mb-1">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Description</span>
             <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3" title={data.description}>
               {data.description || 'No description defined'}
             </p>
          </div>
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); toggleCollapse(id); }}
        className="absolute -bottom-3 right-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-0.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm z-10 transition-colors text-slate-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400"
      >
        {data.isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {/* Connection Handle - Task receives Tools (Orange) - CrewAI Only */}
      {framework === 'crewai' && (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="out-tool" 
          className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !cursor-crosshair pointer-events-auto group/h-tool z-10" 
          style={{ backgroundColor: '#f97316', left: '40%' }} 
        >
           <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-orange-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-tool:opacity-100 transition-opacity whitespace-nowrap border border-orange-100 dark:border-orange-900/30 pointer-events-none">Tools</span>
        </Handle>
      )}

      {/* Connection Handle - Task connects to Agent (Purple) */}
      {/* Connection Handle - Task receives from Agent (Blue) */}
      <div className="absolute left-1/2 -top-[1px] -translate-x-1/2 flex flex-col items-center gap-2 group/h-task -translate-y-full pointer-events-none">
          <span className="text-[9px] font-bold text-blue-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-task:opacity-100 transition-opacity whitespace-nowrap border border-blue-100 dark:border-blue-900/30">Task Instruction</span>
          <Handle 
            type="target" 
            position={Position.Top} 
            id="left-target"
            className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !static !translate-x-0 !cursor-crosshair pointer-events-auto shadow-sm" 
            style={{ backgroundColor: '#3b82f6' }} 
          />
      </div>
    </div>
  );
});
