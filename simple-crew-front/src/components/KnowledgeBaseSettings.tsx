import React, { useState, useEffect } from 'react';
import { Plus, Database, Calendar, Loader2, Info, X, Files, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { KnowledgeBase } from '../types/store.types';
import { KnowledgeBaseDocumentsModal } from './KnowledgeBaseDocumentsModal';
import { ConfirmationModal } from './ConfirmationModal';

const API_URL = import.meta.env.VITE_API_URL || '';

export const KnowledgeBaseSettings: React.FC = () => {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKB, setNewKB] = useState({ name: '', description: '' });
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [kbToDelete, setKbToDelete] = useState<KnowledgeBase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchKnowledgeBases = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/knowledge-bases`);
      if (!response.ok) throw new Error('Failed to fetch knowledge bases');
      const data = await response.json();
      setKnowledgeBases(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKB.name) {
      toast.error('Name is required');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`${API_URL}/api/knowledge-bases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKB),
      });

      if (!response.ok) throw new Error('Failed to create knowledge base');
      
      toast.success('Knowledge Base created successfully!');
      setNewKB({ name: '', description: '' });
      setShowCreateModal(false);
      fetchKnowledgeBases();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!kbToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/api/knowledge-bases/${kbToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete knowledge base');
      
      toast.success('Knowledge Base deleted successfully!');
      // Update local state instead of re-fetching
      setKnowledgeBases(prev => prev.filter(kb => kb.id !== kbToDelete.id));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
      setKbToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(new Date(dateString));
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-brand-text tracking-tight mb-2">Knowledge Bases</h1>
          <p className="text-brand-muted text-sm">Manage your RAG vector bases in Neo4j.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          New Base
        </button>
      </header>

      {/* Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isCreating && setShowCreateModal(false)} />
          <div className="relative w-full max-w-md bg-brand-card border border-brand-border rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-brand-text flex items-center gap-2">
                <Database className="w-6 h-6 text-indigo-500" />
                Add New Base
              </h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-brand-bg rounded-full text-brand-muted transition-colors"
                disabled={isCreating}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Name</label>
                <input 
                  autoFocus
                  type="text"
                  value={newKB.name}
                  onChange={(e) => setNewKB({ ...newKB, name: e.target.value })}
                  placeholder="Ex: Customer Support Docs"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium"
                  disabled={isCreating}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Description (Optional)</label>
                <textarea 
                  value={newKB.description}
                  onChange={(e) => setNewKB({ ...newKB, description: e.target.value })}
                  placeholder="Briefly describe what this base contains..."
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all h-24 resize-none"
                  disabled={isCreating}
                />
              </div>
              
              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-brand-bg border border-brand-border text-brand-text rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreating || !newKB.name}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          <p className="text-brand-muted animate-pulse">Loading Knowledge Bases...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {knowledgeBases.length === 0 ? (
            <div className="py-20 text-center bg-brand-card border border-brand-border border-dashed rounded-3xl">
              <Database className="w-12 h-12 text-brand-muted mx-auto mb-4 opacity-20" />
              <p className="text-brand-muted">No Knowledge Bases found. Create one to start organizing files.</p>
            </div>
          ) : (
            knowledgeBases.map((kb) => (
              <div key={kb.id} className="bg-brand-card border border-brand-border rounded-2xl p-6 flex items-center justify-between group hover:shadow-md transition-all">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600">
                    <Database className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-brand-text">{kb.name}</h3>
                    <p className="text-xs text-brand-muted line-clamp-1">{kb.description || 'No description provided.'}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-brand-muted bg-brand-bg px-2 py-0.5 rounded-md">
                        <Calendar className="w-3 h-3" />
                        {formatDate(kb.created_at)}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Neo4j Node
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedKB(kb)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-600/20 rounded-xl text-xs font-bold transition-all active:scale-95 group/btn"
                  >
                    <Files className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                    Manage Documents
                  </button>
                  <button 
                    onClick={() => setKbToDelete(kb)}
                    className="p-2.5 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-95"
                    title="Delete Knowledge Base"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="px-3 py-1 bg-brand-bg border border-brand-border rounded-lg text-[10px] text-brand-muted italic flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    Read-only from settings
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      <ConfirmationModal 
        isOpen={!!kbToDelete}
        onClose={() => setKbToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Knowledge Base"
        message={`Are you sure you want to delete "${kbToDelete?.name}"? This will permanently remove all associated documents, chunks, and data from Neo4j and the file system. This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete Permanently"}
        variant="danger"
      />
      
      <div className="mt-12 p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-start gap-4">
        <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="text-sm text-brand-muted leading-relaxed">
          <p className="font-bold text-brand-text mb-1">About Knowledge Bases</p>
          Knowledge Bases allow you to group documents and files that will be used for <strong>GraphRAG</strong>. 
          They are stored as individual nodes in Neo4j and serve as a "context root" for your AI agents.
        </div>
      </div>
      
      {selectedKB && (
        <KnowledgeBaseDocumentsModal 
          kb={selectedKB} 
          onClose={() => setSelectedKB(null)} 
        />
      )}
    </div>
  );
};
