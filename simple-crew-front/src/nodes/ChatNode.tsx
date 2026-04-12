import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { MessageCircle, Trash2, Settings } from 'lucide-react';
import { useStore } from '../store/index';
import type { ChatNodeData } from '../types/nodes.types';

export const ChatNode = memo(({ id, data }: NodeProps<Node<ChatNodeData, 'chat'>>) => {
  const { deleteNode, setActiveNode } = useStore(
    useShallow((state) => ({
      deleteNode: state.deleteNode,
      setActiveNode: state.setActiveNode,
    }))
  );

  return (
    <div 
      className="group relative bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700 w-48 overflow-visible transition-colors transition-shadow duration-300 cursor-pointer hover:ring-2 hover:ring-cyan-400"
      onClick={() => setActiveNode(id)}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 px-3 py-2 flex items-center gap-2 rounded-t-xl relative">
        <MessageCircle className="w-4 h-4 text-white" />
        <h3 className="text-white text-sm font-medium truncate flex-1 cursor-text">
          {data.name || 'Chat Trigger'}
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
            title="Config Node"
            aria-label="Config Node"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-3 line-clamp-2">
          {data.description || 'Aguardando mensagem do usuário...'}
        </p>
        
        <button
          type="button"
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-600 dark:text-cyan-400 text-xs font-semibold rounded-lg transition-colors nodrag"
          onClick={(e) => {
            e.stopPropagation();
            useStore.getState().setIsChatVisible(true);
          }}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Open Chat
        </button>
      </div>

      {/* Output Handle (Bottom) */}
      <div className="absolute left-1/2 -bottom-[1px] -translate-x-1/2 flex flex-col items-center gap-1 group/h-chat translate-y-full pointer-events-none">
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="right-source" 
          className="!w-3 !h-3 !border-2 !border-white dark:!border-slate-900 !static !translate-x-0 !cursor-crosshair pointer-events-auto shadow-sm"
          style={{ backgroundColor: '#06b6d4' }}
        />
        <span className="text-[9px] font-bold text-cyan-500 bg-white dark:bg-slate-900 px-1 rounded shadow-sm opacity-0 group-hover/h-chat:opacity-100 transition-opacity whitespace-nowrap border border-cyan-100 dark:border-cyan-900/30">Connect Crew</span>
      </div>
    </div>
  );
});
