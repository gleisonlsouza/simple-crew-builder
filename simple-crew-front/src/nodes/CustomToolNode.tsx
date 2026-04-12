import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { Terminal, Trash2 } from 'lucide-react';
import { useStore } from '../store/index';
import type { CustomToolNodeData } from '../types/nodes.types';
import type { NodeStatus } from '../types/store.types';

export const CustomToolNode = memo(({ id, data }: NodeProps<Node<CustomToolNodeData, 'customTool'>>) => {
  const { deleteNode, updateNodeData, customTools, setActiveNode } = useStore(
    useShallow((state) => ({
      deleteNode: state.deleteNode,
      updateNodeData: state.updateNodeData,
      customTools: state.customTools,
      setActiveNode: state.setActiveNode,
    }))
  );

  const selectedTool = customTools.find(t => t.id === data.toolId);

  const status = useStore((state) => (state.nodeStatuses[id] as NodeStatus) || 'idle');
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
            : 'hover:ring-2 hover:ring-blue-400';

  return (
    <div
      onClick={(e) => { e.stopPropagation(); setActiveNode(id); }}
      className={`group relative bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700 w-52 overflow-visible transition-all duration-300 cursor-pointer ${statusClasses} ${status === 'running' ? 'running' : ''}`}
    >
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 px-3 py-2 flex items-center gap-2 rounded-t-xl relative">
        <Terminal className="w-4 h-4 text-white" />
        <h3 className="text-white text-[11px] font-bold truncate flex-1 uppercase tracking-wider">Custom Tool</h3>
        <button
          onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
          className="text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/20 rounded"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4">
        <div className="space-y-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Select Tool</span>
            <select
              value={data.toolId || ''}
              onChange={(e) => {
                const tool = customTools.find(t => t.id === e.target.value);
                updateNodeData(id, { toolId: e.target.value, name: tool?.name || 'Tool' });
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-all focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm text-slate-700 dark:text-slate-300"
            >
              <option value="">Select Tool...</option>
              {customTools.map(tool => (
                <option key={tool.id} value={tool.id}>{tool.name}</option>
              ))}
            </select>
          </div>
          
          {selectedTool && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed italic">
                {selectedTool.description}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="absolute left-1/2 -top-[1px] -translate-x-1/2 flex flex-col items-center gap-2 group/h-tool -translate-y-full pointer-events-none">
          <span className="text-[9px] font-bold text-orange-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-tool:opacity-100 transition-opacity whitespace-nowrap border border-orange-100 dark:border-orange-900/30">Tool Link</span>
          <Handle 
            type="target" 
            position={Position.Top} 
            className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !static !translate-x-0 !cursor-crosshair pointer-events-auto shadow-sm" 
            style={{ backgroundColor: '#f97316' }} 
          />
      </div>
    </div>
  );
});
