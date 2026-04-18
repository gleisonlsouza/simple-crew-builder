import { memo, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { Settings, Trash2, Settings2, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useStore } from '../store/index';
import type { ToolNodeData } from '../types/nodes.types';
import type { NodeStatus } from '../types/store.types';
import { ToolConfigurationModal } from '../components/ToolConfigurationModal';

export const ToolNode = memo(({ id, data }: NodeProps<Node<ToolNodeData, 'tool'>>) => {
  const { deleteNode, updateNodeData, globalTools, setActiveNode } = useStore(
    useShallow((state) => ({
      deleteNode: state.deleteNode,
      updateNodeData: state.updateNodeData,
      globalTools: state.globalTools,
      setActiveNode: state.setActiveNode,
    }))
  );

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const selectedTool = globalTools.find(t => t.id === data.toolId);
  const requiresConfig = selectedTool?.user_config_schema && Object.keys(selectedTool.user_config_schema.fields).length > 0;

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
    <>
      <div
        onClick={(e) => { e.stopPropagation(); setActiveNode(id); }}
        className={`group relative bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700 w-52 overflow-visible cursor-pointer ${statusClasses} ${status === 'running' ? 'running' : ''} ${
          data.isDimmed 
            ? 'opacity-40 grayscale pointer-events-none transition-all duration-700 scale-95' 
            : 'opacity-100 transition-all duration-500 scale-100'
        }`}
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

        <div className="bg-gradient-to-r from-orange-500 to-amber-600 px-3 py-2 flex items-center gap-2 rounded-t-xl relative">
          <Settings className="w-4 h-4 text-white" />
          <h3 className="text-white text-[11px] font-bold truncate flex-1 uppercase tracking-wider">Global Tool</h3>
          <button
            onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
            className="text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/20 rounded nodrag"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Tool</span>
                {requiresConfig && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsConfigOpen(true); }}
                    className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-orange-500 transiton-colors nodrag"
                    title="Configure Parameters"
                  >
                    <Settings2 className="w-3.5 h-3.5 object-cover" />
                  </button>
                )}
              </div>
              <select
                value={data.toolId || ''}
                onChange={(e) => {
                  const tool = globalTools.find(t => t.id === e.target.value);
                  const needsConfig = tool?.user_config_schema && Object.keys(tool.user_config_schema.fields).length > 0;
                  // Clear config when switching tools
                  updateNodeData(id, { toolId: e.target.value, name: tool?.name || 'Tool', config: undefined });
                  if (needsConfig) {
                    setIsConfigOpen(true);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-all focus:ring-1 focus:ring-blue-500 outline-none shadow-sm text-slate-700 dark:text-slate-300 nodrag"
              >
                <option value="">Select Tool...</option>
                {globalTools.filter(t => t.isEnabled).map(tool => (
                  <option key={tool.id} value={tool.id}>{tool.name}</option>
                ))}
              </select>
            </div>
            
            {selectedTool && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed italic">
                  {selectedTool.description}
                </p>
                {requiresConfig && data.config && Object.keys(data.config).length > 0 && (
                  <div className="mt-2 text-[9px] bg-slate-50 dark:bg-slate-800/30 p-1.5 rounded border border-slate-100 dark:border-slate-700 max-h-16 overflow-y-auto">
                    {Object.entries(data.config).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-1">
                        <span className="text-slate-400 font-medium truncate">{k}:</span>
                        <span className="text-slate-600 dark:text-slate-300 truncate" title={String(v)}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
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

      {requiresConfig && (
        <ToolConfigurationModal
          tool={selectedTool}
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          initialConfig={data.config}
          onSave={(newConfig) => {
            updateNodeData(id, { config: newConfig });
          }}
        />
      )}
    </>
  );
});
