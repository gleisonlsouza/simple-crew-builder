import { 
  X, 
  Folder, 
  RefreshCw,
  Archive,
  Download,
  Copy,
  Trash2
} from 'lucide-react';
import { useWorkspace } from '../hooks/useWorkspace';
import { ConfirmationModal } from './ConfirmationModal';
import { FileTree } from './workspace/FileTree';
import { FileViewer } from './workspace/FileViewer';

export function WorkspaceExplorer() {
  const {
    isExplorerOpen,
    setIsExplorerOpen,
    currentWsId,
    workspace,
    selectedPath,
    content,
    isLoading,
    isContentLoading,
    isUploading,
    searchTerm,
    setSearchTerm,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    pathToExclude,
    contextMenu,
    fileInputRef,
    folderInputRef,
    loadFiles,
    handleFileSelect,
    handleDownload,
    downloadFile,
    handleUpload,
    handleDelete,
    handleContextMenu,
    confirmDelete,
    closeContextMenu,
    copyRelativePath,
    filteredDocs,
    downloadZip
  } = useWorkspace();

  if (!isExplorerOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        data-testid="explorer-backdrop"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={() => setIsExplorerOpen(false)}
      />
      
      {/* Modal Container */}
      <div className="relative w-full h-full max-w-6xl bg-brand-card border border-brand-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="h-16 border-b border-brand-border px-6 flex items-center justify-between bg-brand-bg/30">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Folder className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-brand-text flex items-center gap-2">
                Workspace Explorer
                {workspace && (
                  <span className="text-xs font-normal text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    {workspace.name}
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-brand-muted italic truncate opacity-70 mt-0.5">
                {workspace?.path || 'No workspace selected'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => currentWsId && downloadZip(currentWsId, "")}
              className="p-2 hover:bg-indigo-500/10 rounded-xl text-brand-muted hover:text-indigo-400 transition-all active:scale-95"
              title="Download Full Workspace ZIP"
            >
              <Archive className="w-4 h-4" />
            </button>
            <button 
              onClick={loadFiles}
              className="p-2 hover:bg-brand-bg rounded-xl text-brand-muted transition-all active:scale-95"
              title="Refresh Files"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => setIsExplorerOpen(false)}
              className="p-2 hover:bg-red-500/10 rounded-xl text-brand-muted hover:text-red-500 transition-all active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Layout Body */}
        <div className="flex-1 flex overflow-hidden">
          
          <FileTree 
            files={filteredDocs}
            onFileSelect={handleFileSelect}
            onFolderZip={(path) => currentWsId && downloadZip(currentWsId, path)}
            onDelete={handleDelete}
            onContextMenu={handleContextMenu}
            selectedPath={selectedPath}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            fileInputRef={fileInputRef}
            folderInputRef={folderInputRef}
            onUpload={handleUpload}
            isUploading={isUploading}
            isLoading={isLoading}
          />

          <FileViewer 
            selectedPath={selectedPath}
            content={content}
            isContentLoading={isContentLoading}
            onDownload={handleDownload}
          />

        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Item"
        message={`Are you sure you want to delete "${pathToExclude}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-[200] bg-brand-card border border-brand-border rounded-xl shadow-2xl py-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.stopPropagation()}
        >
          {contextMenu.item.is_dir && (
            <button 
              onClick={() => {
                currentWsId && downloadZip(currentWsId, contextMenu.item.path);
                closeContextMenu();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs text-brand-text hover:bg-brand-bg/80 transition-all text-left"
            >
              <Archive className="w-3.5 h-3.5 text-indigo-400" />
              Download ZIP
            </button>
          )}
          {!contextMenu.item.is_dir && (
            <button 
              onClick={() => {
                downloadFile(contextMenu.item.path);
                closeContextMenu();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs text-brand-text hover:bg-brand-bg/80 transition-all text-left"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              Download File
            </button>
          )}
          <button 
            onClick={() => {
              copyRelativePath(contextMenu.item.path);
              closeContextMenu();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs text-brand-text hover:bg-brand-bg/80 transition-all text-left"
          >
            <Copy className="w-3.5 h-3.5 text-brand-muted" />
            Copy Relative Path
          </button>
          <div className="h-px bg-brand-border my-1" />
          <button 
            onClick={() => {
              handleDelete(contextMenu.item.path);
              closeContextMenu();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-all text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
