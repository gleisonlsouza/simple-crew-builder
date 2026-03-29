import type { StateCreator } from 'zustand';
import toast from 'react-hot-toast';
import type { NodeStatus, AppState, ProjectSlice } from '../../types/store.types';
import type { AppNode } from '../../types/nodes.types';
import { migrateEdges, migrateNodes, validateDependencies } from '../helpers';
import { INITIAL_CHAT_MESSAGES } from './graph.slice';

const API_URL = import.meta.env.VITE_API_URL || '';

export const createProjectSlice: StateCreator<AppState, [], [], ProjectSlice> = (set, get) => ({
  savedProjects: [],
  currentProjectId: null,
  currentProjectName: null,
  currentProjectDescription: null,
  currentProjectWorkspaceId: null,
  currentProjectWorkspaceName: null,
  isSaving: false,
  isExecuting: false,
  isDirty: false,
  abortController: null,

  setDirty: (dirty) => set({ isDirty: dirty }),

  hydrateFromSnapshot: (projectId, snapshot) => {
    // Determine the active workspace locally if it exists
    const localWorkspace = snapshot.workspaceId 
      ? get().workspaces?.find(w => w.id === snapshot.workspaceId) 
      : null;
    const activeWorkspaceId = localWorkspace ? localWorkspace.id : null;

    console.log("Hydrating with:", snapshot.nodes?.length || 0, "nodes");

    const migratedNodes = migrateNodes(snapshot.nodes || []);
    
    set({
      currentProjectId: projectId,
      currentProjectWorkspaceId: activeWorkspaceId,
      currentProjectWorkspaceName: localWorkspace?.name || null,
      activeWorkspaceId: activeWorkspaceId,
      nodes: migratedNodes,
      edges: migrateEdges(snapshot.edges || []),
      isDirty: true,
      messages: INITIAL_CHAT_MESSAGES, // Clear chat
      executionResult: null,
      nodeStatuses: {},
      nodeErrors: {},
      nodeWarnings: {},
      activeNodeId: null
    });
  },

  fetchProjects: async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/projects`);
      if (!response.ok) throw new Error('Failed to fetch projects');
      const projects = await response.json();
      set({ savedProjects: projects });
    } catch (error: any) {
      console.error(error);
    }
  },

  saveProject: async (nameByArg, description) => {
    const state = get();
    if (!state.validateGraph()) {
      toast.error("Please fix the errors before saving.");
      return;
    }

    const isUpdate = !!state.currentProjectId;
    set({ isSaving: true });
    try {
      const payload = {
        name: nameByArg,
        description: description || "",
        workspace_id: state.currentProjectWorkspaceId,
        canvas_data: {
          nodes: state.nodes,
          edges: state.edges,
          customTools: state.customTools,
          globalTools: state.globalTools,
          version: "1.0"
        }
      };

      let response;
      if (isUpdate) {
        response = await fetch(`${API_URL}/api/v1/projects/${state.currentProjectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${API_URL}/api/v1/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) throw new Error('Failed to save project');
      const saved = await response.json();

      set({ 
        currentProjectId: saved.id,
        currentProjectName: saved.name,
        currentProjectDescription: saved.description,
        currentProjectWorkspaceId: saved.workspace_id || null,
        isDirty: false // Reset dirty flag after successful save
      });
      await state.fetchProjects();
      toast.success(isUpdate ? "Project updated!" : "Project created successfully!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      set({ isSaving: false });
    }
  },

  updateProjectMetadata: async (id, name, description) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) throw new Error('Failed to update project metadata');

      toast.success("Project updated successfully");
      set({ currentProjectName: name, currentProjectDescription: description });
      await get().fetchProjects();
    } catch (error: any) {
      console.error("Update project metadata error:", error);
      toast.error("Error updating project");
    }
  },

  loadProject: async (projectId) => {
    if (projectId === get().currentProjectId) return;
    try {
      await Promise.all([
        get().fetchModels(),
        get().fetchMCPServers(),
        get().fetchCustomTools(),
        get().fetchCredentials(),
        get().fetchWorkspaces(),
        get().fetchSettings()
      ]);

      const response = await fetch(`${API_URL}/api/v1/projects/${projectId}`);
      if (!response.ok) throw new Error('Falha ao carregar projeto');
      const project = await response.json();

      const canvas_data = project.canvas_data;

      const globalMcp = get().mcpServers;
      const projectMcp = canvas_data.mcpServers || [];
      const mergedMcp = [...globalMcp];
      projectMcp.forEach((p: any) => {
        if (!mergedMcp.some((m: any) => m.id === p.id)) mergedMcp.push(p);
      });

      const globalTools = get().customTools;
      const projectTools = canvas_data.customTools || [];
      const mergedTools = [...globalTools];
      projectTools.forEach((p: any) => {
        if (!mergedTools.some(m => m.id === p.id)) mergedTools.push(p);
      });

      const migratedNodes = migrateNodes(canvas_data.nodes || []);
      const workspace = get().workspaces?.find(w => w.id === project.workspace_id);
      const { warnings } = validateDependencies(
        migratedNodes, 
        get().models, 
        get().globalTools, 
        get().customTools, 
        get().mcpServers,
        project.workspace_id || null
      );

      set({
        nodes: migratedNodes,
        edges: migrateEdges(canvas_data.edges || []),
        customTools: mergedTools,
        mcpServers: mergedMcp,
        currentProjectId: project.id,
        currentProjectName: project.name,
        currentProjectDescription: project.description || '',
        currentProjectWorkspaceId: project.workspace_id || null,
        currentProjectWorkspaceName: workspace?.name || null,
        activeWorkspaceId: project.workspace_id || null,
        nodeStatuses: {},
        nodeErrors: {},
        nodeWarnings: warnings,
        executionResult: null,
        messages: INITIAL_CHAT_MESSAGES,
        isConsoleOpen: false,
        isConsoleExpanded: false,
        isChatVisible: false
      });
      toast.success(`Project "${project.name}" loaded!`);
    } catch (error: any) {
      toast.error(error.message);
    }
  },

  deleteProject: async (projectId) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/projects/${projectId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete project');

      if (get().currentProjectId === projectId) {
        get().resetProject();
      }

      await get().fetchProjects();
      toast.success("Projeto removido.");
    } catch (error: any) {
      toast.error(error.message);
    }
  },

  createNewProject: async (name, description) => {
    const payload = {
      name,
      description,
      canvas_data: {
        nodes: [],
        edges: [],
        version: "1.0"
      }
    };

    try {
      const response = await fetch(`${API_URL}/api/v1/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to create project');
      const saved = await response.json();

      set((state: AppState) => ({
        savedProjects: [...state.savedProjects, saved],
        currentProjectId: saved.id,
        currentProjectName: saved.name,
        currentProjectDescription: saved.description,
        currentProjectWorkspaceId: saved.workspace_id || null,
        nodes: saved.canvas_data.nodes,
        edges: saved.canvas_data.edges,
      }));

      return saved;
    } catch (error: any) {
      toast.error(error.message);
      return null;
    }
  },

  duplicateProject: async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/projects/${id}`);
      if (!response.ok) throw new Error('Failed to fetch project for duplication');
      const project = await response.json();
      const duplicatedProject = {
        name: `${project.name} (Copy)`,
        description: project.description,
        canvas_data: project.canvas_data
      };
      const saveResponse = await fetch(`${API_URL}/api/v1/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatedProject),
      });
      if (!saveResponse.ok) throw new Error('Failed to save duplicated project');
      toast.success("Project duplicated successfully");
      await get().fetchProjects();
    } catch (error: any) {
      console.error("Duplicate project error:", error);
      toast.error("Error duplicating project");
    }
  },

  exportProjectJson: () => {
    const state = get();
    if (!state.validateGraph()) {
      state.showNotification("Cannot export. Please fix the highlighted errors first.", "error");
      return;
    }
    const nodes = state.nodes;
    
    // Slim Export: Filter only used tools/servers
    const usedGlobalToolIds = new Set<string>();
    const usedCustomToolIds = new Set<string>();
    const usedMcpServerIds = new Set<string>();

    nodes.forEach((node: any) => {
      const data = node.data;
      if (data.globalToolIds) {
        data.globalToolIds.forEach((gt: any) => usedGlobalToolIds.add(typeof gt === 'string' ? gt : gt.id));
      }
      if (data.customToolIds) {
        data.customToolIds.forEach((id: string) => usedCustomToolIds.add(id));
      }
      if (data.mcpServerIds) {
        data.mcpServerIds.forEach((id: string) => usedMcpServerIds.add(id));
      }
    });

    const payload = {
      version: "1.0",
      nodes: state.nodes,
      edges: state.edges,
      globalTools: state.globalTools.filter(gt => usedGlobalToolIds.has(gt.id)),
      customTools: state.customTools.filter(ct => usedCustomToolIds.has(ct.id)),
      mcpServers: state.mcpServers.filter(ms => usedMcpServerIds.has(ms.id)),
      name: state.currentProjectName,
      description: state.currentProjectDescription,
      workspaceId: state.currentProjectWorkspaceId,
      workspaceName: state.currentProjectWorkspaceName
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = state.currentProjectName 
      ? `${state.currentProjectName.toLowerCase().replace(/ /g, '_')}-config.json` 
      : 'simple-crew-config.json';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    state.showNotification("Project exported successfully!", "success");
  },

  exportPythonProject: async () => {
    const state = get();
    if (!state.currentProjectId) {
      toast.error("Please save the project before exporting to Python.");
      return;
    }
    if (!state.validateGraph()) {
      state.showNotification("Cannot export. Please fix the highlighted errors first.", "error");
      return;
    }
    try {
      state.showNotification("Preparing Python project... ⏳", "info");
      const response = await fetch(`${API_URL}/api/v1/projects/${state.currentProjectId}/export-python`);
      
      if (!response.ok) {
        let errorMsg = "Failed to generate Python project";
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (e) {
          // If response is not JSON, try text
          try {
            const textData = await response.text();
            if (textData) errorMsg = textData;
          } catch (e2) {}
        }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const project = state.savedProjects.find(p => p.id === state.currentProjectId);
      const filename = project ? `${project.name.toLowerCase().replace(/ /g, '_')}_crew.zip` : 'simple-crew-python.zip';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      state.showNotification("Python project downloaded! 🚀", "success");
    } catch (error: any) {
      console.error("Export Error:", error);
      state.showNotification(`Export failed: ${error.message}`, "error");
    }
  },

  loadProjectJson: (data) => {
    try {
      if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error("Invalid format");
      const globalMcp = get().mcpServers;
      const projectMcp = data.mcpServers || [];
      const mergedMcp = [...globalMcp];
      projectMcp.forEach((p: any) => {
        if (!mergedMcp.some(m => m.id === p.id)) mergedMcp.push(p);
      });
      const globalTools = get().customTools;
      const projectTools = data.customTools || [];
      const mergedTools = [...globalTools];
      projectTools.forEach((p: any) => {
        if (!mergedTools.some(m => m.id === p.id)) mergedTools.push(p);
      });
      const migratedNodes = migrateNodes(data.nodes || []);
      
      // Try to find if workspace exists locally
      const localWorkspace = get().workspaces?.find(w => w.id === data.workspaceId);
      const activeWorkspaceId = localWorkspace ? localWorkspace.id : null;

      const { warnings } = validateDependencies(
        migratedNodes, 
        get().models, 
        get().globalTools, 
        get().customTools, 
        get().mcpServers,
        activeWorkspaceId,
        data.workspaceName
      );

      if (data.workspaceId && !localWorkspace) {
        toast.error(`Workspace '${data.workspaceName || data.workspaceId}' not found locally. Please select one.`, { duration: 5000 });
      }

      set({
        nodes: migratedNodes,
        edges: migrateEdges(data.edges || []),
        customTools: mergedTools,
        mcpServers: mergedMcp,
        currentProjectName: data.name || null,
        currentProjectDescription: data.description || null,
        currentProjectWorkspaceId: activeWorkspaceId,
        currentProjectWorkspaceName: localWorkspace?.name || null,
        activeWorkspaceId: activeWorkspaceId,
        isExecuting: false,
        activeNodeId: null,
        currentProjectId: null,
        nodeStatuses: {},
        nodeErrors: {},
        nodeWarnings: warnings
      });
      get().showNotification("Project uploaded successfully!", "success");
      return true;
    } catch (err) {
      get().showNotification("Failed to import: Invalid file.", "error");
      return false;
    }
  },

  importProjectJsonAndSave: async (data) => {
    try {
      if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error("Invalid format");
      const payload = {
        name: data.name || "Imported Workflow",
        description: data.description || "",
        workspace_id: data.workspaceId || null,
        canvas_data: {
          nodes: migrateNodes(data.nodes || []),
          edges: migrateEdges(data.edges || []),
          customTools: data.customTools || [],
          mcpServers: data.mcpServers || [],
          version: data.version || "1.0"
        }
      };
      const response = await fetch(`${API_URL}/api/v1/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to create project from JSON');
      const saved = await response.json();
      
      const localWorkspace = get().workspaces?.find(w => w.id === data.workspaceId);
      const activeWorkspaceId = localWorkspace ? localWorkspace.id : null;

      set((state) => ({ 
        savedProjects: [...state.savedProjects, saved],
        activeWorkspaceId: activeWorkspaceId,
        currentProjectWorkspaceId: activeWorkspaceId,
        currentProjectWorkspaceName: localWorkspace?.name || null
      }));
      toast.success("Workflow imported successfully!");
      return saved;
    } catch (error: any) {
      toast.error(error.message);
      return null;
    }
  },

  startRealExecution: async () => {
    const state = get();
    const initialStatuses: Record<string, NodeStatus> = {};
    state.nodes.forEach((node: AppNode) => {
      if (node.type === 'agent' || node.type === 'task') initialStatuses[node.id] = 'waiting';
    });
    const controller = new AbortController();
    set({ 
      isExecuting: true, 
      abortController: controller,
      nodeStatuses: initialStatuses, 
      executionResult: null,
      isConsoleOpen: true,
      isConsoleExpanded: false
    });
    const payload = {
      version: "1.0",
      nodes: state.nodes,
      edges: state.edges,
      globalTools: state.globalTools,
      customTools: state.customTools
    };

    let capturedResult: string | null = null;

    try {
      const crewNode = state.nodes.find(n => n.type === 'crew');
      if (crewNode) state.setNodeStatus(crewNode.id, 'running');
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (state.currentProjectId) headers["X-Project-Id"] = state.currentProjectId;
      const response = await fetch(`${API_URL}/api/v1/run-crew`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      if (!response.ok) {
        let errorMsg = "Erro inesperado do Backend";
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (e) { }
        throw new Error(errorMsg);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Stream API não suportado pelo Browser");
      const decoder = new TextDecoder("utf-8");
      let hasError = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          if (get().isExecuting && !hasError) {
            const newStatuses: Record<string, NodeStatus> = { ...get().nodeStatuses };
            state.nodes.forEach(n => { if (newStatuses[n.id] === 'running') newStatuses[n.id] = 'success'; });
            set({ nodeStatuses: newStatuses, isExecuting: false });
          } else {
            set({ isExecuting: false });
          }
          break;
        }
        const chunkText = decoder.decode(value, { stream: true });
        const lines = chunkText.split("\n").filter(line => line.trim().length > 0);
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            if (event.type === 'heartbeat') continue; 
            else if (event.type === 'status') get().setNodeStatus(event.nodeId, event.status);
            else if (event.type === 'task_completed') get().setNodeStatus(event.task_id, 'success');
            else if (event.type === 'log') {
              const stripAnsi = (str: string) => str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
              const cleanLog = stripAnsi(event.data);
              const currentLog = get().executionResult || "";
              set({ executionResult: currentLog + cleanLog });
            } else if (event.type === 'final_result') {
              if (!hasError) {
                // Extract result from multiple possible fields
                const result = event.result || event.final_output || event.output;
                capturedResult = result;
                
                const newStatuses: Record<string, NodeStatus> = { ...get().nodeStatuses };
                state.nodes.forEach(n => { if (newStatuses[n.id] === 'running') newStatuses[n.id] = 'success'; });
                set({ nodeStatuses: newStatuses, isConsoleExpanded: true, executionResult: result });
                get().showNotification("Pipeline de Agentes concluído!", "success");
              }
            } else if (event.type === 'done') {
              if (!hasError) {
                const newStatuses: Record<string, NodeStatus> = { ...get().nodeStatuses };
                state.nodes.forEach(n => { if (newStatuses[n.id] === 'running') newStatuses[n.id] = 'success'; });
                set({ nodeStatuses: newStatuses, isExecuting: false });
              } else {
                set({ isExecuting: false });
              }
            } else if (event.type === 'error') {
              hasError = true;
              const newStatuses: Record<string, NodeStatus> = { ...get().nodeStatuses };
              state.nodes.forEach(n => { if (newStatuses[n.id] === 'running') newStatuses[n.id] = 'error'; });
              set({ nodeStatuses: newStatuses, isExecuting: false });
              throw new Error(event.error);
            }
          } catch (e: any) {
            if (e.message && hasError) throw e;
            // Case where it is not valid JSON or unknown format, log it for troubleshooting
            console.warn("Payload capture failed or invalid JSON:", line);
            console.dir(line);
          }
        }
      }
      return capturedResult;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        get().showNotification("Pipeline de Agentes interrompido pelo usuário.", "warning");
      } else {
        console.error(err);
        state.showNotification(`Falha na API Inteligente: ${err.message}`, "error");
      }
      return null;
    } finally {
      set({ isExecuting: false, abortController: null });
    }
  },

  stopExecution: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set({ isExecuting: false, abortController: null });
  },

  updateProjectWorkspaceId: (workspaceId: string | null) => {
    const workspace = get().workspaces?.find(w => w.id === workspaceId);
    set({ 
      currentProjectWorkspaceId: workspaceId,
      currentProjectWorkspaceName: workspace?.name || null
    });
    // Re-validate to clear workspace warnings
    const { nodes, models, globalTools, customTools, mcpServers } = get();
    const { warnings } = validateDependencies(nodes, models, globalTools, customTools, mcpServers, workspaceId);
    set({ nodeWarnings: warnings });
  },
});
