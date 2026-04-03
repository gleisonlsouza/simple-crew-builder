import { useEffect, useState } from 'react';
import { AlertOctagon, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useStore } from '../store/index';
import type { AppState } from '../types/store.types';

export function Toast() {
  const notification = useStore((state: AppState) => state.notification);
  const clearNotification = useStore((state: AppState) => state.clearNotification);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification?.visible) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [notification]);

  if (!notification || !isVisible) return null;

  const icons = {
    error: <AlertOctagon className="w-5 h-5 text-red-500" />,
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  const bgColors = {
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${bgColors[notification.type]} min-w-[320px] max-w-md`}>
        <div className="shrink-0 flex items-center justify-center">
          {icons[notification.type]}
        </div>
        <p className="flex-1 text-sm text-inherit font-medium">
          {notification.message}
        </p>
        <button 
          onClick={clearNotification}
          className="shrink-0 p-1 opacity-70 hover:opacity-100 transition-opacity ml-2 rounded-md hover:bg-black/5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
