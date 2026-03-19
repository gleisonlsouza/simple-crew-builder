import React, { useRef, useState } from 'react';
import { User, CheckSquare, Users, Upload, Settings, PlusCircle, FolderOpen, X, ExternalLink, Info, Plus } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import toast from 'react-hot-toast';
import { useStore } from '../store';

export function Sidebar() {
  const setIsSettingsOpen = useStore((state) => state.setIsSettingsOpen);
  const workspaces = useStore((state) => state.workspaces);
  const activeWorkspaceId = useStore((state) => state.activeWorkspaceId);
  const updateSettings = useStore((state) => state.updateSettings);
  const currentProjectId = useStore((state) => state.currentProjectId);
  const currentProjectWorkspaceId = useStore((state) => state.currentProjectWorkspaceId);
  const updateProjectWorkspaceId = useStore((state) => state.updateProjectWorkspaceId);
  const setIsExplorerOpen = useStore((state) => state.setIsExplorerOpen);
  const setCurrentExplorerWsId = useStore((state) => state.setCurrentExplorerWsId);
  
  const [isWsSelectorOpen, setIsWsSelectorOpen] = useState(false);
  
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

  const handleSelectWorkspace = async (id: string) => {
    if (currentProjectId) {
      // Toggle logic: If clicking the already selected one, set to null (unlink)
      const newId = currentProjectWorkspaceId === id ? null : id;
      updateProjectWorkspaceId(newId);
      
      if (newId) {
        toast.success("Workspace linked to this workflow. 🔗");
      } else {
        toast("Workspace unlinked from this workflow (using global default). 🔓", { icon: '🔓' });
      }
    } else {
      // Fallback: update global session workspace if no project is active, also with toggle
      const newId = activeWorkspaceId === id ? null : id;
      await updateSettings({ active_workspace_id: newId });
    }
  };

  const handleUnlinkWorkspace = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentProjectId) {
      updateProjectWorkspaceId(null);
      toast("Workspace unlinked from this workflow. 🔓", { icon: '🔓' });
    } else {
      await updateSettings({ active_workspace_id: null });
    }
  };

  const handleOpenWorkspace = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCurrentExplorerWsId(id);
    setIsExplorerOpen(true);
  };

  // Get the currently linked workspace object
  const linkedWsId = currentProjectId ? currentProjectWorkspaceId : activeWorkspaceId;
  const linkedWorkspace = workspaces.find(ws => ws.id === linkedWsId);


  return (
    <div className="w-64 bg-brand-card border-r border-brand-border h-full flex flex-col transition-all duration-300">
      <div className="p-4 border-b border-brand-border h-16 flex items-center">
        <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
          Components
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
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

        <div className="mt-6 pt-6 border-t border-brand-border">
          <div className="flex items-center gap-2 px-1 mb-4">
            <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Workspaces</span>
          </div>
          
          <div className="relative">
            {linkedWorkspace ? (
              /* ACTIVE SLOT: Show the linked workspace with actions */
              <div className="flex items-center justify-between p-2.5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl group transition-all hover:bg-indigo-500/10 active:scale-[0.98]">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate">{linkedWorkspace.name}</span>
                    <span className="text-[9px] text-brand-muted truncate opacity-70 italic">{linkedWorkspace.path}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-0.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => handleOpenWorkspace(e, linkedWorkspace.id)}
                    className="p-1.5 hover:bg-indigo-500/10 rounded-lg text-brand-muted hover:text-indigo-500 transition-colors"
                    title="Open Folder"
                  >
                     <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => handleUnlinkWorkspace(e)}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-brand-muted hover:text-red-500 transition-colors"
                    title="Remove from Workflow"
                  >
                     <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* EMPTY SLOT: Show the dashed "Add/Link" button */
              <button 
                onClick={() => setIsWsSelectorOpen(!isWsSelectorOpen)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-brand-border rounded-xl text-[11px] font-bold text-brand-muted hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-500/5 transition-all duration-300 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Link Workspace
              </button>
            )}

            {/* Selection Dropdown */}
            {isWsSelectorOpen && (
              <>
                <div 
                  className="fixed inset-0 z-[60]" 
                  onClick={() => setIsWsSelectorOpen(false)}
                />
                <div className="absolute left-0 bottom-full mb-2 w-full bg-brand-card border border-brand-border rounded-xl shadow-2xl z-[70] py-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="px-3 py-1.5 border-b border-brand-border mb-1">
                    <span className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">Select Workspace</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto px-1 custom-scrollbar">
                    {workspaces.map(ws => (
                      <button
                        key={ws.id}
                        onClick={() => {
                          handleSelectWorkspace(ws.id);
                          setIsWsSelectorOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-brand-text hover:bg-brand-bg rounded-lg transition-colors text-left group"
                      >
                        <span className="truncate flex-1 font-medium">{ws.name}</span>
                        <Plus className="w-3 h-3 text-brand-muted group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                    {workspaces.length === 0 && (
                      <div className="px-3 py-4 text-center">
                        <p className="text-[10px] text-brand-muted italic">No workspaces found.</p>
                        <button 
                          onClick={() => {
                            setIsWsSelectorOpen(false);
                            setIsSettingsOpen(true);
                          }}
                          className="text-[10px] text-indigo-500 font-bold hover:underline mt-1"
                        >
                          Create one in Settings
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {!linkedWorkspace && currentProjectId && (
               <div className="mt-3 px-2 py-2 bg-brand-bg/30 border border-brand-border/30 rounded-lg text-[10px] text-brand-muted italic flex items-center gap-2 leading-tight">
                 <Info className="w-3 h-3 text-indigo-400 shrink-0" />
                 Currently using global default workspace
               </div>
            )}
          </div>
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
