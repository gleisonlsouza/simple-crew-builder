import React from 'react';

export type RobotState = 'idle' | 'moving' | 'working' | 'completed' | 'resting';

export interface Robot {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  state: RobotState;
  currentTask: string | null;
  color: string;
  icon?: React.ReactNode;
  assignedTasks: string[];
  thought: string | null;
  energy: number;
  efficiency: number;
  mood: string;
  tasksCompleted: number;
  trail: { x: number, y: number }[];
}

export interface Station {
  id: string;
  name: string;
  x: number;
  y: number;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'done' | 'rest';
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'ai';
  agentName?: string;
}
