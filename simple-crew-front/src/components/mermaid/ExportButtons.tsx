import React from 'react';
import { 
  FileImage, 
  FileText, 
  X
} from 'lucide-react';

interface ExportButtonsProps {
  onDownloadPNG: (ref: React.RefObject<HTMLDivElement | null>) => void;
  onDownloadPDF: (ref: React.RefObject<HTMLDivElement | null>) => void;
  onClose: () => void;
  diagramRef: React.RefObject<HTMLDivElement | null>;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  onDownloadPNG,
  onDownloadPDF,
  onClose,
  diagramRef
}) => {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onDownloadPNG(diagramRef)}
        className="flex items-center gap-2 px-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-xs font-bold text-brand-text hover:bg-brand-border transition-all active:scale-95 uppercase tracking-wider"
      >
        <FileImage className="w-4 h-4" />
        PNG
      </button>
      <button
        type="button"
        onClick={() => onDownloadPDF(diagramRef)}
        className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-brand-accent/20 uppercase tracking-wider"
      >
        <FileText className="w-4 h-4" />
        PDF
      </button>
      <div className="w-px h-6 bg-brand-border mx-2" />
      <button
        type="button"
        onClick={onClose}
        className="p-2 hover:bg-brand-bg rounded-xl text-brand-muted hover:text-brand-text transition-all"
      >
        <X className="w-6 h-6" />
      </button>
    </div>
  );
};
