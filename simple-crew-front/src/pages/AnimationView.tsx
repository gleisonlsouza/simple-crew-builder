import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coffee, 
  Cpu,
  Play, 
  Gamepad2, 
  BatteryCharging,
  Search,
  Type,
  Layout,
  Code,
  Sparkles,
  FileText,
  Globe,
  Database,
  Terminal,
  MessageSquare,
  Bot,
  CheckCircle2,
  X,
  Zap,
  Award,
  BarChart3,
  Activity,
  Monitor
} from 'lucide-react';
import type { Robot, Station as StationType, LogEntry } from '../components/Animation/types';
import { RobotIcon } from '../components/Animation/RobotIcon';
import { Station } from '../components/Animation/Station';
import { SimulationLog } from '../components/Animation/SimulationLog';
import { ResultComputerScreen } from '../components/Animation/ResultComputerScreen';
import { useStore } from '../store/index';

// --- Helpers ---

const getTaskIcon = (name: string, description: string) => {
  const text = (name + ' ' + description).toLowerCase();
  if (text.includes('code') || text.includes('dev')) return <Code size={20} />;
  if (text.includes('design') || text.includes('ui') || text.includes('layout')) return <Layout size={20} />;
  if (text.includes('write') || text.includes('copy') || text.includes('text')) return <Type size={20} />;
  if (text.includes('search') || text.includes('find') || text.includes('research')) return <Search size={20} />;
  if (text.includes('data') || text.includes('base') || text.includes('sql')) return <Database size={20} />;
  if (text.includes('web') || text.includes('site') || text.includes('internet')) return <Globe size={20} />;
  if (text.includes('file') || text.includes('read') || text.includes('write')) return <FileText size={20} />;
  if (text.includes('term') || text.includes('cmd') || text.includes('shell')) return <Terminal size={20} />;
  if (text.includes('chat') || text.includes('prompt') || text.includes('message')) return <MessageSquare size={20} />;
  return <Sparkles size={20} />;
};

const REST_STATIONS: StationType[] = [
  { id: 'rest_coffee', name: 'Binary Coffee', x: 90, y: 10, icon: <Coffee size={20} />, status: 'rest' },
  { id: 'rest_game', name: 'Gaming Zone', x: 10, y: 10, icon: <Gamepad2 size={20} />, status: 'rest' },
  { id: 'rest_zen', name: 'Zen Deck', x: 10, y: 90, icon: <Sparkles size={20} />, status: 'rest' },
  { id: 'rest_charge', name: 'Quick Charge', x: 90, y: 90, icon: <BatteryCharging size={20} />, status: 'rest' },
];

const WAITING_THOUGHTS = ["Coffee?", "Ping 1ms", "Calculating...", "Zzz...", "My turn?", "010101...", "Searching for updates", "Idle..."];
const RESTING_THOUGHTS = ["Task done!", "GG WP", "Recharging...", "Livin' the life", "Leisure time", "Afk", "Economy mode"];
const WORKING_THOUGHTS = ["Full focus!", "Processing...", "AI > Human", "Almost there...", "Debugging...", "Compiling..."];
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f43f5e', '#06b6d4'];

const CONFETTI_PARTICLES = [...Array(15)].map((_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 2
}));

export default function AnimationView() {
  const { 
    nodes, edges, currentProjectName, isExecuting, 
    startRealExecution, validateGraph, showNotification,
    executionResult
  } = useStore();
  const [robots, setRobots] = useState<Robot[]>([]);
  const [stations, setStations] = useState<StationType[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [employeeOfMonth, setEmployeeOfMonth] = useState<Robot | null>(null);
  const [isLogCollapsed, setIsLogCollapsed] = useState<boolean>(false);
  const [showResultScreen, setShowResultScreen] = useState<boolean>(false);
  
  // Refs for tracking sync
  const lastLogLength = useRef<number>(0);
  
  // Zoom and Pan State
  const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive Simulation Graph from Store
  const crewGraph = useMemo(() => {
    const agents = nodes.filter(n => n.type === 'agent');
    const tasks = nodes.filter(n => n.type === 'task');
    const order = agents.map(a => a.id);

    return {
      agents,
      tasks,
      order
    };
  }, [nodes]);

  const totalTasks = crewGraph.tasks.length;
  const completedTasks = useMemo(() => stations.filter((s: StationType) => s.status === 'done').length, [stations]);
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Initialize from Actual Workspace
  useEffect(() => {
    const taskStations: StationType[] = crewGraph.tasks.map((t, i) => {
      const angle = (i / Math.max(1, crewGraph.tasks.length)) * Math.PI * 2;
      const data = t.data as any;
      return {
        id: t.id,
        name: data.name || 'Untitled Task',
        x: 50 + Math.cos(angle) * 30,
        y: 50 + Math.sin(angle) * 30,
        icon: getTaskIcon(data.name || '', data.description || ''),
        status: 'pending'
      };
    });
    setStations([...taskStations, ...REST_STATIONS]);

    const initialRobots: Robot[] = crewGraph.agents.map((node, i) => {
      const data = node.data as any;
      
      const assignedTaskIds = edges
        .filter(e => e.source === node.id)
        .map(e => e.target)
        .filter(targetId => crewGraph.tasks.some(t => t.id === targetId));

      const totalWidth = 110; // Extra wide spread (beyond edges)
      const spacing = totalWidth / Math.max(1, crewGraph.agents.length - 1 || 1);
      const startX = -5 + (i * spacing);

      return {
        id: node.id,
        name: data.name || 'AI Agent',
        role: data.role || 'Assistant',
        x: startX,
        y: 105,
        targetX: startX,
        targetY: 105,
        state: 'idle',
        currentTask: null,
        color: COLORS[i % COLORS.length],
        assignedTasks: assignedTaskIds.length > 0 ? assignedTaskIds : (data.taskOrder || []),
        thought: null,
        energy: 100,
        efficiency: 85 + Math.random() * 15,
        mood: 'Ready',
        tasksCompleted: 0,
        trail: []
      };
    });
    setRobots(initialRobots);
  }, [crewGraph, edges]);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info', agentName?: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type,
      agentName
    };
    setLogs((prev: LogEntry[]) => [newLog, ...prev].slice(0, 50));
  }, []);

  // 1. SYNC REAL LOGS: Monitor executionResult from store
  useEffect(() => {
    if (!executionResult) {
      if (lastLogLength.current > 0) {
        setLogs([]);
        lastLogLength.current = 0;
      }
      return;
    }

    if (executionResult.length > lastLogLength.current) {
      const newContent = executionResult.substring(lastLogLength.current);
      const newLines = newContent.split('\n').filter(line => line.trim().length > 0);
      
      newLines.forEach(line => {
        // Strip box-drawing characters and clean up
        const cleanLine = line.replace(/[─╰╯│╭╮┬┴┤├┼═║╔╗╚╝]/g, '').trim();
        if (cleanLine.length === 0) return;

        // Simple heuristic to detect agent name or type
        let type: LogEntry['type'] = 'info';
        let agentName: string | undefined = undefined;

        if (cleanLine.includes('Success') || cleanLine.includes('Finished')) type = 'success';
        if (cleanLine.includes('Warning') || cleanLine.includes('Error')) type = 'warning';
        if (cleanLine.includes('working on')) type = 'ai';

        addLog(cleanLine, type, agentName);
      });

      lastLogLength.current = executionResult.length;
    }
  }, [executionResult, addLog]);

  // 2. SYNC ROBOT STATES: Monitor nodeStatuses from store
  useEffect(() => {
    if (!isExecuting) return;

    setRobots((prevRobots: Robot[]) => {
      return prevRobots.map((robot, i) => {
        const status = useStore.getState().nodeStatuses[robot.id];
        
        // If agent is running, find which task it's working on
        if (status === 'running') {
          // Find connected tasks that are currently running
          const activeTaskId = robot.assignedTasks.find(tid => 
            useStore.getState().nodeStatuses[tid] === 'running'
          );

          if (activeTaskId) {
            const station = stations.find(s => s.id === activeTaskId);
              const angle = (i / prevRobots.length) * Math.PI * 2;
              const radius = 4;
              const offsetX = Math.cos(angle) * radius;
              const offsetY = Math.sin(angle) * radius;

              if (station) {
                return {
                  ...robot,
                  state: 'working',
                  x: station.x + offsetX,
                  y: station.y + offsetY,
                  currentTask: station.name
                };
              }
          } else {
            // If agent is running but no specific task is 'running' yet, maybe it's moving
            const nextTaskId = robot.assignedTasks.find(tid => 
                useStore.getState().nodeStatuses[tid] === 'waiting' || 
                useStore.getState().nodeStatuses[tid] === 'running'
            );
            if (nextTaskId) {
                const station = stations.find(s => s.id === nextTaskId);
                if (station) {
                    const angle = (i / prevRobots.length) * Math.PI * 2;
                    const radius = 4;
                    const offsetX = Math.cos(angle) * radius;
                    const offsetY = Math.sin(angle) * radius;

                    return {
                        ...robot,
                        state: 'moving',
                        targetX: station.x + offsetX,
                        targetY: station.y + offsetY,
                        currentTask: station.name
                    };
                }
            }
          }
        }

        if (status === 'success' && robot.state !== 'completed') {
            const restStation = REST_STATIONS[Math.floor(Math.random() * REST_STATIONS.length)];
            const angle = (i / prevRobots.length) * Math.PI * 2;
            const radius = 3; 
            const offsetX = Math.cos(angle) * radius;
            const offsetY = Math.sin(angle) * radius;

            return { 
                ...robot, 
                state: 'completed', 
                currentTask: `Resting in ${restStation.name}`,
                tasksCompleted: robot.tasksCompleted + 1,
                x: restStation.x + offsetX,
                y: restStation.y + offsetY
            };
        }

        return robot;
      });
    });

    // Sync Stations
    setStations((prevStations: StationType[]) => {
        return prevStations.map(station => {
            const status = useStore.getState().nodeStatuses[station.id];
            if (status === 'success') return { ...station, status: 'done' };
            if (status === 'running') return { ...station, status: 'active' };
            return station;
        });
    });

  }, [isExecuting, nodes, stations]); // Watch nodes/stations for change to re-map

  const startCrew = () => {
    if (isExecuting || crewGraph.agents.length === 0) return;
    
    if (!validateGraph()) {
      showNotification("Your crew has configuration errors. Please check the nodes marked in red.", "error");
      return;
    }

    // Reset local log tracking
    lastLogLength.current = 0;
    setLogs([]);
    setIsRunning(true);
    setShowSuccessModal(false);
    setEmployeeOfMonth(null);

    startRealExecution();
    addLog(`🚀 Starting Real Crew Execution`, 'ai');
  };

  // Sync animation with real execution status
  useEffect(() => {
    if (!isExecuting && isRunning) {
      setIsRunning(false);
      addLog("✅ Crew execution finished.", "success");
      
      // Select winner for the modal
      const winner = [...robots].sort((a, b) => (b.tasksCompleted * b.efficiency) - (a.tasksCompleted * a.efficiency))[0];
      setEmployeeOfMonth(winner || null);
      setShowSuccessModal(true);
    }
  }, [isExecuting, isRunning, addLog, robots]);

  // Zoom and Pan Handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const newScale = Math.min(Math.max(viewState.scale - e.deltaY * zoomSpeed, 0.4), 4);
    setViewState((prev) => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    if ((e.target as HTMLElement).closest('.interactive-element')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - viewState.x, y: e.clientY - viewState.y };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setViewState((prev) => ({
      ...prev,
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    }));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Thought Generator Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setRobots((prev: Robot[]) => prev.map((robot: Robot) => {
        if (robot.thought) {
          return Math.random() > 0.7 ? { ...robot, thought: null } : robot;
        } else if (Math.random() > 0.95) {
          let pool = WAITING_THOUGHTS;
          if (robot.state === 'working') pool = WORKING_THOUGHTS;
          if (robot.state === 'resting' || robot.state === 'completed') pool = RESTING_THOUGHTS;
          return { ...robot, thought: pool[Math.floor(Math.random() * pool.length)] };
        }
        return robot;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Legacy simulation logic removed in favor of real-time sync with nodeStatuses

  return (
    <div className="flex-1 relative bg-[#0a0a0f] text-white font-sans overflow-hidden flex flex-col animate-in fade-in duration-500">
      
      {/* Main Flex Content */}
      <main className="flex-1 flex flex-row w-full h-full overflow-hidden bg-brand-bg">
        
        {/* Simulation Area (Canvas) - Flexible */}
        <div 
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          className="flex-grow h-full relative overflow-hidden bg-black/20 transition-all duration-300 ease-in-out cursor-grab active:cursor-grabbing"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: `${100 * viewState.scale}px ${100 * viewState.scale}px`,
            backgroundPosition: `${viewState.x}px ${viewState.y}px`
          }}
        >
          {/* Zoomable Content */}
          <motion.div
            animate={{ x: viewState.x, y: viewState.y, scale: viewState.scale }}
            transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.5 }}
            className="absolute inset-0 w-full h-full origin-center"
          >
               {/* Digital Rain Background */}
               <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="flex justify-around h-full w-full">
                  {[...Array(15)].map((_, i) => ( // Reduced to 15 for better perf
                    <motion.div
                      key={i}
                      initial={{ y: -100 }}
                      animate={{ y: 1000 }}
                      transition={{ 
                        duration: 5 + Math.random() * 10, 
                        repeat: Infinity, 
                        ease: "linear",
                        delay: Math.random() * 5
                      }}
                      className="text-[10px] font-mono text-indigo-500 whitespace-nowrap"
                      style={{ writingMode: 'vertical-rl' }}
                    >
                      {Math.random().toString(2).substring(2, 15)}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Data Link Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {robots.map((robot: Robot) => (
                  <g key={`trail-group-${robot.id}`}>
                    {robot.trail.map((pos: {x: number, y: number}, idx: number) => {
                      const opacity = (idx / robot.trail.length) * 0.4;
                      const size = (idx / robot.trail.length) * 4;
                      return (
                        <circle
                          key={`trail-${robot.id}-${idx}`}
                          cx={`${pos.x}%`}
                          cy={`${pos.y}%`}
                          r={size}
                          fill={robot.color}
                          style={{ opacity }}
                        />
                      );
                    })}
                  </g>
                ))}

                {robots.filter((r: Robot) => r.state === 'working').map((robot: Robot) => {
                  const station = stations.find((s: StationType) => s.id === robot.currentTask || s.name === robot.currentTask);
                  if (!station) return null;
                  return (
                    <motion.line
                      key={`link-${robot.id}`}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.4 }}
                      x1={`${robot.x}%`}
                      y1={`${robot.y}%`}
                      x2={`${station.x}%`}
                      y2={`${station.y}%`}
                      stroke={robot.color}
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Hub Connection Lines (Task back-reporting) */}
                {stations.filter(s => s.status !== 'rest').map((station) => {
                  return (
                    <motion.line
                      key={`hub-link-${station.id}`}
                      initial={{ pathLength: 0, opacity: 0.1 }}
                      animate={{ 
                        pathLength: station.status === 'done' ? 1 : 0.4, 
                        opacity: station.status === 'done' ? 0.8 : 0.05,
                        stroke: station.status === 'done' ? '#10b981' : 'rgba(255,255,255,0.05)' 
                      }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                      x1={`${station.x}%`}
                      y1={`${station.y}%`}
                      x2="50%"
                      y2="50%"
                      strokeWidth="1"
                      strokeDasharray={station.status === 'done' ? "0" : "4 4"}
                      className="z-0"
                    />
                  );
                })}
              </svg>

              {/* Stations */}
              {stations.map((station: StationType) => (
                <Station key={station.id} station={station} />
              ))}

              {/* Central Hub */}
              <motion.div
                className="absolute left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto cursor-pointer"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                onClick={() => setShowResultScreen(true)}
              >
                <div className="relative group">
                  {/* Hub Glow */}
                  <div className="absolute -inset-4 bg-indigo-500/10 blur-xl rounded-full animate-pulse" />
                  <div 
                    className="p-3 bg-[#0a0e14] backdrop-blur-md border border-indigo-500/30 rounded-xl relative z-20 shadow-[0_0_30px_rgba(79,70,229,0.2)]"
                  >
                    <Monitor size={24} className="text-indigo-400" />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[7px] font-mono text-indigo-400/60 uppercase tracking-[0.2em] font-bold">
                    Central Hub
                  </div>
                </div>
              </motion.div>

              {/* Robots */}
              {robots.map((robot: Robot) => (
                <motion.div
                  key={robot.id}
                  className="absolute z-20 interactive-element"
                  animate={{ left: `${robot.x}%`, top: `${robot.y}%` }}
                  transition={{ type: 'spring', damping: 25, stiffness: 120, mass: 1 }}
                >
                  <div className="flex flex-col items-center -translate-x-1/2 -translate-y-1/2">
                    <RobotIcon 
                      color={robot.color} 
                      state={robot.state} 
                      thought={robot.thought} 
                      isSelected={selectedRobotId === robot.id}
                      onClick={() => setSelectedRobotId(robot.id === selectedRobotId ? null : robot.id)}
                    />
                    <div className="mt-2 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded border border-white/10 text-[9px] font-mono whitespace-nowrap text-center">
                      <div className="font-bold">{robot.name}</div>
                      <div className="text-gray-500 text-[8px]">{robot.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
          </motion.div>

          {/* Overlays (Inside Simulation Area) */}
          
          {/* Technical Sub-header */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 flex items-center gap-4 pointer-events-auto shadow-2xl">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-indigo-400" />
              <span className="text-[10px] font-mono font-bold text-white uppercase tracking-tight">Simple Crew Builder</span>
            </div>
            <div className="h-3 w-[1px] bg-white/10" />
            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-tighter">Process: Sequential | {currentProjectName || 'Untitled Project'}</span>
          </div>

          {/* Global Progress UI */}
          <div className="absolute top-6 left-6 z-40 w-80 bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl overflow-hidden pointer-events-auto">
            {progressPercent === 100 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-emerald-500/10 pointer-events-none"
              />
            )}
            <div className="flex justify-between items-end mb-2 relative z-10">
              <div className="flex flex-col">
                <span className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Operation Status</span>
                <span className={`text-xs font-mono shadow-sm ${progressPercent === 100 ? 'text-emerald-400' : 'text-indigo-400'}`}>
                  {completedTasks} / {totalTasks} Tasks {progressPercent === 100 ? 'COMPLETED' : 'IN PROGRESS'}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-2xl font-black font-mono leading-none ${progressPercent === 100 ? 'text-emerald-400' : 'text-white'}`}>
                  {progressPercent}%
                </span>
              </div>
            </div>
            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden relative">
              <motion.div 
                className={`h-full shadow-[0_0_15px_rgba(79,70,229,0.5)] ${progressPercent === 100 ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-indigo-500'}`}
                animate={{ width: `${progressPercent}%` }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              />
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-6 right-6 z-40 flex flex-col gap-2 bg-black/60 p-4 rounded-2xl border border-white/10 backdrop-blur-md pointer-events-auto">
            <h3 className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1">Legend</h3>
            <div className="flex items-center gap-2 text-[9px] font-mono text-gray-300">
              <div className="w-2 h-2 rounded-full bg-white/20 border border-white/10" /> Pending
            </div>
            <div className="flex items-center gap-2 text-[9px] font-mono text-indigo-400">
              <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#4f46e5]" /> Running
            </div>
            <div className="flex items-center gap-2 text-[9px] font-mono text-emerald-500">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" /> Completed
            </div>
            <div className="flex items-center gap-2 text-[9px] font-mono text-amber-500">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" /> Resting
            </div>
          </div>

          {/* View Controls */}
          <div className="absolute bottom-6 left-6 z-40 flex gap-2">
              <button onClick={() => setViewState((prev) => ({ ...prev, scale: Math.min(prev.scale + 0.2, 4) }))} className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-white">
                  <Search size={16} className="rotate-90" />
              </button>
              <button onClick={() => setViewState((prev) => ({ ...prev, scale: Math.max(prev.scale - 0.2, 0.4) }))} className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-white">
                  <Search size={16} />
              </button>
              <button onClick={() => setViewState({ x: 0, y: 0, scale: 1 })} className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-white text-[10px] font-bold">1:1</button>
          </div>

          {/* Start Button */}
          <div className="absolute top-6 right-6 z-40 flex gap-2">
              <button 
                  onClick={startCrew}
                  disabled={isExecuting || crewGraph.agents.length === 0}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm transition-all ${
                      isExecuting || crewGraph.agents.length === 0
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                  }`}
              >
                  <Play size={16} fill={isExecuting ? 'none' : 'currentColor'} />
                  {isExecuting ? 'RUNNING...' : 'START CREW'}
              </button>
          </div>
        </div>

        {/* Console Log Panel (Sidebar) */}
        <motion.div 
            animate={{ width: isLogCollapsed ? '64px' : '450px' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="h-full flex-shrink-0 relative overflow-hidden flex flex-col"
        >
            <SimulationLog 
              logs={logs} 
              isCollapsed={isLogCollapsed} 
              onToggle={() => setIsLogCollapsed(!isLogCollapsed)} 
            />
        </motion.div>
      </main>

      {/* Robot Detail Card */}
      <AnimatePresence>
        {selectedRobotId && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center p-6 pointer-events-none">
            {/* Backdrop for the card only */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRobotId(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, x: -20 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0.9, opacity: 0, x: -20 }}
              className="w-full max-w-sm bg-[#0f172a]/95 border border-indigo-500/30 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden pointer-events-auto"
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% 95%, 95% 100%, 0 100%)' }}
            >
              {/* Card Glow Header */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
              
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex justify-between items-start bg-indigo-500/5">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="p-3 bg-black/40 border border-white/10 rounded-lg">
                      <Bot size={28} style={{ color: robots.find(r => r.id === selectedRobotId)?.color }} />
                    </div>
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0f172a]" 
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none mb-1">
                      {robots.find(r => r.id === selectedRobotId)?.name}
                    </h3>
                    <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest opacity-80">
                      {robots.find(r => r.id === selectedRobotId)?.role}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedRobotId(null)}
                  className="p-1 hover:bg-white/10 rounded-md transition-colors text-gray-500 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Stats Grid */}
              <div className="p-6 space-y-6">
                {/* Status Section */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">Current State</span>
                    <span className="text-xs font-mono text-indigo-400 uppercase font-bold">
                      {robots.find(r => r.id === selectedRobotId)?.state}
                    </span>
                  </div>
                  <div className="p-3 bg-black/40 border border-white/5 rounded-lg flex items-center gap-3">
                    <Activity size={14} className="text-indigo-400" />
                    <span className="text-[11px] font-mono text-gray-300 italic truncate max-w-full">
                      {robots.find(r => r.id === selectedRobotId)?.currentTask || 'Awaiting orders...'}
                    </span>
                  </div>
                </div>

                {/* Energy & Efficiency Bars */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 uppercase font-bold">
                      <div className="flex items-center gap-1"><Zap size={10} /> Energia</div>
                      <span className="text-white">{Math.round(robots.find(r => r.id === selectedRobotId)?.energy || 0)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${robots.find(r => r.id === selectedRobotId)?.energy || 0}%` }}
                        className="h-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 uppercase font-bold">
                      <div className="flex items-center gap-1"><BarChart3 size={10} /> Efficiency</div>
                      <span className="text-white">{Math.round(robots.find(r => r.id === selectedRobotId)?.efficiency || 0)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${robots.find(r => r.id === selectedRobotId)?.efficiency || 0}%` }}
                        className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.4)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Stats */}
                <div className="pt-4 border-t border-white/5 flex justify-around">
                  <div className="text-center">
                    <div className="text-[8px] text-gray-500 uppercase font-bold mb-1">Missions Done</div>
                    <div className="flex items-center justify-center gap-1.5">
                      <Award size={14} className="text-amber-500" />
                      <span className="text-lg font-mono font-black text-white">
                        {robots.find(r => r.id === selectedRobotId)?.tasksCompleted}
                      </span>
                    </div>
                  </div>
                  <div className="h-10 w-[1px] bg-white/5" />
                  <div className="text-center">
                    <div className="text-[8px] text-gray-500 uppercase font-bold mb-1">Mood Status</div>
                    <div className="text-xs font-bold text-emerald-400 mt-1 uppercase tracking-tight">
                      {robots.find(r => r.id === selectedRobotId)?.mood || 'Nominal'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none transition-transform group-hover:scale-110">
                <div className="text-[40px] font-black font-mono leading-none text-indigo-500/10">
                  #SCBP
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6"
          >
            <motion.div 
              animate={{ y: ['0%', '1000%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 left-0 w-full h-1 bg-indigo-500/20 blur-sm pointer-events-none z-0"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-[#0f172a] border-2 border-indigo-500/50 rounded-none p-10 max-w-xl w-full shadow-[0_0_50px_rgba(79,70,229,0.3)] text-center relative overflow-hidden"
              style={{ clipPath: 'polygon(0 0, 95% 0, 100% 5%, 100% 100%, 5% 100%, 0 95%)' }}
            >
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              
              {CONFETTI_PARTICLES.map(p => (
                <motion.div
                  key={p.id}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ 
                    y: [null, 500], 
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{ 
                    duration: 2 + Math.random() * 2, 
                    repeat: Infinity, 
                    delay: p.delay,
                    ease: "linear"
                  }}
                  className="absolute top-0 pointer-events-none font-mono text-[10px] text-indigo-400/40"
                  style={{ left: `${p.x}%` }}
                >
                  {Math.random() > 0.5 ? '1' : '0'}
                </motion.div>
              ))}

              <div className="relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="absolute -inset-4 border border-dashed border-indigo-500/50 rounded-full"
                    />
                    <div className="p-6 bg-indigo-500/10 border border-indigo-500/30 rounded-full relative">
                      <CheckCircle2 size={48} className="text-indigo-400" />
                    </div>
                  </div>
                </div>
                
                <div className="mb-8">
                  <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-[0.4em] mb-2">System Diagnostic: Complete</div>
                  <h2 className="text-4xl font-mono font-black mb-2 text-white tracking-tighter uppercase">Mission Accomplished</h2>
                  <div className="h-0.5 w-24 bg-indigo-500 mx-auto mb-4" />
                  <p className="text-gray-400 font-mono text-[10px] max-w-xs mx-auto leading-relaxed uppercase">
                    Execution protocols finalized. All agents have returned to readiness state.
                  </p>
                </div>

                {employeeOfMonth && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-black/40 border border-indigo-500/30 p-6 mb-8 relative group text-left"
                    style={{ clipPath: 'polygon(5% 0, 100% 0, 100% 90%, 95% 100%, 0 100%, 0 10%)' }}
                  >
                    <div className="absolute top-0 left-0 w-full h-full border-l-2 border-indigo-500/50 pointer-events-none" />
                    
                    <div className="flex items-center gap-6">
                      <div className="relative shrink-0">
                        <div className="w-16 h-16 bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-center">
                          <Bot size={32} style={{ color: employeeOfMonth.color }} />
                        </div>
                        <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-indigo-500" />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-indigo-500" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="text-[8px] font-mono text-indigo-400 uppercase tracking-widest mb-1">Top Performer Identified</div>
                        <div className="text-lg font-black text-white uppercase tracking-tight mb-0.5">{employeeOfMonth.name}</div>
                        <div className="text-[9px] text-gray-500 font-mono uppercase mb-2 tracking-tighter">{employeeOfMonth.role}</div>
                        
                        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-2">
                          <div>
                            <div className="text-[8px] text-gray-500 uppercase font-bold">Tasks</div>
                            <div className="text-md font-mono font-bold text-indigo-400">{employeeOfMonth.tasksCompleted}</div>
                          </div>
                          <div>
                            <div className="text-[8px] text-gray-500 uppercase font-bold">Efficiency</div>
                            <div className="text-md font-mono font-bold text-indigo-400">{employeeOfMonth.efficiency.toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResultScreen(true)}
                    className="flex-1 py-4 bg-white/5 text-indigo-400 font-mono font-bold text-xs hover:bg-white/10 transition-all uppercase tracking-widest border border-indigo-500/30"
                    style={{ clipPath: 'polygon(0 0, 90% 0, 100% 30%, 100% 100%, 10% 100%, 0 70%)' }}
                  >
                    View Result
                  </button>
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="flex-1 py-4 bg-indigo-600 text-white font-mono font-bold text-xs hover:bg-indigo-500 transition-all uppercase tracking-widest border border-indigo-400/50"
                    style={{ clipPath: 'polygon(0 0, 90% 0, 100% 30%, 100% 100%, 10% 100%, 0 70%)' }}
                  >
                    Return to Terminal
                  </button>
                </div>
              </div>

              <div className="absolute top-2 left-2 w-8 h-8 border-t border-l border-indigo-500/30" />
              <div className="absolute bottom-2 right-2 w-8 h-8 border-b border-r border-indigo-500/30" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ResultComputerScreen 
        isOpen={showResultScreen}
        onClose={() => setShowResultScreen(false)}
        result={executionResult || ""}
      />

      {/* Footer Status Bar */}
      <footer className="h-8 bg-indigo-600/10 backdrop-blur-md border-t border-white/5 flex items-center justify-center gap-12 text-[9px] font-mono text-gray-500 z-50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          CREWAI ENGINE: READY
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          SYNC: REAL-TIME
        </div>
        <div className="flex items-center gap-2 uppercase">
          PROJETO: {currentProjectName || 'ACTIVE'}
        </div>
      </footer>
    </div>
  );
}
