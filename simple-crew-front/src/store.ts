import { create } from 'zustand';
import toast from 'react-hot-toast';
import {
  type Connection,
  type EdgeChange,
  type NodeChange,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import type { AppState, AppNode, AppEdge, NodeStatus, ModelConfig } from './types';

// Initial example nodes to show on the canvas
const initialNodes: AppNode[] = [
  {
    id: 'crew-1',
    type: 'crew',
    position: { x: 50, y: 50 },
    data: { process: 'sequential', isCollapsed: false },
  },
  {
    id: 'agent-1',
    type: 'agent',
    position: { x: 50, y: 200 },
    data: {
      name: 'Senior Writer',
      role: 'Senior Writer',
      goal: 'Write compelling copy',
      backstory: 'Expert in persuasive writing.',
      isCollapsed: false,
    },
  },
  {
    id: 'task-1',
    type: 'task',
    position: { x: 450, y: 200 },
    data: {
      name: 'SEO Writing Task',
      description: 'Escrever descrições persuasivas para os produtos da Glaad Store',
      expected_output: '3 parágrafos de texto otimizado para SEO'
    },
  }
];

const migrateEdges = (edges: any[]): AppEdge[] => {
  return edges.map(edge => ({
    ...edge,
    // Add type if missing
    type: edge.type || 'deletable',
    // Migrate source handle: 'right' -> 'right-source'
    sourceHandle: edge.sourceHandle 
      ? (edge.sourceHandle.includes('-source') ? edge.sourceHandle : `${edge.sourceHandle}-source`)
      : 'right-source',
    // Migrate target handle: 'left' -> 'left-target'
    targetHandle: edge.targetHandle
      ? (edge.targetHandle.includes('-target') ? edge.targetHandle : `${edge.targetHandle}-target`)
      : 'left-target'
  }));
};

const initialEdges: AppEdge[] = migrateEdges([
  { id: 'e1-2', source: 'agent-1', target: 'task-1' }
]);

// Retorna TODOS os descendentes recursivamente (para colapsar)
function getDescendantsToHide(nodeId: string, edges: AppEdge[]): string[] {
  const descendants: string[] = [];
  const queue = [nodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const children = edges
      .filter((edge) => edge.source === currentId)
      .map((edge) => edge.target);

    for (const childId of children) {
      if (!visited.has(childId)) {
        descendants.push(childId);
        queue.push(childId);
      }
    }
  }
  return descendants;
}

// Retorna descendentes condicionalmente (para expandir)
function getDescendantsToShow(nodeId: string, nodes: AppNode[], edges: AppEdge[]): string[] {
  const descendants: string[] = [];
  const queue = [nodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Encontra filhos diretos
    const childrenIds = edges
      .filter((edge) => edge.source === currentId)
      .map((edge) => edge.target);

    for (const childId of childrenIds) {
      if (!visited.has(childId)) {
        descendants.push(childId);

        // Verifica o estado isCollapsed deste filho
        const childNode = nodes.find(n => n.id === childId);
        const isChildCollapsed = (childNode?.data as any)?.isCollapsed ?? false;

        // Só continua a recursão se o filho NÃO estiver colapsado
        if (!isChildCollapsed) {
          queue.push(childId);
        }
      }
    }
  }
  return descendants;
}

export const useStore = create<AppState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  activeNodeId: null,
  isExecuting: false,
  isSaving: false,
  savedProjects: [],
  currentProjectId: null,
  nodeStatuses: {},
  nodeErrors: {},
  notification: null,
  executionResult: null,
  isConsoleOpen: false,
  isConsoleExpanded: false,
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  isSettingsOpen: false,
  credentials: [],
  models: JSON.parse(localStorage.getItem('models') || '[]'),
  defaultModel: localStorage.getItem('default_model') || 'gpt-4o',
  
  globalTools: JSON.parse(localStorage.getItem('global_tools') || JSON.stringify([
    { id: 'serper', name: 'Google Search (Serper)', description: 'Search the web for real-time information.', isEnabled: false, requiresKey: true },
    { id: 'scrape', name: 'Website Scraper', description: 'Extract clean content from any website URL.', isEnabled: false, requiresKey: false },
    { id: 'file_read', name: 'File System Reader', description: 'Read local files from the workspace.', isEnabled: true, requiresKey: false },
  ])),
  customTools: [],
  mcpServers: [], // Will be fetched from backend
  systemAiModelId: null,

  fetchSettings: async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const settings = await response.json();
      set({ systemAiModelId: settings.system_ai_model_id });
    } catch (error) {
      console.error(error);
    }
  },

  fetchMCPServers: async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/mcp-servers');
      if (!response.ok) throw new Error('Failed to fetch MCP servers');
      const servers = await response.json();
      // Map backend snake_case to frontend camelCase
      const mappedServers = servers.map((s: any) => ({
        id: s.id,
        name: s.name,
        transportType: s.transport_type,
        command: s.command,
        args: s.args,
        envVars: s.env_vars,
        url: s.url,
        headers: s.headers
      }));
      set({ mcpServers: mappedServers });
    } catch (error) {
      console.error(error);
    }
  },

  fetchCustomTools: async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/custom-tools');
      if (!response.ok) throw new Error('Failed to fetch custom tools');
      const tools = await response.json();
      set({ customTools: tools });
    } catch (error) {
      console.error(error);
    }
  },

  setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return { theme: newTheme };
    });
  },

  updateToolConfig: (id, config) => {
    set((state) => {
      const newTools = state.globalTools.map(t => t.id === id ? { ...t, ...config } : t);
      localStorage.setItem('global_tools', JSON.stringify(newTools));
      return { globalTools: newTools };
    });
  },

  addCustomTool: async (tool) => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/custom-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tool)
      });
      if (!response.ok) throw new Error('Failed to add custom tool');
      await get().fetchCustomTools();
      toast.success('Custom Tool added!');
    } catch (error: any) {
      toast.error(error.message);
    }
  },

  updateCustomTool: async (id, config) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/custom-tools/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error('Failed to update custom tool');
      await get().fetchCustomTools();
      toast.success('Custom Tool updated!');
    } catch (error: any) {
      toast.error(error.message);
    }
  },

  deleteCustomTool: async (id) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/custom-tools/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete custom tool');
      await get().fetchCustomTools();
      toast.success('Custom Tool removed.');
    } catch (error: any) {
      toast.error(error.message);
    }
  },

  addMCPServer: async (server) => {
    try {
      const payload = {
        name: server.name,
        transport_type: server.transportType,
        command: server.command,
        args: server.args,
        env_vars: server.envVars,
        url: server.url,
        headers: server.headers
      };
      const response = await fetch('http://localhost:8000/api/v1/mcp-servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to add MCP server');
      await get().fetchMCPServers();
      toast.success('MCP Server added!');
    } catch (error: any) {
      toast.error(error.message);
    }
  },


  updateMCPServer: async (id, config) => {
    try {
      const payload: any = {};
      if (config.name !== undefined) payload.name = config.name;
      if (config.transportType !== undefined) payload.transport_type = config.transportType;
      if (config.command !== undefined) payload.command = config.command;
      if (config.args !== undefined) payload.args = config.args;
      if (config.envVars !== undefined) payload.env_vars = config.envVars;
      if (config.url !== undefined) payload.url = config.url;
      if (config.headers !== undefined) payload.headers = config.headers;

      const response = await fetch(`http://localhost:8000/api/v1/mcp-servers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to update MCP server');
      await get().fetchMCPServers();
      toast.success('MCP Server updated!');
    } catch (error: any) {
      toast.error(error.message);
    }
  },

  deleteMCPServer: async (id) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/mcp-servers/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete MCP server');
      await get().fetchMCPServers();
      toast.success('MCP Server removed.');
    } catch (error: any) {
      toast.error(error.message);
    }
  },
  setExecutionResult: (result) => set({ executionResult: result }),
  showNotification: (message, type) => {
    set({ notification: { message, type, visible: true } });
    setTimeout(() => {
      set((state) => {
        if (state.notification?.message === message) {
          return { notification: null };
        }
        return state;
      });
    }, 4500);
  },
  clearNotification: () => set({ notification: null }),
  exportProjectJson: () => {
    const state = get();
    if (!state.validateGraph()) {
      state.showNotification("Cannot export. Please fix the highlighted errors first.", "error");
      return;
    }

    const payload = {
      version: "1.0",
      nodes: state.nodes,
      edges: state.edges
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simple-crew-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    state.showNotification("Project exported successfully!", "success");
  },

  exportPythonProject: async () => {
    const state = get();
    if (!state.currentProjectId) {
      // Se não tem ID, salva primeiro para garantir que o backend tenha os dados
      toast.error("Please save the project before exporting to Python.");
      return;
    }

    if (!state.validateGraph()) {
      state.showNotification("Cannot export. Please fix the highlighted errors first.", "error");
      return;
    }

    try {
      state.showNotification("Preparing Python project... ⏳", "info");
      
      const response = await fetch(`http://localhost:8000/api/v1/projects/${state.currentProjectId}/export-python`);
      
      if (!response.ok) {
        throw new Error('Failed to generate Python project');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Tenta pegar o nome do projeto salvo
      const project = state.savedProjects.find(p => p.id === state.currentProjectId);
      const filename = project ? `${project.name.toLowerCase().replace(/ /g, '_')}_crew.zip` : 'simple-crew-python.zip';
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      state.showNotification("Python project downloaded! 🚀", "success");
    } catch (error: any) {
      console.error(error);
      state.showNotification(`Export failed: ${error.message}`, "error");
    }
  },

  loadProjectJson: (data) => {
    try {
      if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
        throw new Error("Invalid format");
      }

      set({
        nodes: data.nodes,
        edges: data.edges,
        isExecuting: false,
        activeNodeId: null,
        currentProjectId: null,
        nodeStatuses: {},
        nodeErrors: {}
      });

      get().showNotification("Project uploaded successfully!", "success");
      return true;
    } catch (err) {
      get().showNotification("Failed to import: Invalid file.", "error");
      return false;
    }
  },
  validateGraph: () => {
    const state = get();
    const errors: Record<string, string[]> = {};
    let isValid = true;

    for (const node of state.nodes) {
      const currentErrors: string[] = [];
      const data = node.data as any;

      if (node.type === 'crew') {
        const hasAgents = state.edges.some((e) => e.source === node.id);
        if (!hasAgents) currentErrors.push('Missing connected Agent');
      } else if (node.type === 'agent') {
        if (!data.name?.trim()) currentErrors.push('Missing Name');
        if (!data.role?.trim()) currentErrors.push('Missing Role');
        if (!data.goal?.trim()) currentErrors.push('Missing Goal');
        if (!data.backstory?.trim()) currentErrors.push('Missing Backstory');
        const hasTasks = state.edges.some((e) => e.source === node.id);
        if (!hasTasks) currentErrors.push('Missing connected Task');
      } else if (node.type === 'task') {
        if (!data.name?.trim()) currentErrors.push('Missing Name');
        if (!data.description?.trim()) currentErrors.push('Missing Description');
        if (!data.expected_output?.trim()) currentErrors.push('Missing Expected Output');
      }

      if (currentErrors.length > 0) {
        errors[node.id] = currentErrors;
        isValid = false;
      }
    }

    set({ nodeErrors: errors });
    return isValid;
  },
  onNodesChange: (changes: NodeChange<AppNode>[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  setNodeStatus: (id, status) => {
    set((state) => {
      const newStatuses = { ...state.nodeStatuses, [id]: status };
      const node = state.nodes.find(n => n.id === id);

      // Cascata Visual (Sprint 35): Se o nó for uma Task, sincroniza o Agente-Pai
      if (node?.type === 'task') {
        const edgeToTask = state.edges.find(e => e.target === id);
        if (edgeToTask) {
          const parentAgentId = edgeToTask.source;

          if (status === 'running') {
            newStatuses[parentAgentId] = 'running';
          }
          else if (status === 'success') {
            // Verifica se TODAS as tasks desse agente já concluíram antes de desligá-lo
            const allSiblingTasks = state.edges
              .filter(e => e.source === parentAgentId)
              .map(e => e.target);

            const allSuccess = allSiblingTasks.every(taskId =>
              taskId === id ? true : newStatuses[taskId] === 'success'
            );

            if (allSuccess) {
              newStatuses[parentAgentId] = 'success';
            }
          }
        }
      }

      return { nodeStatuses: newStatuses };
    });
  },
  setIsConsoleOpen: (isOpen) => set({ isConsoleOpen: isOpen }),
  setIsConsoleExpanded: (isExpanded) => set({ isConsoleExpanded: isExpanded }),

  startRealExecution: async () => {
    // Abre a gaveta de cara pra mostrar que começou e prepara o "Waiting"
    const state = get();
    const initialStatuses: Record<string, NodeStatus> = {};
    state.nodes.forEach(node => {
      if (node.type === 'agent' || node.type === 'task') {
        initialStatuses[node.id] = 'waiting';
      }
    });

    set({ 
      isExecuting: true, 
      nodeStatuses: initialStatuses, 
      executionResult: null,
      isConsoleOpen: true,
      isConsoleExpanded: false
    });


    const payload = {
      version: "1.0",
      nodes: state.nodes,
      edges: state.edges
    };

    try {
      // 1. Inicia visualmente os nós principais no frontend
      const crewNode = state.nodes.find(n => n.type === 'crew');
      if (crewNode) state.setNodeStatus(crewNode.id, 'running');

      // 2. Chama backend passando a malha inteira do Canvas
      const response = await fetch("http://localhost:8000/api/v1/run-crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorMsg = "Erro inesperado do Backend";
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (e) { }
        throw new Error(errorMsg);
      }

      // 3. Consumindo Streaming SSE Híbrido
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Stream API não suportado pelo Browser");

      const decoder = new TextDecoder("utf-8");
      let hasError = false;

      while (true) {
        const { value, done } = await reader.read();

        // 3.1 Sentry de Fim de Stream Abrupto/Resiliente
        if (done) {
          if (get().isExecuting && !hasError) {
            const newStatuses: Record<string, NodeStatus> = { ...get().nodeStatuses };
            state.nodes.forEach(n => {
              if (newStatuses[n.id] === 'running') newStatuses[n.id] = 'success';
            });
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

            if (event.type === 'heartbeat') {
              continue; 

            } else if (event.type === 'status') {
              get().setNodeStatus(event.nodeId, event.status);

            } else if (event.type === 'task_completed') {
              get().setNodeStatus(event.task_id, 'success');

            } else if (event.type === 'log') {
              const stripAnsi = (str: string) => str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
              const cleanLog = stripAnsi(event.data);
              const currentLog = get().executionResult || "";
              set({ executionResult: currentLog + cleanLog });

            } else if (event.type === 'final_result') {
              if (!hasError) {
                const newStatuses: Record<string, NodeStatus> = { ...get().nodeStatuses };
                state.nodes.forEach(n => {
                  if (newStatuses[n.id] === 'running') newStatuses[n.id] = 'success';
                });
                set({
                  nodeStatuses: newStatuses,
                  isConsoleExpanded: true,
                  executionResult: event.result 
                });
                get().showNotification("Pipeline de Agentes concluído!", "success");
              }

            } else if (event.type === 'done') {
              if (!hasError) {
                const newStatuses: Record<string, NodeStatus> = { ...get().nodeStatuses };
                state.nodes.forEach(n => {
                  if (newStatuses[n.id] === 'running') newStatuses[n.id] = 'success';
                });
                set({ nodeStatuses: newStatuses, isExecuting: false });
              } else {
                set({ isExecuting: false });
              }

            } else if (event.type === 'error') {
              hasError = true;
              const newStatuses: Record<string, NodeStatus> = { ...get().nodeStatuses };
              state.nodes.forEach(n => {
                if (newStatuses[n.id] === 'running') newStatuses[n.id] = 'error';
              });
              set({ nodeStatuses: newStatuses, isExecuting: false });
              throw new Error(event.error);
            }
          } catch (e: any) {
            if (e.message && hasError) throw e; // Repassa erros de negócio (event.error)
          }
        }
      }

    } catch (err: any) {
      console.error(err);
      set({ isExecuting: false });
      state.showNotification(`Falha na API Inteligente: ${err.message}`, "error");
    }
  },
  onConnect: (connection: Connection) => {
    set((state) => {
      if (!connection.source || !connection.target) return state;

      const sourceNode = state.nodes.find((n) => n.id === connection.source);
      const targetNode = state.nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return state;

      // -- CREWAI HIERARCHY VALIDATION RULES -- //
      const isCrewToAgent = sourceNode.type === 'crew' && targetNode.type === 'agent';
      const isAgentToTask = sourceNode.type === 'agent' && targetNode.type === 'task';

      if (!isCrewToAgent && !isAgentToTask) {
        // Block all illogical loops: task -> agent, agent -> crew, crew -> crew, etc.
        console.warn(`[CrewAI Rules] Invalid connection blocked: ${sourceNode.type} -> ${targetNode.type}`);
        return state;
      }

      // 1. Evitar conexões idênticas exatas
      const isDuplicate = state.edges.some(
        (edge) => edge.source === connection.source && edge.target === connection.target
      );
      if (isDuplicate) return state;

      // 2. Single Incoming Edge para Tasks e Agents (Sem cross-crew)
      let newEdges = [...state.edges];

      if (targetNode.type === 'task') {
        // Uma Task só pode ter 1 Agent "pai"
        newEdges = newEdges.filter((edge) => edge.target !== connection.target);
      }

      if (targetNode.type === 'agent') {
        // Um Agent só pode ter 1 Crew "pai" (Evita múltiplos crews usando o mesmo agent graph instance)
        newEdges = newEdges.filter((edge) => edge.target !== connection.target);
      }

      // 3. Forçar o Type Custom Global
      const newConnection = { ...connection, type: 'deletable' };

      return {
        edges: addEdge(newConnection, newEdges),
      };
    });
  },
  deleteEdge: (edgeId: string) => {
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId),
    }));
  },
  deleteNode: (nodeId: string) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      activeNodeId: state.activeNodeId === nodeId ? null : state.activeNodeId,
    }));
  },
  updateNodeData: (nodeId: string, data: Partial<any>) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } } as AppNode;
        }
        return node;
      }),
    });
  },
  setActiveNode: (id: string | null) => {
    set({ activeNodeId: id });
  },
  loadProject: async (projectId: string) => {
    if (projectId === get().currentProjectId) return;
    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${projectId}`);
      if (!response.ok) throw new Error('Falha ao carregar projeto');
      const project = await response.json();

      set({
        nodes: project.canvas_data.nodes,
        edges: migrateEdges(project.canvas_data.edges || []),
        currentProjectId: project.id,
        nodeStatuses: {},
        nodeErrors: {}
      });
      toast.success(`Project "${project.name}" loaded!`);
    } catch (error: any) {
      toast.error(error.message);
    }
  },

  fetchProjects: async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const projects = await response.json();
      set({ savedProjects: projects });
    } catch (error: any) {
      console.error(error);
    }
  },

  saveProject: async (nameByArg: string, description?: string) => {
    const state = get();
    if (!state.validateGraph()) {
      toast.error("Please fix the errors before saving.");
      return;
    }

    set({ isSaving: true });
    try {
      const payload = {
        name: nameByArg,
        description: description || "",
        canvas_data: {
          nodes: state.nodes,
          edges: state.edges,
          customTools: state.customTools,
          version: "1.0"
        }
      };

      let response;
      if (state.currentProjectId) {
        // PATCH
        response = await fetch(`http://localhost:8000/api/v1/projects/${state.currentProjectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // POST
        response = await fetch('http://localhost:8000/api/v1/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) throw new Error('Failed to save project');
      const saved = await response.json();

      set({ currentProjectId: saved.id });
      await state.fetchProjects();
      toast.success(state.currentProjectId ? "Project updated!" : "Project created successfully!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      set({ isSaving: false });
    }
  },

  deleteProject: async (projectId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${projectId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete project');

      if (get().currentProjectId === projectId) {
        set({ currentProjectId: null });
      }

      await get().fetchProjects();
      toast.success("Projeto removido.");
    } catch (error: any) {
      toast.error(error.message);
    }
  },
  addNode: (node: AppNode) => {
    set({
      nodes: [...get().nodes, node],
    });
  },
  addNodeWithAutoPosition: (type: 'agent' | 'task' | 'crew', data: any) => {
    const state = get();
    const existingNodes = state.nodes;
    
    // Grid configuration
    const startX = 600;
    const startY = 100;
    const spacingX = 350; // Increased spacing for cards (w-56 = 224px)
    const spacingY = 220; // Increased height spacing
    const nodesPerRow = 3;

    // We count all nodes to determine the grid position to avoid overlaps
    const gridIndex = existingNodes.length;
    
    const row = Math.floor(gridIndex / nodesPerRow);
    const col = gridIndex % nodesPerRow;

    const position = {
      x: startX + (col * spacingX),
      y: startY + (row * spacingY),
    };

    const newNode: AppNode = {
      id: `dndnode_${crypto.randomUUID()}`,
      type,
      position,
      data,
    } as AppNode;

    set({
      nodes: [...existingNodes, newNode],
    });
    
    state.validateGraph();
  },
  toggleCollapse: (nodeId: string) => {
    set((state) => {
      const node = state.nodes.find((n) => n.id === nodeId);
      if (!node) return {};

      const currentlyCollapsed = (node.data as any).isCollapsed ?? false;
      const willCollapse = !currentlyCollapsed; // Se era false, agora vai colapsar (true)

      let descendantIds: string[] = [];

      if (willCollapse) {
        // Vai colapsar (Esconder). Pega todos os filhos de todos os níveis.
        descendantIds = getDescendantsToHide(nodeId, state.edges);
      } else {
        // Vai expandir (Mostrar). Pega filhos, mas para se encontrar um filho que também tá colapsado.
        descendantIds = getDescendantsToShow(nodeId, state.nodes, state.edges);
      }

      const descendantSet = new Set(descendantIds);

      const updatedNodes = state.nodes.map((n) => {
        if (n.id === nodeId) {
          return { ...n, data: { ...n.data, isCollapsed: willCollapse } } as AppNode;
        }
        if (descendantSet.has(n.id)) {
          return { ...n, hidden: willCollapse } as AppNode;
        }
        return n;
      });

      const updatedEdges = state.edges.map((edge) => {
        // Se a aresta tem como source O ALVO ou como source algum descendente afetado
        const isAffectedEdge = edge.source === nodeId || descendantSet.has(edge.source) || descendantSet.has(edge.target);

        if (isAffectedEdge) {
          return { ...edge, hidden: willCollapse };
        }
        return edge;
      });

      return { nodes: updatedNodes, edges: updatedEdges };
    });
  },
  updateCrewAgentOrder: (crewId: string, newOrder: string[]) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === crewId && node.type === 'crew') {
          return {
            ...node,
            data: {
              ...node.data,
              agentOrder: newOrder,
            },
          } as AppNode;
        }
        return node;
      }),
    }));
  },
  updateAgentTaskOrder: (agentId: string, newOrder: string[]) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === agentId && node.type === 'agent') {
          return {
            ...node,
            data: {
              ...node.data,
              taskOrder: newOrder,
            },
          } as AppNode;
        }
        return node;
      }),
    }));
  },
  resetProject: () => {
    set({
      nodes: [],
      edges: [],
      currentProjectId: null,
      nodeStatuses: {},
      nodeErrors: {},
      executionResult: null
    });
  },

  duplicateProject: async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${id}`);
      if (!response.ok) throw new Error('Failed to fetch project for duplication');

      const project = await response.json();

      const duplicatedProject = {
        name: `${project.name} (Copy)`,
        description: project.description,
        canvas_data: project.canvas_data
      };

      const saveResponse = await fetch('http://localhost:8000/api/v1/projects', {
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
  createNewProject: async (name: string, description: string) => {
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
      const response = await fetch('http://localhost:8000/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to create project');
      const saved = await response.json();

      set((state) => ({
        savedProjects: [...state.savedProjects, saved],
        currentProjectId: saved.id,
        nodes: saved.canvas_data.nodes,
        edges: saved.canvas_data.edges,
      }));

      return saved;
    } catch (error: any) {
      toast.error(error.message);
      return null;
    }
  },
  updateProjectMetadata: async (id: string, name: string, description: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) throw new Error('Failed to update project metadata');

      toast.success("Project updated successfully");
      await get().fetchProjects();
    } catch (error: any) {
      console.error("Update project metadata error:", error);
      toast.error("Error updating project");
    }
  },
  fetchCredentials: async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/credentials');
      if (!response.ok) throw new Error('Failed to fetch credentials');
      const credentials = await response.json();
      set({ credentials });
    } catch (error: any) {
      console.error("Fetch credentials error:", error);
    }
  },
  addCredential: async (cred) => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred),
      });

      if (!response.ok) throw new Error('Failed to add credential');

      toast.success("Credential added successfully");
      await get().fetchCredentials();
    } catch (error: any) {
      console.error("Add credential error:", error);
      toast.error("Error adding credential");
    }
  },
  deleteCredential: async (id) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/credentials/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete credential');

      toast.success("Credential removed");
      await get().fetchCredentials();
    } catch (error: any) {
      console.error("Delete credential error:", error);
      toast.error("Error deleting credential");
    }
  },
  fetchModels: async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/models');
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();

      const mappedModels = data.map((m: any) => ({
        id: m.id,
        name: m.name,
        model_name: m.model_name,
        description: m.description,
        credentialId: m.credential_id,
        baseUrl: m.base_url,
        temperature: m.temperature,
        maxTokens: m.max_tokens,
        maxCompletionTokens: m.max_completion_tokens,
        isDefault: m.is_default
      }));

      set({ models: mappedModels });
    } catch (error: any) {
      console.error("Fetch models error:", error);
    }
  },
  duplicateModel: (id) => {
    const original = get().models.find(m => m.id === id);
    if (!original) return;

    const copy: Omit<ModelConfig, 'id'> = {
      ...original,
      name: `${original.name} (Copy)`,
      isDefault: false // Nunca duplica como default por segurança
    };

    get().addModel(copy);
  },
  addModel: async (modelConfig) => {
    const modelData = {
      name: modelConfig.name,
      model_name: modelConfig.model_name,
      description: modelConfig.description,
      credential_id: modelConfig.credentialId,
      base_url: modelConfig.baseUrl,
      temperature: modelConfig.temperature,
      max_tokens: modelConfig.maxTokens,
      max_completion_tokens: modelConfig.maxCompletionTokens,
      is_default: modelConfig.isDefault
    };

    try {
      const response = await fetch('http://localhost:8000/api/v1/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Add model error response:", errorData);
        throw new Error('Failed to add model');
      }

      get().showNotification("Model added successfully", "success");
      await get().fetchModels();
    } catch (error: any) {
      console.error("Add model error:", error);
      get().showNotification("Error adding model. Check console for details.", "error");
    }
  },
  updateModel: async (id, modelUpdate) => {
    const mappedUpdate: any = {};
    if (modelUpdate.name !== undefined) mappedUpdate.name = modelUpdate.name;
    if (modelUpdate.model_name !== undefined) mappedUpdate.model_name = modelUpdate.model_name;
    if (modelUpdate.description !== undefined) mappedUpdate.description = modelUpdate.description;
    if (modelUpdate.credentialId !== undefined) mappedUpdate.credential_id = modelUpdate.credentialId;
    if (modelUpdate.baseUrl !== undefined) mappedUpdate.base_url = modelUpdate.baseUrl;
    if (modelUpdate.temperature !== undefined) mappedUpdate.temperature = modelUpdate.temperature;
    if (modelUpdate.maxTokens !== undefined) mappedUpdate.max_tokens = modelUpdate.maxTokens;
    if (modelUpdate.maxCompletionTokens !== undefined) mappedUpdate.max_completion_tokens = modelUpdate.maxCompletionTokens;
    if (modelUpdate.isDefault !== undefined) mappedUpdate.is_default = modelUpdate.isDefault;

    try {
      const response = await fetch(`http://localhost:8000/api/v1/models/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappedUpdate),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Update model error response:", errorData);
        throw new Error('Failed to update model');
      }

      get().showNotification("Model updated successfully", "success");
      await get().fetchModels();
    } catch (error: any) {
      console.error("Update model error:", error);
      get().showNotification("Error updating model", "error");
    }
  },
  deleteModel: async (id) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/models/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete model');

      toast.success("Model removed");
      await get().fetchModels();
    } catch (error: any) {
      console.error("Delete model error:", error);
      toast.error("Error deleting model");
    }
  },
  setDefaultModelConfig: async (id) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/models/${id}/set-default`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to set default model');

      toast.success("Default model updated");
      await get().fetchModels();
    } catch (error: any) {
      console.error("Set default model error:", error);
      toast.error("Error updating default model");
    }
  },
  setDefaultModel: (model: string) => {
    localStorage.setItem('default_model', model);
    set({ defaultModel: model });
  },

  setSystemAiModelId: async (id: string | null) => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_ai_model_id: id })
      });
      if (!response.ok) throw new Error('Failed to update settings');
      const settings = await response.json();
      set({ systemAiModelId: settings.system_ai_model_id });
      toast.success('System AI updated!');
    } catch (error: any) {
      toast.error(error.message);
    }
  },

  suggestAiContent: async (nodeId, field) => {
    const { nodes, updateNodeData } = get();
    const agentNode = nodes.find(n => n.id === nodeId);
    if (!agentNode) return null;

    const crewNode = nodes.find(n => n.type === 'crew');
    const workflowName = (crewNode?.data as any)?.name || 'SimpleCrew Workflow';
    const workflowDescription = (crewNode?.data as any)?.description || '';

    try {
      const response = await fetch('http://localhost:8000/api/v1/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          agent_name: (agentNode.data as any).name,
          workflow_name: workflowName,
          workflow_description: workflowDescription,
          current_value: (agentNode.data as any)[field]
        })
      });

      if (!response.ok) throw new Error('Failed to get AI suggestion');
      const data = await response.json();
      
      updateNodeData(nodeId, { [field]: data.suggestion });
      return data.suggestion;
    } catch (error: any) {
      toast.error(`AI Error: ${error.message}`);
      return null;
    }
  },

  suggestBulkAiContent: async (nodeId) => {
    const { nodes, updateNodeData } = get();
    const agentNode = nodes.find(n => n.id === nodeId);
    if (!agentNode) return;

    const crewNode = nodes.find(n => n.type === 'crew');
    const workflowName = (crewNode?.data as any)?.name || 'SimpleCrew Workflow';
    const workflowDescription = (crewNode?.data as any)?.description || '';

    try {
      const response = await fetch('http://localhost:8000/api/v1/ai/bulk-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: (agentNode.data as any).name,
          workflow_name: workflowName,
          workflow_description: workflowDescription,
          current_values: {
            role: (agentNode.data as any).role,
            goal: (agentNode.data as any).goal,
            backstory: (agentNode.data as any).backstory
          }
        })
      });

      if (!response.ok) throw new Error('AI Bulk Suggestion failed');
      const data = await response.json();
      
      updateNodeData(nodeId, {
        role: data.role,
        goal: data.goal,
        backstory: data.backstory
      });
      
      toast.success('Agent details generated! ✨');
    } catch (error: any) {
      toast.error(error.message);
    }
  },

  suggestTaskBulkAiContent: async (nodeId) => {
    const { nodes, updateNodeData } = get();
    const taskNode = nodes.find(n => n.id === nodeId);
    if (!taskNode) return;

    const crewNode = nodes.find(n => n.type === 'crew');
    const workflowName = (crewNode?.data as any)?.name || 'SimpleCrew Workflow';
    const workflowDescription = (crewNode?.data as any)?.description || '';

    // Find assigned agent name if any
    const agentNode = nodes.find(n => n.type === 'agent' && (n.data as any).taskIds?.includes(nodeId));
    const agentName = (agentNode?.data as any)?.name;

    try {
      const response = await fetch('http://localhost:8000/api/v1/ai/task-bulk-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_name: (taskNode.data as any).name || 'Unnamed Task',
          agent_name: agentName,
          workflow_name: workflowName,
          workflow_description: workflowDescription,
          current_values: {
            description: (taskNode.data as any).description,
            expected_output: (taskNode.data as any).expected_output
          }
        })
      });

      if (!response.ok) throw new Error('AI Task Suggestion failed');
      const data = await response.json();
      
      updateNodeData(nodeId, {
        description: data.description,
        expected_output: data.expected_output
      });
      
      toast.success('Task details generated! ✨');
    } catch (error: any) {
      toast.error(error.message);
    }
  }
}));
