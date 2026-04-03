import { useState } from 'react';
import { X, Moon, Sun, Bell, Shield, Info, Plus, FolderOpen } from 'lucide-react';
import { useStore } from '../store/index';

export function SettingsDrawer() {
  const isSettingsOpen = useStore((state) => state.isSettingsOpen);
  const setIsSettingsOpen = useStore((state) => state.setIsSettingsOpen);
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);
  const currentProjectId = useStore((state) => state.currentProjectId);
  const currentProjectWorkspaceId = useStore((state) => state.currentProjectWorkspaceId);
  const updateProjectWorkspaceId = useStore((state) => state.updateProjectWorkspaceId);
  const workspaces = useStore((state) => state.workspaces);
  const addWorkspace = useStore((state) => state.addWorkspace);
  const deleteWorkspace = useStore((state) => state.deleteWorkspace);
  const setIsExplorerOpen = useStore((state) => state.setIsExplorerOpen);
  const setCurrentExplorerWsId = useStore((state) => state.setCurrentExplorerWsId);
  const [newWsName, setNewWsName] = useState('');
  const [newWsPath, setNewWsPath] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
        onClick={() => setIsSettingsOpen(false)}
      />
      
      <div className="absolute inset-y-0 right-0 max-w-sm w-full bg-brand-card shadow-2xl border-l border-brand-border flex flex-col transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between bg-brand-bg/50 transition-colors">
          <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
            Settings
          </h2>
          <button 
            onClick={() => setIsSettingsOpen(false)}
            className="p-2 hover:bg-brand-bg rounded-full transition-colors text-brand-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Appearance Section */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 px-1">
              Appearance
            </h3>
            <div className="bg-brand-bg rounded-2xl border border-brand-border p-5 transition-colors">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-brand-card rounded-xl border border-brand-border text-brand-text transition-all shadow-sm">
                    {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brand-text">System Theme</p>
                    <p className="text-[11px] text-brand-muted">Switch between light and dark mode</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => theme === 'dark' && toggleTheme()}
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-bold border transition-all duration-300 ${
                    theme === 'light' 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95' 
                      : 'bg-brand-card border-brand-border text-brand-muted hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  Light
                </button>
                <button
                  onClick={() => theme === 'light' && toggleTheme()}
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-bold border transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95' 
                      : 'bg-brand-card border-brand-border text-brand-muted hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </button>
              </div>
            </div>
          </section>

          {/* Execution Workspace Section - Only for specific projects */}
          {currentProjectId && (
            <section>
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 px-1">
                Execution Workspace
              </h3>
              <div className="bg-brand-bg rounded-2xl border border-brand-border p-5 transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2.5 bg-brand-card rounded-xl border border-brand-border text-brand-text transition-all shadow-sm">
                    <Shield className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brand-text">Project Environment</p>
                    <p className="text-[11px] text-brand-muted">Select where files will be created</p>
                  </div>
                </div>

                <select
                  value={currentProjectWorkspaceId || ''}
                  onChange={(e) => updateProjectWorkspaceId(e.target.value || null)}
                  className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-sm font-medium text-brand-text outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer appearance-none"
                >
                  <option value="">Default (Global Settings)</option>
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
                
                {!currentProjectWorkspaceId && (
                  <p className="mt-3 text-[10px] text-brand-muted italic flex items-center gap-1.5 px-1">
                    <Info className="w-3 h-3" />
                    Currently using the workspace defined in global settings.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Workspaces Management Section */}
          <section className="pt-4 border-t border-brand-border/50">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
              Workspaces Management
            </h3>
            <p className="text-[11px] text-brand-muted opacity-80 mb-4 px-1 leading-relaxed">
              Create and manage directories for your agents to read and write files. These workspaces can be linked to specific workflows.
            </p>

            <div className="space-y-4">
              {/* Add New Workspace Trigger */}
              {!isAdding ? (
                <button 
                  onClick={() => setIsAdding(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-brand-border rounded-xl text-xs font-medium text-brand-muted hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-500/5 transition-all duration-300"
                >
                  <Plus className="w-4 h-4" />
                  Add Workspace
                </button>
              ) : (
                <div className="space-y-4 p-4 bg-brand-bg/50 rounded-2xl border border-brand-border animate-in fade-in slide-in-from-top-2 duration-300 shadow-inner">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider px-1">Workspace Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Research Hub"
                        value={newWsName}
                        onChange={(e) => setNewWsName(e.target.value)}
                        className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-2.5 text-xs text-brand-text outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider px-1">Directory Path</label>
                      <input 
                        type="text" 
                        placeholder="e.g. workspaces/research"
                        value={newWsPath}
                        onChange={(e) => setNewWsPath(e.target.value)}
                        className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-2.5 text-xs text-brand-text outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button 
                      onClick={async () => {
                        if (newWsName && newWsPath) {
                          await addWorkspace({ name: newWsName, path: newWsPath });
                          setNewWsName('');
                          setNewWsPath('');
                          setIsAdding(false);
                        }
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                    >
                      Save Workspace
                    </button>
                    <button 
                      onClick={() => setIsAdding(false)}
                      className="flex-1 bg-brand-card border border-brand-border text-brand-muted rounded-xl py-2.5 text-xs font-bold hover:bg-brand-bg transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* List of existing workspaces (Badge/Row style) */}
              <div className="flex flex-wrap gap-2 pt-2">
                {workspaces.map((ws) => (
                  <div 
                    key={ws.id} 
                    className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-brand-bg/50 border border-brand-border rounded-xl group transition-all hover:border-indigo-500/50 hover:bg-indigo-500/5"
                  >
                    <div className="flex flex-col max-w-[120px]">
                      <span className="text-xs font-bold text-brand-text truncate">{ws.name}</span>
                      <span className="text-[9px] text-brand-muted truncate opacity-70 italic">{ws.path}</span>
                    </div>
                    
                    <div className="flex items-center gap-0.5 ml-1">
                      <button 
                        onClick={() => {
                          setCurrentExplorerWsId(ws.id);
                          setIsExplorerOpen(true);
                        }}
                        className="p-1.5 hover:bg-indigo-500/10 rounded-lg text-brand-muted hover:text-indigo-500 transition-colors"
                        title="Open Folder"
                      >
                         <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm('Permanently delete this workspace from system?')) deleteWorkspace(ws.id);
                        }}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-brand-muted hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                         <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {workspaces.length === 0 && !isAdding && (
                  <div className="w-full text-center py-8 px-4 bg-brand-bg/30 border border-dashed border-brand-border rounded-2xl">
                    <p className="text-[10px] text-brand-muted italic">No workspaces configured yet.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* General Section */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 px-1">
              General
            </h3>
            <div className="space-y-1">
              <button className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-brand-bg transition-all text-brand-muted hover:text-brand-text group">
                <div className="flex items-center gap-4">
                  <Bell className="w-5 h-5 opacity-70 group-hover:opacity-100" />
                  <span className="text-sm font-bold">Notifications</span>
                </div>
                <Info className="w-4 h-4 opacity-30" />
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-brand-border bg-brand-bg/50 flex flex-col items-center gap-3 transition-colors">
          <p className="text-[11px] font-bold text-brand-muted uppercase tracking-widest">SimpleCrew Builder v1.0.0</p>
          <div className="flex gap-6">
             <button className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline">Support</button>
             <button className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline">Documentation</button>
          </div>
        </div>

      </div>
    </div>
  );
}
