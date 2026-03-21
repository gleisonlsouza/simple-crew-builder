import React from 'react';
import { 
  AlertTriangle, 
  X,
  Trash2,
  HelpCircle
} from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  icon
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      buttonBg: 'bg-red-600 hover:bg-red-700 shadow-red-500/20',
      defaultIcon: <Trash2 className="w-6 h-6" />
    },
    warning: {
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      buttonBg: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
      defaultIcon: <AlertTriangle className="w-6 h-6" />
    },
    info: {
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20',
      defaultIcon: <HelpCircle className="w-6 h-6" />
    }
  };

  const style = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Modal Card */}
      <div className="bg-brand-card w-full max-w-md rounded-2xl border border-brand-border shadow-2xl relative z-10 animate-in fade-in zoom-in duration-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`shrink-0 w-12 h-12 ${style.iconBg} ${style.iconColor} rounded-xl flex items-center justify-center`}>
              {icon || style.defaultIcon}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-brand-text truncate">{title}</h3>
                <button 
                  onClick={onClose}
                  className="p-1 hover:bg-brand-bg rounded-lg text-brand-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-brand-muted text-sm leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-brand-bg/50 border-t border-brand-border flex justify-end gap-3 transition-colors">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-brand-muted hover:text-brand-text hover:bg-brand-bg rounded-xl transition-all"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-6 py-2 ${style.buttonBg} text-white rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
