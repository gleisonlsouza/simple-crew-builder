import React from 'react';
import { 
  Plus, 
  Minus, 
  RefreshCw 
} from 'lucide-react';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onReset
}) => {
  return (
    <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-20">
      <button 
        type="button"
        onClick={onZoomIn}
        className="p-3 bg-brand-bg/80 backdrop-blur-md border border-brand-border rounded-xl text-brand-muted hover:text-brand-text transition-all shadow-xl hover:scale-110 active:scale-90"
        title="Zoom In"
      >
        <Plus className="w-5 h-5" />
      </button>
      <button 
        type="button"
        onClick={onZoomOut}
        className="p-3 bg-brand-bg/80 backdrop-blur-md border border-brand-border rounded-xl text-brand-muted hover:text-brand-text transition-all shadow-xl hover:scale-110 active:scale-90"
        title="Zoom Out"
      >
        <Minus className="w-5 h-5" />
      </button>
      <button 
        type="button"
        onClick={onReset}
        className="p-3 bg-brand-bg/80 backdrop-blur-md border border-brand-border rounded-xl text-brand-muted hover:text-brand-text transition-all shadow-xl hover:scale-110 active:scale-90"
        title="Reset View"
      >
        <RefreshCw className="w-5 h-5" />
      </button>
    </div>
  );
};
