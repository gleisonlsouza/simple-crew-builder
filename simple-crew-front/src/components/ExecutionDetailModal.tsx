import React from 'react';
import { 
  X, 
  Play, 
  Clipboard, 
  Check, 
  ExternalLink,
  Zap,
  MessageSquare,
  Clock,
  History,
  FileJson
} from 'lucide-react';
import type { Execution } from '../types/store.types';
import { SnapshotFlow } from './SnapshotFlow';
import { ReactFlowProvider } from '@xyflow/react';

interface ExecutionDetailModalProps {
  execution: Execution | null;
  isOpen: boolean;
  onClose: () => void;
  onReRun: (execution: Execution) => void;
}

export const ExecutionDetailModal: React.FC<ExecutionDetailModalProps> = ({ 
  execution, 
  isOpen, 
  onClose, 
  onReRun 
}) => {
  const [activeTab, setActiveTab] = React.useState<'input' | 'output' | 'snapshot'>('input');
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !execution) return null;

  const handleCopy = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-emerald-500 bg-emerald-500/10';
      case 'error': return 'text-rose-500 bg-rose-500/10';
      default: return 'text-indigo-500 bg-indigo-500/10';
    }
  };

  const renderJson = (data: any) => {
    if (!data) return <div className="text-brand-muted italic py-4">No data available.</div>;
    return (
      <div className="relative group">
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => handleCopy(data)}
            className="p-1.5 bg-brand-bg border border-brand-border rounded-lg text-brand-muted hover:text-brand-text transition-colors"
            title="Copy JSON"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Clipboard className="w-4 h-4" />}
          </button>
        </div>
        <pre className="p-4 bg-slate-950 text-indigo-300 rounded-xl overflow-x-auto text-sm font-mono leading-relaxed border border-brand-border/50 max-h-[400px]">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className="bg-brand-card w-full max-w-4xl rounded-3xl border border-brand-border shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-brand-border flex items-center justify-between bg-brand-bg/20">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${getStatusColor(execution.status)}`}>
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-brand-text">Execution Details</h2>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(execution.status)}`}>
                  {execution.status}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-brand-muted mt-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(execution.timestamp).toLocaleString()}</span>
                </div>
                {execution.duration && (
                  <div className="flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Duration: {execution.duration.toFixed(2)}s</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  {execution.trigger_type === 'webhook' ? <Zap className="w-3.5 h-3.5 text-amber-500" /> : <MessageSquare className="w-3.5 h-3.5 text-sky-500" />}
                  <span className="capitalize">{execution.trigger_type}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onReRun(execution)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Play className="w-4 h-4" />
              Re-run Snapshot
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 hover:bg-brand-bg rounded-xl text-brand-muted transition-colors border border-transparent hover:border-brand-border"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8 pt-4 flex gap-6 border-b border-brand-border">
          <button 
            onClick={() => setActiveTab('input')}
            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'input' ? 'text-indigo-600' : 'text-brand-muted hover:text-brand-text'}`}
          >
            Input Data
            {activeTab === 'input' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('output')}
            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'output' ? 'text-indigo-600' : 'text-brand-muted hover:text-brand-text'}`}
          >
            Output / Errors
            {activeTab === 'output' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('snapshot')}
            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'snapshot' ? 'text-indigo-600' : 'text-brand-muted hover:text-brand-text'}`}
          >
            Graph Snapshot
            {activeTab === 'snapshot' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-brand-bg/10">
          {activeTab === 'input' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 text-brand-text font-semibold">
                <FileJson className="w-5 h-5 text-indigo-500" />
                <h3>Input Payload</h3>
              </div>
              {renderJson(execution.input_data)}
            </div>
          )}

          {activeTab === 'output' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 text-brand-text font-semibold">
                <FileJson className="w-5 h-5 text-emerald-500" />
                <h3>Execution Result</h3>
              </div>
              {renderJson(execution.output_data)}
            </div>
          )}

          {activeTab === 'snapshot' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-brand-text font-semibold">
                  <History className="w-5 h-5 text-amber-500" />
                  <h3>Workflow Configuration Snapshot</h3>
                </div>
                <p className="text-xs text-brand-muted italic">This historical graph represents the exact state of the nodes and edges when this execution was triggered.</p>
              </div>
              
              {/* Render the Visual Graph Snapshot */}
              {execution.graph_snapshot && execution.graph_snapshot.nodes ? (
                <ReactFlowProvider>
                  <SnapshotFlow 
                    nodes={execution.graph_snapshot.nodes} 
                    edges={execution.graph_snapshot.edges} 
                    executionStatus={execution.status}
                    nodeStatuses={execution.output_data?.node_statuses}
                  />
                </ReactFlowProvider>
              ) : (
                <div className="text-brand-muted italic py-4">No complete graph snapshot data available.</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-brand-bg/20 border-t border-brand-border flex justify-between items-center text-[10px] text-brand-muted font-mono uppercase tracking-widest">
          <span>Execution ID: {execution.id}</span>
          <span>Project ID: {execution.project_id}</span>
        </div>
      </div>
    </div>
  );
};
