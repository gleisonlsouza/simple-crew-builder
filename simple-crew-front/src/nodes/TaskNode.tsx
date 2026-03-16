import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { CheckSquare, Trash2, Loader2, CheckCircle2, AlertCircle, Clock, Settings } from 'lucide-react';
import { useStore } from '../store';
import type { TaskNodeData } from '../types';

export const TaskNode = memo(({ id, data }: NodeProps<Node<TaskNodeData, 'task'>>) => {
  const { deleteNode, setActiveNode } = useStore(
    useShallow((state) => ({
      deleteNode: state.deleteNode,
      setActiveNode: state.setActiveNode,
    }))
  );

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
      className={`group relative bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700 w-56 overflow-visible transition-colors transition-shadow duration-300 cursor-pointer ${statusClasses} ${status === 'running' ? 'running' : ''}`}
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

      <div className="p-3">
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2" title={data.description}>
          {data.description || 'No description defined'}
        </p>
      </div>

      <Handle type="target" position={Position.Top} id="top-target" className="w-2 h-2 bg-gray-400 border-none hover:bg-emerald-500 transition-colors" />
      <Handle type="target" position={Position.Right} id="right-target" className="w-2 h-2 bg-gray-400 border-none hover:bg-emerald-500 transition-colors" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="w-2 h-2 bg-gray-400 border-none hover:bg-emerald-500 transition-colors" />
      <Handle type="target" position={Position.Left} id="left-target" className="w-2 h-2 bg-gray-400 border-none hover:bg-emerald-500 transition-colors" />
    </div>
  );
});
