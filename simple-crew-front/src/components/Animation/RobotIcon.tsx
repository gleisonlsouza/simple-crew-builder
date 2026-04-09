import { motion, AnimatePresence } from 'motion/react';
import { Bot, Zap, CheckCircle2 } from 'lucide-react';
import type { RobotState } from './types';
import { WorkingParticles } from './WorkingParticles';

interface RobotIconProps {
  color: string;
  state: RobotState;
  thought: string | null;
  icon?: React.ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
}

export const RobotIcon = ({ color, state, thought, icon, isSelected, onClick }: RobotIconProps) => (
  <div className="relative group cursor-pointer" onClick={onClick}>
    {state === 'working' && <WorkingParticles color={color} />}
    <motion.div
      animate={
        state === 'working' ? {
          scale: [isSelected ? 1.2 : 1, isSelected ? 1.3 : 1.1, isSelected ? 1.2 : 1],
          rotate: [0, 5, -5, 0],
        } : state === 'idle' ? {
          y: [0, -2, 0],
          scale: isSelected ? 1.2 : 1,
        } : state === 'resting' ? {
          rotate: [0, 10, -10, 0],
          scale: isSelected ? 1.2 : 1,
        } : {
          scale: isSelected ? 1.2 : 1,
        }
      }
      transition={{ 
        repeat: Infinity, 
        duration: state === 'working' ? 1 : state === 'idle' ? 3 : 4 
      }}
      className={`p-2 rounded-full bg-white/10 backdrop-blur-md border transition-colors ${isSelected ? 'border-white ring-2 ring-white/50' : 'border-white/20'} shadow-lg`}
      style={{ boxShadow: `0 0 15px ${color}44` }}
    >
      {icon || <Bot size={32} style={{ color }} />}
      {state === 'working' && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-1 -right-1"
        >
          <Zap size={14} className="text-yellow-400 fill-yellow-400" />
        </motion.div>
      )}
      {(state === 'completed' || state === 'resting') && (
        <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5 border border-white/20">
          <CheckCircle2 size={12} className="text-white" />
        </div>
      )}
    </motion.div>

    {/* Thought Bubble */}
    <AnimatePresence>
      {thought && (
        <motion.div
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ opacity: 1, y: -45, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-white text-black text-[9px] font-bold rounded-lg shadow-xl pointer-events-none"
        >
          {thought}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
        </motion.div>
      )}
    </AnimatePresence>

    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-black/20 blur-sm rounded-full" />
  </div>
);
