import React, { useRef } from 'react';
import { User, CheckSquare, Users, Upload, Settings, PlusCircle } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useStore } from '../store';

export function Sidebar() {
  const setIsSettingsOpen = useStore((state) => state.setIsSettingsOpen);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fitView } = useReactFlow();
  const loadProjectJson = useStore((state) => state.loadProjectJson);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const json = JSON.parse(content);
        const success = loadProjectJson(json);
        if (success) {
          setTimeout(() => fitView({ duration: 800 }), 100);
        }
      } catch (err) {
        console.error("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-64 bg-brand-card border-r border-brand-border h-full flex flex-col transition-all duration-300">
      <div className="p-4 border-b border-brand-border h-16 flex items-center">
        <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
          Components
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          <div
            className="bg-brand-card border border-brand-border rounded-lg p-3 flex items-center justify-between cursor-grab hover:shadow-md hover:border-violet-400 dark:hover:border-violet-500 transition-all active:cursor-grabbing group relative"
            onDragStart={(event) => onDragStart(event, 'crew')}
            draggable
          >
            <div className="flex items-center gap-3">
              <div className="bg-violet-100 dark:bg-violet-900/30 p-2 rounded-md group-hover:bg-violet-500 group-hover:text-white transition-colors">
                <Users className="w-4 h-4 text-violet-600 dark:text-violet-400 group-hover:text-white" />
              </div>
              <span className="text-sm font-medium text-brand-text">Crew</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const state = useStore.getState();
                state.addNodeWithAutoPosition('crew', { 
                  process: 'sequential', 
                  isCollapsed: false 
                });
                setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
              }}
              className="p-1.5 hover:bg-violet-100 dark:hover:bg-violet-900/50 rounded-md text-violet-600 dark:text-violet-400 transition-colors"
              aria-label="Add Crew to canvas"
              title="Add Crew to canvas"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>

          <div
            className="bg-brand-card border border-brand-border rounded-lg p-3 flex items-center justify-between cursor-grab hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all active:cursor-grabbing group relative"
            onDragStart={(event) => onDragStart(event, 'agent')}
            draggable
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-md group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:text-white" />
              </div>
              <span className="text-sm font-medium text-brand-text">Agent</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const state = useStore.getState();
                const timestamp = Date.now().toString().slice(-4);
                state.addNodeWithAutoPosition('agent', { 
                  name: `New Agent ${timestamp}`, 
                  role: '', 
                  goal: '', 
                  backstory: '', 
                  isCollapsed: false 
                });
                setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
              }}
              className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md text-blue-600 dark:text-blue-400 transition-colors"
              aria-label="Add Agent to canvas"
              title="Add Agent to canvas"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>

          <div
            className="bg-brand-card border border-brand-border rounded-lg p-3 flex items-center justify-between cursor-grab hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-500 transition-all active:cursor-grabbing group relative"
            onDragStart={(event) => onDragStart(event, 'task')}
            draggable
          >
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-md group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:text-white" />
              </div>
              <span className="text-sm font-medium text-brand-text">Task</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const state = useStore.getState();
                const timestamp = Date.now().toString().slice(-4);
                state.addNodeWithAutoPosition('task', { 
                  name: `New Task ${timestamp}`, 
                  description: '', 
                  expected_output: '' 
                });
                setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
              }}
              className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-md text-emerald-600 dark:text-emerald-400 transition-colors"
              aria-label="Add Task to canvas"
              title="Add Task to canvas"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-brand-border opacity-40">
           <p className="text-[10px] text-brand-muted text-center italic">Drag components to build your workflow</p>
        </div>
      </div>

      <div className="p-4 border-t border-brand-border bg-brand-bg/30 space-y-2">
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-brand-muted hover:bg-brand-card hover:text-brand-text rounded-lg transition-all"
        >
          <Upload className="w-4 h-4" />
          Import JSON
        </button>
        
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-brand-muted hover:bg-brand-card hover:text-brand-text rounded-lg transition-all"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
    </div>
  );
}
