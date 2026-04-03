import type { StateCreator } from 'zustand';
import toast from 'react-hot-toast';
import type { AppState, WorkspaceSlice } from '../../types/store.types';

const API_URL = import.meta.env.VITE_API_URL || '';

export const createWorkspaceSlice: StateCreator<AppState, [], [], WorkspaceSlice> = (set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  isExplorerOpen: false,
  currentExplorerWsId: null,

  fetchWorkspaces: async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/workspaces`);
      if (!response.ok) throw new Error('Failed to fetch workspaces');
      const workspaces = await response.json();
      set({ workspaces });

      // Sync project workspace name if project is already loaded
      const { currentProjectWorkspaceId } = get();
      if (currentProjectWorkspaceId) {
        const ws = workspaces.find((w: any) => w.id === currentProjectWorkspaceId);
        if (ws) set({ currentProjectWorkspaceName: ws.name });
      }
    } catch (error) { console.error("Fetch workspaces error:", error); }
  },

  addWorkspace: async (workspace) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/workspaces`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(workspace),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to create workspace');
      }
      toast.success("Workspace created successfully");
      await get().fetchWorkspaces();
    } catch (error: any) { toast.error(error.message); }
  },

  updateWorkspace: async (id, workspace) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/workspaces/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(workspace),
      });
      if (!response.ok) throw new Error('Failed to update workspace');
      toast.success("Workspace updated successfully");
      await get().fetchWorkspaces();
    } catch (error: any) { toast.error(error.message); }
  },

  deleteWorkspace: async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/workspaces/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to delete workspace');
      }
      const { activeWorkspaceId, currentProjectWorkspaceId, fetchWorkspaces, fetchSettings } = get();
      if (activeWorkspaceId === id) { set({ activeWorkspaceId: null }); await fetchSettings(); }
      if (currentProjectWorkspaceId === id) { set({ currentProjectWorkspaceId: null }); }
      toast.success("Workspace deleted successfully");
      await fetchWorkspaces();
    } catch (error: any) { toast.error(error.message); }
  },

  openWorkspace: async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/workspaces/${id}/open`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to open workspace');
      toast.success("Opening workspace folder...");
    } catch (error: any) { toast.error(error.message); }
  },

  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id, currentExplorerWsId: null }),
  setIsExplorerOpen: (open) => set({ isExplorerOpen: open }),
  setCurrentExplorerWsId: (id) => set({ currentExplorerWsId: id }),

  fetchWorkspaceFiles: async (wsId) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/workspaces/${wsId}/files`);
      if (!response.ok) throw new Error('Failed to fetch workspace files');
      return await response.json();
    } catch (error: any) {
      toast.error(error.message);
      return [];
    }
  },

  fetchFileContent: async (wsId, path) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/workspaces/${wsId}/files/content?path=${encodeURIComponent(path)}`);
      if (!response.ok) throw new Error('Failed to fetch file content');
      const data = await response.json();
      return data.content;
    } catch (error: any) {
      toast.error(error.message);
      return '';
    }
  },

  uploadWorkspaceFiles: async (wsId, files) => {
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
        const path = (file as any).webkitRelativePath || file.name;
        formData.append('paths', path);
      });
      const response = await fetch(`${API_URL}/api/v1/workspaces/${wsId}/upload`, { method: 'POST', body: formData });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to upload files');
      }
      toast.success('Upload complete!');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  },

  deleteWorkspaceFile: async (wsId, path) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/workspaces/${wsId}/files?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to delete file');
      }
      toast.success('Deleted successfully');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  },

  downloadWorkspaceZip: async (wsId, path = "") => {
    try {
      const url = `${API_URL}/api/v1/workspaces/${wsId}/download-zip?path=${encodeURIComponent(path)}`;
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Starting zip download... 📦");
    } catch (error: any) {
      console.error("Error downloading zip:", error);
      toast.error("Failed to download ZIP.");
    }
  },
});
