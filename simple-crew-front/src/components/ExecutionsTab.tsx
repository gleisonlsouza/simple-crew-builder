import React, { useEffect, useState } from 'react';
import { useStore } from '../store/index';
import { ExecutionTable } from './ExecutionTable';
import { ExecutionDetailModal } from './ExecutionDetailModal';
import { History, RefreshCcw, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Execution } from '../types/store.types';

interface ExecutionsTabProps {
  onReRunSuccess?: () => void;
}

const ExecutionsTab: React.FC<ExecutionsTabProps> = ({ onReRunSuccess }) => {
  const navigate = useNavigate();
  const { 
    currentProjectId, 
    executions, 
    isLoadingExecutions, 
    fetchExecutions, 
    hydrateFromSnapshot 
  } = useStore();

  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentProjectId) {
      fetchExecutions(currentProjectId);
    }
  }, [currentProjectId, fetchExecutions]);

  const handleViewDetails = (execution: Execution) => {
    setSelectedExecution(execution);
    setIsModalOpen(true);
  };

  const handleReRun = (execution: Execution) => {
    hydrateFromSnapshot(execution.project_id, execution.graph_snapshot);
    toast.success('🔄 Project restored from historical snapshot!');
    navigate(`/workflow/${execution.project_id}`);
    if (onReRunSuccess) {
      onReRunSuccess();
    }
  };

  const filteredExecutions = executions.filter(ex => {
    const searchLower = searchTerm.toLowerCase();
    return (
      ex.status.toLowerCase().includes(searchLower) ||
      ex.trigger_type.toLowerCase().includes(searchLower) ||
      ex.id.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex-1 flex flex-col bg-brand-bg h-full overflow-hidden animate-in fade-in duration-500">
      {/* Tab Header / Toolbar */}
      <div className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border bg-brand-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-brand-text">Execution History</h2>
            <p className="text-xs text-brand-muted">Audit and re-run past snapshots of your workflow</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input 
              type="text"
              placeholder="Filter by status or trigger..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-brand-card border border-brand-border rounded-xl text-sm text-brand-text w-64 outline-none focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          
          <button 
            onClick={() => currentProjectId && fetchExecutions(currentProjectId)}
            disabled={isLoadingExecutions}
            className="p-2.5 bg-brand-card border border-brand-border text-brand-muted hover:text-indigo-600 hover:border-indigo-500 rounded-xl transition-all shadow-sm group"
            title="Refresh List"
          >
            <RefreshCcw className={`w-5 h-5 ${isLoadingExecutions ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-brand-card border border-brand-border text-brand-muted hover:text-brand-text rounded-xl text-sm font-semibold transition-all shadow-sm">
            <Filter className="w-4 h-4" />
            Advanced Filter
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        {!currentProjectId ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
            <History className="w-16 h-16 text-brand-muted mb-4" />
            <h3 className="text-lg font-semibold text-brand-text">No project selected</h3>
            <p className="text-sm text-brand-muted max-w-xs">Save your workflow first to start tracking execution history.</p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between px-2">
              <span className="text-sm text-brand-muted font-medium">Showing {filteredExecutions.length} executions</span>
              {isLoadingExecutions && <span className="text-xs text-indigo-500 font-bold animate-pulse">Syncing with server...</span>}
            </div>
            
            <ExecutionTable 
              data={filteredExecutions} 
              onViewDetails={handleViewDetails}
              onReRun={handleReRun}
            />
          </div>
        )}
      </div>

      <ExecutionDetailModal 
        execution={selectedExecution}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onReRun={handleReRun}
      />
    </div>
  );
};

export default ExecutionsTab;
