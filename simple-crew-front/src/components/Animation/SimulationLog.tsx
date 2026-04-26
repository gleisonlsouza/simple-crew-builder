import { motion, AnimatePresence } from 'motion/react';
import { Terminal } from 'lucide-react';
import type { LogEntry } from './types';

interface SimulationLogProps {
  logs: LogEntry[];
  isCollapsed: boolean;
  onToggle: () => void;
}

export const SimulationLog = ({ logs, isCollapsed, onToggle }: SimulationLogProps) => (
  <div className={`flex flex-col h-full w-full bg-slate-950 ${!isCollapsed ? 'border-l border-slate-800' : ''} overflow-hidden shadow-2xl transition-all duration-300 pointer-events-auto`}>
    {/* Header */}
    <div className={`px-4 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-start gap-3 shrink-0 h-14`}>
      {!isCollapsed ? (
        <button 
          onClick={onToggle}
          data-testid="btn-log-collapse"
          className="flex items-center gap-2 hover:bg-slate-800/50 p-1 rounded-md transition-all group"
        >
          <motion.div animate={{ scaleX: isCollapsed ? -1 : 1 }}>
            <Terminal size={16} className="text-slate-400 group-hover:text-white transition-colors" />
          </motion.div>
          <span className="text-[10px] font-bold text-slate-400 group-hover:text-white uppercase tracking-widest transition-colors">Terminal output</span>
        </button>
      ) : (
        <div className="flex justify-center w-full">
          <button 
            onClick={onToggle}
            data-testid="btn-log-expand"
            className="p-1.5 hover:bg-slate-800 rounded-md transition-all text-slate-400 hover:text-white"
            title="Expand Logs"
          >
            <motion.div animate={{ scaleX: isCollapsed ? -1 : 1 }}>
              <Terminal size={18} />
            </motion.div>
          </button>
        </div>
      )}
    </div>

    {/* Log Content */}
    {!isCollapsed && (
      <div 
        data-testid="simulation-log-container"
        className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-3 selection:bg-indigo-500/30"
      >
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col gap-1 border-l border-slate-800/50 pl-3 py-1 hover:bg-slate-900/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 font-bold tracking-tighter">[{log.timestamp}]</span>
                <span className={`px-1.5 py-0.5 rounded-[4px] font-bold uppercase text-[8px] ${
                  log.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                  log.type === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                  log.type === 'ai' ? 'bg-indigo-500/10 text-indigo-400' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {log.agentName || 'SYSTEM'}
                </span>
              </div>
              <p className={`leading-relaxed font-medium ${
                  log.type === 'success' ? 'text-emerald-400/90' :
                  log.type === 'warning' ? 'text-amber-400/90' :
                  log.type === 'ai' ? 'text-indigo-400/90' :
                  'text-slate-300'
              }`}>
                <span className="opacity-50 mr-2">❯</span>
                {log.message}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
        {logs.length === 0 && (
          <div className="h-full flex items-center justify-center text-slate-600 italic text-xs">
            Aguardando início...
          </div>
        )}
      </div>
    )}
  </div>
);
