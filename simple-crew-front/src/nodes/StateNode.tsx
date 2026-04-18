import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { Trash2, Settings, Server, List } from 'lucide-react';
import { useStore } from '../store/index';
import type { StateNodeData } from '../types/nodes.types';

export const StateNode = memo(({ id, data }: NodeProps<Node<StateNodeData, 'state'>>) => {
  const { deleteNode, openStateModal } = useStore(
    useShallow((state) => ({
      deleteNode: state.deleteNode,
      openStateModal: state.openStateModal,
    }))
  );

  return (
    <div
      data-testid="node-state"
      onClick={(e) => { e.stopPropagation(); openStateModal(id); }}
      className={`group relative bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700 w-60 overflow-visible cursor-pointer ${
        data.isDimmed 
          ? 'opacity-40 grayscale pointer-events-none transition-all duration-700 scale-95' 
          : 'opacity-100 transition-all duration-500 scale-100 hover:ring-2 hover:ring-purple-400'
      }`}
      style={{
        '--node-color': '#a855f7',
      } as React.CSSProperties}
    >


      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-3 py-2 flex items-center gap-2 rounded-t-xl relative">
        <Server className="w-4 h-4 text-white" />
        <h3 className="text-white text-sm font-medium truncate flex-1">
          {data.name || 'Application State'}
        </h3>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
            className="p-1 rounded hover:bg-white/20 transition-colors text-white/70 hover:text-white nodrag"
            title="Delete state"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); openStateModal(id); }}
            className="p-1 rounded hover:bg-white/20 transition-colors text-white/70 hover:text-white nodrag"
            title="Edit Schema"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Summary */}
      <div className="p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <List className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Schema Summary</span>
          </div>
          
          <div className="flex flex-col gap-1.5 mt-1">
            {data.fields && data.fields.length > 0 ? (
              data.fields.slice(0, 3).map((field) => (
                <div key={field.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80px]">
                    {field.key}
                  </span>
                  <span className="text-[9px] font-bold text-purple-500 uppercase px-1 rounded bg-purple-500/5 whitespace-nowrap">
                    {field.type}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-slate-400 italic">No fields defined</p>
            )}
            {data.fields && data.fields.length > 3 && (
              <p className="text-[9px] text-slate-400 text-center mt-1">
                + {data.fields.length - 3} more fields
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Source handle (Bottom) */}
      <div className="absolute left-1/2 -bottom-[1px] -translate-x-1/2 flex flex-col items-center gap-2 group/h-state translate-y-full pointer-events-none">
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="state-out" 
          className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !static !translate-x-0 !cursor-crosshair pointer-events-auto shadow-sm" 
          style={{ backgroundColor: '#a855f7' }} 
        />
        <span className="text-[9px] font-bold text-purple-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-state:opacity-100 transition-opacity whitespace-nowrap border border-purple-100 dark:border-purple-900/30">State Out</span>
      </div>
    </div>
  );
});
