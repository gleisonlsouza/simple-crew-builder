import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { Package, Trash2, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useStore } from '../store/index';
import type { McpNodeData } from '../types/nodes.types';
import type { NodeStatus } from '../types/store.types';

export const McpNode = memo(({ id, data }: NodeProps<Node<McpNodeData, 'mcp'>>) => {
  const { deleteNode, updateNodeData, mcpServers, setActiveNode } = useStore(
    useShallow((state) => ({
      deleteNode: state.deleteNode,
      updateNodeData: state.updateNodeData,
      mcpServers: state.mcpServers,
      setActiveNode: state.setActiveNode,
    }))
  );

  const selectedServer = mcpServers.find(s => s.id === data.serverId);

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

      <div className="bg-gradient-to-r from-pink-500 to-rose-600 px-3 py-2 flex items-center gap-2 rounded-t-xl relative">
        <Package className="w-4 h-4 text-white" />
        <h3 className="text-white text-[11px] font-bold truncate flex-1 uppercase tracking-wider">MCP Server</h3>
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Select Server</span>
            <select
              value={data.serverId || ''}
              onChange={(e) => {
                const server = mcpServers.find(s => s.id === e.target.value);
                updateNodeData(id, { serverId: e.target.value, name: server?.name || 'MCP Server' });
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-all focus:ring-1 focus:ring-orange-500 outline-none shadow-sm text-slate-700 dark:text-slate-300"
            >
              <option value="">Select Server...</option>
              {mcpServers.map(server => (
                <option key={server.id} value={server.id}>{server.name}</option>
              ))}
            </select>
          </div>
          
          {selectedServer && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed italic">
                {selectedServer.url || selectedServer.command || 'Connected'}
              </p>
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-medium uppercase tracking-wider">Status</span>
            <span className={`font-bold flex items-center gap-1 ${
              status === 'running' ? 'text-blue-500' :
              status === 'success' ? 'text-green-500' :
              status === 'error' ? 'text-red-500' :
              status === 'waiting' ? 'text-amber-500' :
              'text-slate-400'
            }`}>
              {status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
              {status === 'success' && <CheckCircle2 className="w-3 h-3" />}
              {status === 'error' && <AlertCircle className="w-3 h-3" />}
              {status === 'waiting' && <Clock className="w-3 h-3" />}
              {status === 'idle' && 'Idle'}
              {status !== 'idle' && <span className="capitalize">{status}</span>}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute left-1/2 -top-[1px] -translate-x-1/2 flex flex-col items-center gap-2 group/h-mcp -translate-y-full pointer-events-none">
          <span className="text-[9px] font-bold text-pink-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-mcp:opacity-100 transition-opacity whitespace-nowrap border border-pink-100 dark:border-pink-900/30">MCP Link</span>
          <Handle 
            type="target" 
            position={Position.Top} 
            id="left-target"
            className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !static !translate-x-0 !cursor-crosshair pointer-events-auto shadow-sm" 
            style={{ backgroundColor: '#ec4899' }} 
          />
      </div>
    </div>
  );
});
