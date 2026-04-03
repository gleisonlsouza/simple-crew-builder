import React from 'react';
import { 
  Folder, 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Code, 
  Search,
  RefreshCw,
  Archive,
  Upload,
  Plus,
  Trash2
} from 'lucide-react';
import type { WorkspaceFile } from '../../types/store.types';

interface FileTreeItemProps {
  item: WorkspaceFile;
  level: number;
  onFileSelect: (path: string) => void;
  onFolderZip: (path: string) => void;
  onDelete: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, item: WorkspaceFile) => void;
  selectedPath: string | null;
  searchTerm: string;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({ 
  item, 
  level, 
  onFileSelect, 
  onFolderZip, 
  onDelete, 
  onContextMenu, 
  selectedPath, 
  searchTerm 
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const isSelected = selectedPath === item.path;
  
  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.is_dir) {
      setIsOpen(!isOpen);
    } else {
      onFileSelect(item.path);
    }
  };

  const getIcon = () => {
    if (item.is_dir) {
      return isOpen ? <ChevronDown className="w-4 h-4 text-brand-muted" /> : <ChevronRight className="w-4 h-4 text-brand-muted" />;
    }
    const ext = item.name.split('.').pop()?.toLowerCase();
    if (['py', 'js', 'ts', 'json', 'html', 'css', 'md'].includes(ext || '')) {
      return <Code className="w-4 h-4 text-indigo-400" />;
    }
    return <FileText className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="select-none">
      <div 
        onClick={toggleOpen}
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-200 group ${
          isSelected 
            ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400' 
            : 'hover:bg-brand-bg/50 text-brand-muted hover:text-brand-text border border-transparent'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onContextMenu={(e) => onContextMenu(e, item)}
      >
        <span className="shrink-0">{getIcon()}</span>
        {item.is_dir && <Folder className="w-4 h-4 text-amber-500/80 shrink-0" />}
        <span className={`text-xs truncate flex-1 ${isSelected ? 'font-bold' : 'font-medium'}`}>
          {item.name}
        </span>
        
        {item.is_dir && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFolderZip(item.path);
            }}
            className="p-1 hover:bg-brand-bg rounded-md opacity-0 group-hover:opacity-100 transition-all text-brand-muted hover:text-indigo-500"
            title="Download folder as ZIP"
          >
            <Archive className="w-3 h-3" />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.path);
          }}
          className="p-1 hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all text-brand-muted hover:text-red-500"
          title={`Delete ${item.is_dir ? 'folder' : 'file'}`}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      
      {(isOpen || (searchTerm.trim() !== '' && item.is_dir && (item.children?.length ?? 0) > 0)) && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          {(item.children || []).map((child, idx) => (
            <FileTreeItem 
              key={`${child.path}-${idx}`} 
              item={child} 
              level={level + 1} 
              onFileSelect={onFileSelect}
              onFolderZip={onFolderZip}
              onDelete={onDelete}
              onContextMenu={onContextMenu}
              selectedPath={selectedPath}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FileTreeProps {
  files: WorkspaceFile[];
  onFileSelect: (path: string) => void;
  onFolderZip: (path: string) => void;
  onDelete: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, item: WorkspaceFile) => void;
  selectedPath: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  isLoading: boolean;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  onFileSelect,
  onFolderZip,
  onDelete,
  onContextMenu,
  selectedPath,
  searchTerm,
  setSearchTerm,
  fileInputRef,
  folderInputRef,
  onUpload,
  isUploading,
  isLoading
}) => {
  return (
    <div className="w-72 border-r border-brand-border flex flex-col bg-brand-bg/10">
      <div className="p-4 border-b border-brand-border space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted" />
          <input 
            type="text" 
            placeholder="Filter files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-brand-card border border-brand-border rounded-xl pl-9 pr-4 py-2 text-xs text-brand-text outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center justify-center gap-2 py-2 px-3 bg-brand-bg/50 hover:bg-brand-bg border border-brand-border rounded-xl text-[10px] font-bold text-brand-text transition-all active:scale-95 disabled:opacity-50"
            title="Upload Files"
          >
            <Plus className="w-3 h-3 text-indigo-500" />
            Files
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center justify-center gap-2 py-2 px-3 bg-brand-bg/50 hover:bg-brand-bg border border-brand-border rounded-xl text-[10px] font-bold text-brand-text transition-all active:scale-95 disabled:opacity-50"
            title="Upload Folder"
          >
            <Upload className="w-3 h-3 text-indigo-500" />
            Folder
          </button>
        </div>

        {/* Hidden Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={onUpload}
          multiple
          className="hidden"
        />
        <input
          type="file"
          ref={folderInputRef}
          onChange={onUpload}
          {...{ webkitdirectory: "", directory: "" } as any}
          className="hidden"
        />

        {isUploading && (
          <div className="flex items-center gap-2 px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
            <span className="text-[9px] font-bold text-indigo-400">Uploading...</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32 gap-3 opacity-50">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Loading Directory...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-10 opacity-50">
            <p className="text-xs text-brand-muted italic">This workspace is empty.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {files.map((file, idx) => (
              <FileTreeItem 
                key={`${file.path}-${idx}`} 
                item={file} 
                level={0} 
                onFileSelect={onFileSelect}
                onFolderZip={onFolderZip}
                onDelete={onDelete}
                onContextMenu={onContextMenu}
                selectedPath={selectedPath}
                searchTerm={searchTerm}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
