import { memo, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShallow } from 'zustand/shallow';
import { Users, Trash2, ChevronDown, ChevronUp, Loader2, CheckCircle2, Link, Settings } from 'lucide-react';
import { useStore } from '../store/index';
import type { CrewNodeData } from '../types/nodes.types';

export const CrewNode = memo(({ id, data }: NodeProps<Node<CrewNodeData, 'crew'>>) => {
  const { deleteNode, toggleCollapse, nodes, onConnect, setActiveNode } = useStore(
    useShallow((state) => ({
      deleteNode: state.deleteNode,
      toggleCollapse: state.toggleCollapse,
      nodes: state.nodes,
      onConnect: state.onConnect,
      setActiveNode: state.setActiveNode,
    }))
  );

  const [isConnectMenuOpen, setIsConnectMenuOpen] = useState(false);
  const status = useStore((state) => state.nodeStatuses[id] || 'idle');
  const errors = useStore((state) => state.nodeErrors[id]);
  const childCount = useStore((state) => state.edges.filter((edge) => edge.source === id).length);

  const statusClasses = errors?.length
    ? 'ring-2 ring-red-400 ring-offset-2'
    : status === 'running'
      ? 'ring-2 ring-blue-500 ring-offset-2 animate-pulse'
      : status === 'success'
        ? 'ring-2 ring-green-500 ring-offset-2'
        : 'hover:ring-2 hover:ring-violet-400';

  return (
    <div 
      className={`group relative bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700 w-48 overflow-visible transition-colors transition-shadow duration-300 cursor-pointer ${statusClasses} ${status === 'running' ? 'running' : ''}`}
      style={{ 
        '--node-color': '#8b5cf6',
        backfaceVisibility: 'hidden',
        transformStyle: 'preserve-3d',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'optimizeLegibility'
      } as React.CSSProperties}
    >

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

      <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-3 py-2 flex items-center gap-2 rounded-t-xl relative">
        <Users className="w-4 h-4 text-white" />
        <h3 
          className="text-white text-sm font-medium truncate flex-1 cursor-text"
          onDoubleClick={(e) => { e.stopPropagation(); setActiveNode(id); }}
        >
          Crew
        </h3>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setIsConnectMenuOpen(!isConnectMenuOpen); }}
            className={`p-1 rounded hover:bg-white/20 transition-colors nodrag ${isConnectMenuOpen ? 'bg-white/30 text-white' : 'text-white/70 hover:text-white'}`}
            title="Connect to another node"
            aria-label="Connect Crew to an Agent"
            data-testid="btn-connect-crew"
          >
            <Link className="w-4 h-4" />
          </button>
          
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
            title="Configurar Crew"
            aria-label="Configurar Crew"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {isConnectMenuOpen && (
          <div 
            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-[100] p-2 animate-in fade-in slide-in-from-top-2 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
              {nodes
                .filter(n => n.id !== id && n.type === 'agent')
                .map(targetNode => (
                <button
                  key={targetNode.id}
                  onClick={() => {
                    onConnect({ 
                      source: id, 
                      target: targetNode.id, 
                      sourceHandle: 'right-source', 
                      targetHandle: 'top-target' 
                    });
                    setIsConnectMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded transition-colors truncate flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {(targetNode.data as any).name || `${targetNode.type} #${targetNode.id.slice(-4)}`}
                </button>
              ))}
              {nodes.filter(n => n.id !== id && n.type === 'agent').length === 0 && (
                <p className="text-[10px] text-slate-400 italic text-center py-2">No agents available.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-md shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Process:</span>
          <span className="text-xs text-slate-800 dark:text-slate-200 capitalize font-bold">
            {data.process}
          </span>
        </div>

        {childCount > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 w-fit px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
              <Users className="w-3.5 h-3.5 text-purple-500" />
              <span className="font-medium">{childCount} {childCount === 1 ? 'Agent' : 'Agents'}</span>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); toggleCollapse(id); }}
        className="absolute -bottom-3 right-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-0.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm z-10 transition-colors text-slate-400 dark:text-slate-500 hover:text-purple-500 dark:hover:text-purple-400"
      >
        {data.isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {/* Inputs (Targets) */}
      <Handle type="target" position={Position.Left} id="left-target" className="w-2 h-2 bg-gray-400 border-none hover:bg-violet-500 transition-colors" />

      {/* Outputs (Sources) */}
      <Handle type="source" position={Position.Top} id="top-source" className="w-2 h-2 bg-gray-400 border-none hover:bg-violet-500 transition-colors" />
      <Handle type="source" position={Position.Right} id="right-source" className="w-2 h-2 bg-gray-400 border-none hover:bg-violet-500 transition-colors" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="w-2 h-2 bg-gray-400 border-none hover:bg-violet-500 transition-colors" />
      <Handle type="source" position={Position.Left} id="left-source" className="w-2 h-2 bg-gray-400 border-none hover:bg-violet-500 transition-colors ml-3" />
    </div>
  );
});
