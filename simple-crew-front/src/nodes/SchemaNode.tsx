import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { Trash2, Settings, Brackets, List } from 'lucide-react';
import { useStore } from '../store/index';
import type { SchemaNodeData } from '../types/nodes.types';

export const SchemaNode = memo(({ id, data }: NodeProps<Node<SchemaNodeData, 'schema'>>) => {
  const { deleteNode, openSchemaModal } = useStore(
    useShallow((state) => ({
      deleteNode: state.deleteNode,
      openSchemaModal: state.openSchemaModal,
    }))
  );

  return (
    <div
      data-testid="node-schema"
      onClick={(e) => { e.stopPropagation(); openSchemaModal(id); }}
      className={`group relative bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700 w-60 overflow-visible cursor-pointer ${
        data.isDimmed 
          ? 'opacity-40 pointer-events-none transition-opacity duration-300' 
          : 'opacity-100 transition-opacity duration-300 hover:ring-2 hover:ring-teal-400'
      }`}
      style={{
        '--node-color': '#14b8a6',
      } as React.CSSProperties}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 px-3 py-2 flex items-center gap-2 rounded-t-xl relative">
        <Brackets className="w-4 h-4 text-white" />
        <h3 className="text-white text-sm font-medium truncate flex-1 font-mono uppercase tracking-tighter">
          {data.name || 'Output Schema'}
        </h3>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
            className="p-1 rounded hover:bg-white/20 transition-colors text-white/70 hover:text-white nodrag"
            title="Delete schema"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); openSchemaModal(id); }}
            className="p-1 rounded hover:bg-white/20 transition-colors text-white/70 hover:text-white nodrag"
            title="Edit Fields"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Summary */}
      <div className="p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <List className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pydantic Fields</span>
          </div>
          
          <div className="flex flex-col gap-1.5 mt-1">
            {data.fields && data.fields.length > 0 ? (
              data.fields.slice(0, 3).map((field) => (
                <div key={field.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80px] font-mono">
                    {field.key}
                  </span>
                  <span className="text-[9px] font-bold text-teal-600 uppercase px-1 rounded bg-teal-500/5 whitespace-nowrap">
                    {field.type}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-slate-400 italic">No attributes defined</p>
            )}
            {data.fields && data.fields.length > 3 && (
              <p className="text-[9px] text-slate-400 text-center mt-1">
                + {data.fields.length - 3} more attributes
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Source handle (Bottom) */}
      <div className="absolute left-1/2 -bottom-[1px] -translate-x-1/2 flex flex-col items-center gap-2 group/h-schema translate-y-full pointer-events-none">
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="schema-output" 
          className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !static !translate-x-0 !cursor-crosshair pointer-events-auto shadow-sm" 
          style={{ backgroundColor: '#14b8a6' }} 
        />
        <span className="text-[9px] font-bold text-teal-600 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-schema:opacity-100 transition-opacity whitespace-nowrap border border-teal-100 dark:border-teal-900/30">Schema Out</span>
      </div>
    </div>
  );
});
