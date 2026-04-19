import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { GitBranch, Trash2, Settings, ListChecks, Check } from 'lucide-react';
import { useStore } from '../store/index';
import type { RouterNodeData } from '../types/nodes.types';
import type { NodeStatus } from '../types/store.types';

export const RouterNode = memo(({ id, data }: NodeProps<Node<RouterNodeData, 'router'>>) => {
  const { deleteNode, openRouterModal, focusNodeTree } = useStore(
    useShallow((state) => ({
      deleteNode: state.deleteNode,
      openRouterModal: state.openRouterModal,
      focusNodeTree: state.focusNodeTree,
    }))
  );

  const isAnyNodeRunning = useStore((state) => 
    Object.values(state.nodeStatuses || {}).some(s => s === 'running')
  );

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
            : 'hover:ring-2 hover:ring-indigo-400';

  return (
    <div
      data-testid="node-router"
      onClick={(e) => { e.stopPropagation(); focusNodeTree(id); }}
      className={`group relative bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700 w-64 overflow-visible cursor-pointer ${statusClasses} ${status === 'running' ? 'node-running-active' : ''} ${
        (data.isDimmed || (isAnyNodeRunning && status !== 'running'))
          ? 'node-dimmed' 
          : 'opacity-100 transition-opacity duration-300'
      } ${data.isTreeRoot ? 'is-tree-root' : ''}`}
      style={{
        '--node-color': '#6366f1',
      } as React.CSSProperties}
    >
      {/* Execution Input Handle (Top) */}
      <div className="absolute left-1/2 -top-[1px] -translate-x-1/2 flex flex-col items-center gap-2 group/h-router-in -translate-y-full pointer-events-none">
         <span className="text-[9px] font-bold text-indigo-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-router-in:opacity-100 transition-opacity whitespace-nowrap border border-indigo-100 dark:border-indigo-900/30 font-sans">Execution In</span>
          <Handle 
            type="target" 
            position={Position.Top} 
            id="router-in"
            className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !static !translate-x-0 !cursor-crosshair pointer-events-auto shadow-sm" 
            style={{ backgroundColor: '#6366f1' }} 
          />
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-3 py-2 flex items-center gap-2 rounded-t-xl relative">
        <GitBranch className="w-4 h-4 text-white" />
        <h3 
          className="text-white text-sm font-medium truncate flex-1 leading-relaxed cursor-text"
          onClick={(e) => { e.stopPropagation(); focusNodeTree(id); }}
          onDoubleClick={(e) => { e.stopPropagation(); openRouterModal(id); }}
        >
          {data.name || 'Conditional Router'}
        </h3>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
            className="p-1 rounded hover:bg-white/20 transition-colors text-white/70 hover:text-white nodrag"
            title="Delete router"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); openRouterModal(id); }}
            className="p-1 rounded hover:bg-white/20 transition-colors text-white/70 hover:text-white nodrag"
            title="Configure Logic"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Summary - Routes List */}
      <div className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <ListChecks className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paths & Source Handles</span>
          </div>
          
          <div className="flex flex-col gap-2.5 mt-1 relative">
            {/* Dynamic Source Handles per Condition */}
            {(data.conditions || []).map((condition, idx) => {
              const isExecuted = data.executedRoute === 'route-' + condition.id;
              
              return (
                <div 
                  key={condition.id} 
                  className={`relative flex items-center justify-between px-2 py-1.5 rounded-lg border group/route transition-opacity duration-300 ${
                    isExecuted 
                      ? 'bg-green-500/20 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' 
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1">
                    {isExecuted && <Check className="w-3 h-3 text-green-500 animate-in zoom-in duration-300" />}
                    <span className={`text-[10px] font-bold truncate max-w-[120px] pointer-events-none ${
                       isExecuted ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {condition.label || `Path ${idx + 1}`}
                    </span>
                  </div>
                  
                  {/* Specific Source Handle for this route */}
                  <Handle 
                    type="source" 
                    position={Position.Right} 
                    id={`route-${condition.id}`}
                    className={`!w-2.5 !h-2.5 !border-2 !border-white dark:!border-slate-900 !-right-4 !top-1/2 !-translate-y-1/2 !cursor-crosshair shadow-sm transition-transform hover:scale-125 group-hover/route:scale-125 ${
                      isExecuted ? '!bg-green-500' : '!bg-indigo-500'
                    }`} 
                    style={{ backgroundColor: isExecuted ? '#10b981' : '#6366f1' }} 
                  />
                </div>
              );
            })}

            {/* Default Route Handle */}
            {(() => {
              const isDefaultExecuted = data.executedRoute === 'route-default';
              return (
                <div className={`relative flex items-center justify-between px-2 py-1.5 rounded-lg border transition-opacity duration-300 group/default ${
                  isDefaultExecuted 
                    ? 'bg-green-500/20 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' 
                    : 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30 hover:border-indigo-300'
                }`}>
                  <div className="flex items-center gap-2 truncate flex-1">
                    {isDefaultExecuted && <Check className="w-3 h-3 text-green-500 animate-in zoom-in duration-300" />}
                    <span className={`text-[10px] font-bold uppercase tracking-tighter italic ${
                       isDefaultExecuted ? 'text-green-700 dark:text-green-400' : 'text-slate-900 dark:text-slate-200'
                    }`}>
                      {data.defaultRouteLabel || 'Default'}
                    </span>
                  </div>
                  
                  <Handle 
                    type="source" 
                    position={Position.Right} 
                    id="route-default"
                    className={`!w-2.5 !h-2.5 !border-2 !border-white dark:!border-slate-900 !-right-4 !top-1/2 !-translate-y-1/2 !cursor-crosshair shadow-sm transition-transform hover:scale-125 group-hover/default:scale-125 ${
                      isDefaultExecuted ? '!bg-green-500' : '!bg-indigo-600'
                    }`} 
                    style={{ backgroundColor: isDefaultExecuted ? '#10b981' : '#4f46e5' }} 
                  />
                </div>
              );
            })()}
          </div>
        </div>
      </div>
      
      {/* Visual Indicator of non-linear nature */}
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-full opacity-20" />
    </div>
  );
});
