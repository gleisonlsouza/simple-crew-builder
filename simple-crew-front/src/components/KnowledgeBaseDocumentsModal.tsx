import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, Loader2, HardDrive, CheckCircle2, Trash2, AlertTriangle, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import type { KnowledgeBase, KnowledgeBaseDocument } from '../types';
import { ConfirmationModal } from './ConfirmationModal';

const API_URL = import.meta.env.VITE_API_URL || '';

interface Props {
  kb: KnowledgeBase;
  onClose: () => void;
}

interface FileNode {
  name: string;
  fullPath: string;
  type: 'file' | 'folder';
  document?: KnowledgeBaseDocument;
  children: Record<string, FileNode>;
}

const FileTreeItem: React.FC<{ 
  node: FileNode; 
  level: number;
  onDelete: (id: string) => void;
  formatSize: (bytes?: number) => string;
  formatDate: (date: string) => string;
}> = ({ node, level, onDelete, formatSize, formatDate }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isFolder = node.type === 'folder';

  return (
    <div className="select-none">
      <div 
        className={`
          flex items-center justify-between p-2 rounded-xl transition-all group
          ${isFolder ? 'hover:bg-brand-bg/80 cursor-pointer' : 'hover:bg-brand-bg/30 border border-transparent hover:border-brand-border/50'}
        `}
        style={{ paddingLeft: `${level * 1.2 + 0.5}rem` }}
        onClick={() => isFolder && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {isFolder ? (
            <>
              <div className="w-5 h-5 flex items-center justify-center">
                {isOpen ? <ChevronDown className="w-4 h-4 text-brand-muted" /> : <ChevronRight className="w-4 h-4 text-brand-muted" />}
              </div>
              <Folder className={`w-4 h-4 ${isOpen ? 'text-indigo-500 fill-indigo-500/20' : 'text-brand-muted'}`} />
            </>
          ) : (
            <>
              <div className="w-5 h-5 flex items-center justify-center">
                <FileText className="w-4 h-4 text-brand-muted group-hover:text-emerald-500 transition-colors" />
              </div>
            </>
          )}
          <span className={`text-sm truncate ${isFolder ? 'font-bold text-brand-text' : 'text-brand-muted group-hover:text-brand-text'}`}>
            {node.name}
          </span>
        </div>

        {!isFolder && node.document && (
          <div className="flex items-center gap-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-brand-muted hidden sm:inline">{formatSize(node.document.size)}</span>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 scale-90">
              <CheckCircle2 className="w-3 h-3" />
              INDEXED
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.document!.id);
              }}
              className="p-1.5 text-brand-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
              title="Delete Document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {isFolder && isOpen && (
        <div className="mt-0.5 border-l border-brand-border/20 ml-[1.1rem]">
          {Object.values(node.children)
            .sort((a, b) => {
              if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map(child => (
              <FileTreeItem 
                key={child.fullPath} 
                node={child} 
                level={level + 1} 
                onDelete={onDelete}
                formatSize={formatSize}
                formatDate={formatDate}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export const KnowledgeBaseDocumentsModal: React.FC<Props> = ({ kb, onClose }) => {
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const embeddingModelId = useStore((state) => state.embeddingModelId);
  const models = useStore((state) => state.models);
  
  const isValidEmbeddingModel = !!embeddingModelId && 
    embeddingModelId !== 'null' && 
    models.some(m => m.id === embeddingModelId && m.model_type === 'EMBEDDING');

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/knowledge-bases/${kb.id}/documents`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setDocuments(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [kb.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (!isValidEmbeddingModel) {
      toast.error('No Default Embedding Model selected. Please go to Settings > AI Models and select an Embedding LLM first.', {
        duration: 5000,
        icon: '⚠️'
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await fetch(`${API_URL}/api/knowledge-bases/${kb.id}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const newDocs = await response.json();
      toast.success(`${newDocs.length} file(s) uploaded successfully!`);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDocuments();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    setDocToDelete(docId);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    
    try {
      const response = await fetch(`${API_URL}/api/knowledge-bases/${kb.id}/documents/${docToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');
      
      toast.success('Document deleted successfully');
      fetchDocuments();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsConfirmOpen(false);
      setDocToDelete(null);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(dateString));
    } catch (e) {
      return dateString;
    }
  };

  const buildFileTree = (docs: KnowledgeBaseDocument[]): FileNode => {
    const root: FileNode = { name: 'root', fullPath: '', type: 'folder', children: {} };

    docs.forEach(doc => {
      const parts = doc.filename.split('/');
      let current = root;

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        const fullPath = parts.slice(0, index + 1).join('/');

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            fullPath,
            type: isLast ? 'file' : 'folder',
            document: isLast ? doc : undefined,
            children: {}
          };
        }
        current = current.children[part];
      });
    });

    return root;
  };

  const fileTree = buildFileTree(documents);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-brand-card border border-brand-border rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-brand-border flex items-center justify-between bg-brand-card/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-brand-text leading-tight">{kb.name}</h2>
              <p className="text-xs text-brand-muted mt-1 uppercase tracking-widest font-bold">Document Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-bg rounded-full text-brand-muted transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Upload Area */}
          <div 
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isValidEmbeddingModel) {
                toast.error('No Embedding Model. Please configure one in Settings first.');
                return;
              }
              const files = e.dataTransfer.files;
              if (files && files.length > 0) {
                const event = { target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>;
                handleFileUpload(event);
              }
            }}
            onClick={() => {
              if (!isValidEmbeddingModel) {
                toast.error('Please configure a Default Embedding Model in Settings first.');
                return;
              }
              fileInputRef.current?.click();
            }}
            className={`
              relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group
              ${isUploading ? 'bg-indigo-500/5 border-indigo-500/50 pointer-events-none' : ''}
              ${!isValidEmbeddingModel ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/50' : 'bg-brand-bg/50 border-brand-border hover:border-indigo-500 hover:bg-brand-bg'}
            `}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              multiple 
              className="hidden" 
            />
            
            {!isValidEmbeddingModel ? (
              <>
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-red-500 font-bold">Embedding Model Missing</p>
                  <p className="text-[10px] text-brand-muted mt-1 max-w-[200px]">Go to Settings &gt; AI Models and select a default model for embeddings.</p>
                </div>
              </>
            ) : isUploading ? (
              <>
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-brand-text font-bold">Uploading Documents...</p>
                <p className="text-xs text-brand-muted">Saving files and updating Neo4j graph</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-brand-border/30 rounded-full flex items-center justify-center text-brand-muted group-hover:text-indigo-500 group-hover:bg-indigo-500/10 transition-all">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-brand-text font-bold">Click or drag files here</p>
                  <p className="text-xs text-brand-muted mt-1">ZIP (Repository), PDF, DOCX, TXT, MD supported</p>
                </div>
              </>
            )}
          </div>

          {/* Documents List */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              Indexed Documents ({documents.length})
            </h3>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
                <p className="text-sm text-brand-muted">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="py-12 text-center bg-brand-bg/30 border border-brand-border border-dashed rounded-2xl">
                <p className="text-sm text-brand-muted">This base is empty. Upload documents to start using RAG.</p>
              </div>
            ) : (
              <div className="bg-brand-bg/20 border border-brand-border/50 rounded-2xl p-4 overflow-hidden">
                {Object.values(fileTree.children).length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-brand-muted">Loading tree...</p>
                  </div>
                ) : (
                  Object.values(fileTree.children)
                    .sort((a, b) => {
                      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                      return a.name.localeCompare(b.name);
                    })
                    .map(node => (
                      <FileTreeItem 
                        key={node.fullPath}
                        node={node}
                        level={0}
                        onDelete={handleDeleteDocument}
                        formatSize={formatSize}
                        formatDate={formatDate}
                      />
                    ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-brand-bg/30 border-t border-brand-border flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-brand-card border border-brand-border text-brand-text rounded-xl font-bold hover:bg-brand-bg transition-colors"
          >
            Close
          </button>
        </div>

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={isConfirmOpen}
          onClose={() => {
            setIsConfirmOpen(false);
            setDocToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Document"
          message="Are you sure you want to delete this document? This will permanently remove the file and all associated indexed vectors from the database."
          confirmText="Yes, Delete"
          cancelText="Cancel"
          variant="danger"
        />
      </div>
    </div>
  );
};
