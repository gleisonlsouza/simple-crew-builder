import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Workflow, 
  Clock, 
  Layers,
  Search,
  Trash2,
  Edit2,
  X,
  Upload,
  MoreVertical
} from 'lucide-react';
import { useStore } from '../store/index';
import { SettingsDrawer } from '../components/SettingsDrawer';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { AboutModal } from '../components/AboutModal';
import { MainSidebar } from '../components/MainSidebar';
import type { Project } from '../types/store.types';

const Dashboard = () => {
  const navigate = useNavigate();
  const savedProjects = useStore((state) => state.savedProjects);
  const setIsAboutModalOpen = useStore((state) => state.setIsAboutModalOpen);
  const isAboutModalOpen = useStore((state) => state.isAboutModalOpen);
  
  const fetchProjects = useStore((state) => state.fetchProjects);
  const fetchCredentials = useStore((state) => state.fetchCredentials);
  const fetchWorkspaces = useStore((state) => state.fetchWorkspaces);
  const deleteProject = useStore((state) => state.deleteProject);
  const updateProjectMetadata = useStore((state) => state.updateProjectMetadata);

  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [projectToDelete, setProjectToDelete] = React.useState<{id: string, name: string} | null>(null);
  const [editingProject, setEditingProject] = React.useState<{id: string, name: string, description: string} | null>(null);
  const [newProject, setNewProject] = React.useState({ name: '', description: '', framework: 'crewai' });

  const createNewProject = useStore((state) => state.createNewProject);
  const importProjectJsonAndSave = useStore((state) => state.importProjectJsonAndSave);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProjects();
    fetchCredentials();
    fetchWorkspaces();
  }, [fetchProjects, fetchCredentials, fetchWorkspaces]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleNewWorkflow = () => {
    setNewProject({ name: '', description: '', framework: 'crewai' });
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreate = async () => {
    if (!newProject.name.trim()) {
      useStore.getState().showNotification("Please enter a name for the workflow.", "warning");
      return;
    }
    const created = await createNewProject(newProject.name, newProject.description, newProject.framework);
    if (created) {
      setIsCreateModalOpen(false);
      navigate(`/workflow/${created.id}`);
    }
  };

  const handleImportJson = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const imported = await importProjectJsonAndSave(json);
        if (imported) {
          navigate(`/workflow/${imported.id}`);
        }
      } catch {
        useStore.getState().showNotification("Failed to parse JSON file.", "error");
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const handleEditWorkflow = (id: string) => {
    navigate(`/workflow/${id}`);
  };

  const handleOpenRename = (project: Project) => {
    setEditingProject({
      id: project.id,
      name: project.name,
      description: project.description || ''
    });
    setIsEditModalOpen(true);
    setOpenMenuId(null);
  };

  const handleSaveMetadata = async () => {
    if (editingProject) {
      await updateProjectMetadata(editingProject.id, editingProject.name, editingProject.description);
      setIsEditModalOpen(false);
      setEditingProject(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="flex h-screen bg-brand-bg font-sans transition-colors duration-300">
      <MainSidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-brand-card border-b border-brand-border flex items-center justify-between px-10 transition-colors duration-300">
          <div>
            <h1 className="text-2xl font-bold text-brand-text">My Workflows</h1>
            <p className="text-brand-muted text-sm mt-0.5">Manage and automate your AI agents</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search workflows..."
                className="pl-10 pr-4 py-2 bg-brand-bg border-transparent focus:border-indigo-500 focus:bg-brand-card rounded-xl text-sm transition-all outline-none w-64 text-brand-text"
              />
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileChange}
              accept=".json"
              className="hidden"
            />
            
            <button 
              onClick={handleImportJson}
              className="bg-brand-card border border-brand-border text-brand-text px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-brand-bg transition-all hover:-translate-y-0.5"
            >
              <Upload className="w-4 h-4" />
              Import JSON
            </button>

            <button 
              onClick={handleNewWorkflow}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="w-5 h-5" />
              Add Workflow
            </button>
          </div>
        </header>

        {/* Workflows Grid */}
        <div className="flex-1 overflow-y-auto p-10">
          {savedProjects.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
              <div className="w-20 h-20 bg-brand-card border border-brand-border rounded-full flex items-center justify-center mb-6">
                <Workflow className="w-10 h-10 text-brand-muted" />
              </div>
              <h3 className="text-xl font-semibold text-brand-text">No workflows found</h3>
              <p className="text-brand-muted mt-2 max-w-xs">Start building your first autonomous agent crew by clicking on "Add Workflow".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {savedProjects.map((project: Project) => (
                <div 
                  key={project.id}
                  onClick={() => handleEditWorkflow(project.id)}
                  data-testid="project-card"
                  className="group bg-brand-card border border-brand-border p-6 rounded-2xl hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500 dark:hover:border-indigo-500/50 transition-all cursor-pointer relative overflow-hidden flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center transition-colors group-hover:bg-indigo-600">
                      <Workflow className="w-6 h-6 text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors" />
                    </div>
                  </div>

                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-brand-text truncate pr-2">{project.name}</h3>
                    <span className="shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 border border-indigo-100 dark:border-indigo-800/50">
                      {project.framework === 'langgraph' ? 'LangGraph' : 'CrewAI'}
                    </span>
                  </div>
                  <p className="text-brand-muted text-sm line-clamp-2 mb-6 flex-grow">{project.description || "Sem descrição disponível."}</p>

                  <div className="flex items-center justify-between pt-4 border-t border-brand-border">
                    <div className="flex items-center gap-1.5 text-brand-muted text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDate(project.updated_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-brand-muted text-xs">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{project.canvas_data?.nodes.length || 0} nodes</span>
                    </div>
                  </div>

                  {/* Actions Dropdown */}
                  <div className="absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === project.id ? null : project.id);
                      }}
                      className="p-2 text-brand-muted hover:text-brand-text hover:bg-brand-bg rounded-lg transition-colors border border-transparent hover:border-brand-border"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {openMenuId === project.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-brand-card border border-brand-border rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in duration-100">
                        <button 
                          onClick={() => handleOpenRename(project)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors text-left"
                        >
                          <Edit2 className="w-4 h-4" />
                          Rename
                        </button>
                        <button 
                          onClick={() => {
                            useStore.getState().duplicateProject(project.id);
                            setOpenMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors text-left"
                        >
                          <Layers className="w-4 h-4" />
                          Duplicate
                        </button>
                        <div className="border-t border-brand-border my-1" />
                        <button 
                          onClick={() => {
                            setProjectToDelete({ id: project.id, name: project.name });
                            setIsDeleteModalOpen(true);
                            setOpenMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <SettingsDrawer />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setProjectToDelete(null);
        }}
        onConfirm={() => {
          if (projectToDelete) {
            deleteProject(projectToDelete.id);
            useStore.getState().showNotification(`Workflow "${projectToDelete.name}" deleted.`, "info");
          }
        }}
        title="Delete Workflow"
        message={`Are you sure you want to delete "${projectToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Workflow"
        variant="danger"
        icon={<Trash2 className="w-6 h-6" />}
      />

      {/* Rename Modal */}
      {isEditModalOpen && editingProject && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" onClick={() => setIsEditModalOpen(false)} />
          <div className="bg-brand-card w-full max-w-md rounded-2xl border border-brand-border shadow-2xl relative z-10 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-brand-text">Edit Workflow Details</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-brand-bg rounded-lg text-brand-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brand-text mb-1.5">Name</label>
                <input 
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-xl focus:border-indigo-500 outline-none text-brand-text transition-all"
                  placeholder="Workflow name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brand-text mb-1.5">Description</label>
                <textarea 
                  value={editingProject.description}
                  onChange={(e) => setEditingProject({...editingProject, description: e.target.value})}
                  className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-xl focus:border-indigo-500 outline-none text-brand-text transition-all min-h-[100px] resize-none"
                  placeholder="What does this workflow do?"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-brand-border flex justify-end gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-brand-muted hover:text-brand-text transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveMetadata}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" onClick={() => setIsCreateModalOpen(false)} />
          <div 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="modal-title"
            className="bg-brand-card w-full max-w-md rounded-2xl border border-brand-border shadow-2xl relative z-10 animate-in fade-in zoom-in duration-200"
          >
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
              <h2 id="modal-title" className="text-lg font-bold text-brand-text">Create New Workflow</h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)} 
                aria-label="Close modal"
                className="p-2 hover:bg-brand-bg rounded-lg text-brand-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="workflowName" className="block text-sm font-semibold text-brand-text mb-1.5">Name</label>
                <input 
                  id="workflowName"
                  type="text"
                  autoFocus
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-xl focus:border-indigo-500 outline-none text-brand-text transition-all"
                  placeholder="Marketing Strategy, Research Lab..."
                />
              </div>
              <div>
                <label htmlFor="workflowFramework" className="block text-sm font-semibold text-brand-text mb-1.5">Framework</label>
                <div className="relative">
                  <select 
                    id="workflowFramework"
                    value={newProject.framework}
                    onChange={(e) => setNewProject({...newProject, framework: e.target.value})}
                    className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-xl focus:border-indigo-500 outline-none text-brand-text transition-all appearance-none font-medium cursor-pointer"
                  >
                    <option value="crewai">🤖 CrewAI (Multi-Agent Systems)</option>
                    <option value="langgraph" disabled>⚡ LangGraph (Stateful Graphs) - Coming Soon</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-brand-muted">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="workflowDescription" className="block text-sm font-semibold text-brand-text mb-1.5">Description (Optional)</label>
                <textarea 
                  id="workflowDescription"
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-xl focus:border-indigo-500 outline-none text-brand-text transition-all min-h-[100px] resize-none"
                  placeholder="Briefly describe what this workflow will do..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-brand-border flex justify-end gap-3">
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-brand-muted hover:text-brand-text transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmCreate}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                Create Workflow
              </button>
            </div>
          </div>
        </div>
      )}
      <AboutModal 
        isOpen={isAboutModalOpen} 
        onClose={() => setIsAboutModalOpen(false)} 
      />
    </div>
  );
};

export default Dashboard;

