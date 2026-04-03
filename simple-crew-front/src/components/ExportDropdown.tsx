import { useState, useRef, useEffect } from 'react';
import { Download, Code, FileText, ChevronDown } from 'lucide-react';
import { useStore } from '../store/index';

export function ExportDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const exportProjectJson = useStore((state) => state.exportProjectJson);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md active:scale-95 duration-200"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Export</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 mb-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Export Options</span>
          </div>
          
          <button
            onClick={() => {
              exportProjectJson();
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              <span className="font-medium">JSON Config</span>
            </div>
          </button>

          <button
            onClick={() => {
              useStore.getState().exportPythonProject();
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Code className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <span className="font-medium">Python Project</span>
            </div>
          </button>

          <button className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-400 dark:text-slate-500 cursor-not-allowed group opacity-60">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4" />
              <span className="font-medium">PDF Report</span>
            </div>
            <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 dark:text-slate-600 uppercase">Coming Soon</span>
          </button>
        </div>
      )}
    </div>
  );
}
