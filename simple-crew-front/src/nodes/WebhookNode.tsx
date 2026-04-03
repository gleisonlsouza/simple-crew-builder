import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { Globe, Trash2, Settings, AlertCircle, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/index';
import type { WebhookNodeData } from '../types/nodes.types';
import type { NodeStatus } from '../types/store.types';

export const WebhookNode = memo(({ id, data }: NodeProps<Node<WebhookNodeData, 'webhook'>>) => {
  const { deleteNode, setActiveNode, updateNodeData } = useStore(
    useShallow((state) => ({
      deleteNode: state.deleteNode,
      setActiveNode: state.setActiveNode,
      updateNodeData: state.updateNodeData,
    }))
  );

  const status = useStore((state) => (state.nodeStatuses[id] as NodeStatus) || 'idle');
  const errors = useStore((state) => state.nodeErrors[id]);

  const statusClasses = errors?.length
    ? 'ring-2 ring-red-400 ring-offset-2'
    : status === 'waiting'
      ? 'ring-2 ring-amber-400/50 ring-offset-1'
      : status === 'running'
        ? 'ring-2 ring-orange-500 ring-offset-2 animate-pulse'
        : status === 'success'
          ? 'ring-2 ring-green-500 ring-offset-2'
          : status === 'error'
            ? 'ring-2 ring-red-500 ring-offset-2'
            : 'hover:ring-2 hover:ring-orange-400';

  return (
    <div
      className={`group relative bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700 w-56 overflow-visible transition-colors transition-shadow duration-300 cursor-pointer ${statusClasses}`}
      style={{
        '--node-color': '#f97316',
      } as React.CSSProperties}
    >
      {status === 'waiting' && (
        <div className="absolute -top-2 -right-2 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-md z-20 border border-slate-100 dark:border-slate-800 animate-in zoom-in duration-200">
          <Clock className="w-5 h-5 text-amber-500" />
        </div>
      )}
      {status === 'running' && (
        <div className="absolute -top-2 -right-2 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-md z-20 border border-slate-100 dark:border-slate-800">
          <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
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
        <Globe className="w-4 h-4 text-white" />
        <h3
          className="text-white text-sm font-medium truncate flex-1 cursor-text"
          onDoubleClick={(e) => { e.stopPropagation(); setActiveNode(id); }}
        >
          {data.name || 'New Webhook'}
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
            title="Config Webhook"
            aria-label="Config Webhook"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-800/10">
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 cursor-pointer group/toggle nodrag">
            <div className="relative flex items-center">
              <input 
                type="checkbox" 
                className="sr-only"
                checked={data.isActive !== false}
                onChange={(e) => updateNodeData(id, { isActive: e.target.checked })}
              />
              <div className={`w-7 h-3.5 bg-brand-bg border border-brand-border rounded-full transition-colors ${data.isActive !== false ? 'bg-orange-500/20 border-orange-500' : ''}`}>
                <div className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full transition-transform ${data.isActive !== false ? 'translate-x-3.5 bg-orange-500' : 'bg-brand-muted'}`} />
              </div>
            </div>
            <span className="text-[9px] text-brand-text uppercase font-bold group-hover/toggle:text-orange-500 transition-colors">Active</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer group/toggle nodrag">
            <div className="relative flex items-center">
              <input 
                type="checkbox" 
                className="sr-only"
                checked={data.waitForResult === true}
                onChange={(e) => updateNodeData(id, { waitForResult: e.target.checked })}
              />
              <div className={`w-7 h-3.5 bg-brand-bg border border-brand-border rounded-full transition-colors ${data.waitForResult === true ? 'bg-orange-500/20 border-orange-500' : ''}`}>
                <div className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full transition-transform ${data.waitForResult === true ? 'translate-x-3.5 bg-orange-500' : 'bg-brand-muted'}`} />
              </div>
            </div>
            <span className="text-[9px] text-brand-text uppercase font-bold group-hover/toggle:text-orange-500 transition-colors" title="Sync mode">Wait</span>
          </label>
        </div>
      </div>

      <div className="p-3">
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
          {data.method || 'POST'} {data.path ? `• /${data.path}` : '• No Path'}
        </p>
        <div className="mt-1 text-[9px] text-slate-400 italic">
          Trigger externally via HTTP
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} id="bottom-source" className="w-2 h-2 bg-gray-400 border-none hover:bg-orange-500 transition-colors" />
      <Handle type="source" position={Position.Right} id="right-source" className="w-2 h-2 bg-gray-400 border-none hover:bg-orange-500 transition-colors" />
    </div>
  );
});
