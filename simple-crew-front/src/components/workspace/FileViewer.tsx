import React from 'react';
import { 
  Download, 
  FileText, 
  RefreshCw,
  File
} from 'lucide-react';

interface FileViewerProps {
  selectedPath: string | null;
  content: string | null;
  isContentLoading: boolean;
  onDownload: () => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({
  selectedPath,
  content,
  isContentLoading,
  onDownload
}) => {
  if (!selectedPath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-40">
        <div className="w-20 h-20 rounded-3xl bg-brand-border/20 flex items-center justify-center mb-6 border-2 border-dashed border-brand-border">
          <File className="w-10 h-10 text-brand-muted" />
        </div>
        <h3 className="text-lg font-bold text-brand-text mb-2">No file selected</h3>
        <p className="text-xs text-brand-muted max-w-xs leading-relaxed">
          Select a file from the sidebar to view its content and download it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-brand-bg/5 flex flex-col min-w-0">
      {/* Viewer Header */}
      <div className="h-12 border-b border-brand-border px-4 flex items-center justify-between bg-brand-card/50">
         <div className="flex items-center gap-2 truncate">
           <FileText className="w-4 h-4 text-indigo-400" />
           <span className="text-xs font-medium text-brand-text truncate">{selectedPath}</span>
         </div>
         <button 
           onClick={onDownload}
           className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-bold transition-all shadow-md shadow-indigo-500/20 active:scale-95"
         >
           <Download className="w-3 h-3" />
           Download
         </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-[#1e1e1e] group relative">
        {isContentLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] z-10">
            <RefreshCw className="w-8 h-8 animate-spin text-white/20" />
          </div>
        ) : null}
        
        <pre className="p-6 m-0 text-xs font-mono !bg-transparent">
          <code className={`language-${selectedPath.split('.').pop() || 'text'}`}>
            {content}
          </code>
        </pre>
      </div>
    </div>
  );
};
