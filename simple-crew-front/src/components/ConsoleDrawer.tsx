import { useEffect, useRef } from 'react';
import { useStore } from '../store/index';
import { Terminal, X, Minimize2, Maximize2, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

export function ConsoleDrawer() {
  const isExecuting = useStore((state) => state.isExecuting);
  const isConsoleOpen = useStore((state) => state.isConsoleOpen);
  const isConsoleExpanded = useStore((state) => state.isConsoleExpanded);
  const executionResult = useStore((state) => state.executionResult);

  const setIsConsoleOpen = useStore((state) => state.setIsConsoleOpen);
  const setIsConsoleExpanded = useStore((state) => state.setIsConsoleExpanded);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current && isConsoleExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [executionResult, isConsoleExpanded]);

  if (!isConsoleOpen) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 shadow-2xl transition-all duration-300 ease-in-out z-50 flex flex-col font-mono text-sm ${isConsoleExpanded ? 'h-96' : 'h-14 cursor-pointer hover:bg-slate-900'
        }`}
      onClick={() => {
        if (!isConsoleExpanded) setIsConsoleExpanded(true);
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-slate-800/50 bg-slate-900/80">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            Live Console
            {isExecuting ? (
              <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
            ) : executionResult ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : null}
          </h3>
          {!isConsoleExpanded && isExecuting && (
            <span className="text-emerald-400/80 text-xs ml-2 animate-pulse flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Thinking...
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
            onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
            title={isConsoleExpanded ? "Minimize" : "Expand"}
          >
            {isConsoleExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-md transition-colors ml-1"
            onClick={() => {
              setIsConsoleOpen(false);
              setIsConsoleExpanded(false);
            }}
            title="Close Console"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        ref={scrollRef}
        data-testid="console-body"
        className={`flex-1 overflow-y-auto p-4 scroll-smooth ${isConsoleExpanded ? 'block' : 'hidden'}`}
      >
        {executionResult ? (
          <pre className="whitespace-pre-wrap text-emerald-400 leading-relaxed max-w-none">
            {executionResult}
          </pre>
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">
            <p>Waiting for hive mind synchronization...</p>
          </div>
        )}
      </div>
    </div>
  );
}
