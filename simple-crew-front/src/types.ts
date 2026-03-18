import { type Node, type Edge } from '@xyflow/react';

export type ProcessType = 'sequential' | 'hierarchical';

export interface AgentNodeData extends Record<string, unknown> {
  name: string;
  role: string;
  goal: string;
  backstory: string;
  isCollapsed?: boolean;
  modelId?: string;
  mcpServerIds?: string[];
  customToolIds?: string[];
}

export interface TaskNodeData extends Record<string, unknown> {
  name: string;
  description: string;
  expected_output: string;
  context?: string[];
  customToolIds?: string[];
}

export interface CrewNodeData extends Record<string, unknown> {
  process: ProcessType;
  isCollapsed?: boolean;
  agentOrder?: string[];
  inputs?: Record<string, string>;
}

export type AppNode =
  | Node<AgentNodeData, 'agent'>
  | Node<TaskNodeData, 'task'>
  | Node<CrewNodeData, 'crew'>;

export type AppEdge = Edge;

export type NodeStatus = 'idle' | 'running' | 'success' | 'error' | 'waiting';

export interface Project {
  id: string;
  name: string;
  description?: string;
  canvas_data: {
    nodes: AppNode[];
    edges: AppEdge[];
    version: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Credential {
  id: string;
  name: string;
  description: string;
  key: string;
  provider?: string;
  created_at: string;
}

export interface AppNotification {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  visible: boolean;
}

export interface ModelConfig {
  id: string;
  name: string;
  model_name: string;
  description?: string;
  credentialId: string;
  baseUrl?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  maxCompletionTokens?: number | null;
  isDefault: boolean;
}

export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  apiKey?: string;
  requiresKey: boolean;
}

export interface CustomTool {
  id: string;
  name: string;
  description: string;
  code: string;
}

export interface MCPServer {
  id: string;
  name: string;
  transportType: 'stdio' | 'sse';
  // Stdio fields
  command?: string;
  args?: string[];
  envVars?: Record<string, string>;
  // SSE fields
  url?: string;
  headers?: Record<string, string>;
}

export interface AppState {
  nodes: AppNode[];
  edges: AppEdge[];
  activeNodeId: string | null;
  isExecuting: boolean;
  isSaving: boolean;
  savedProjects: Project[];
  currentProjectId: string | null;
  nodeStatuses: Record<string, NodeStatus>;
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: any) => void;
  deleteEdge: (edgeId: string) => void;
  deleteNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<any>) => void;
  addNode: (node: AppNode) => void;
  addNodeWithAutoPosition: (type: 'agent' | 'task' | 'crew', data: any) => void;
  fetchProjects: () => Promise<void>;
  saveProject: (name: string, description?: string) => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  setActiveNode: (id: string | null) => void;
  toggleCollapse: (nodeId: string) => void;
  setNodeStatus: (id: string, status: NodeStatus) => void;
  startRealExecution: () => Promise<void>;
  updateCrewAgentOrder: (crewId: string, newOrder: string[]) => void;
  updateAgentTaskOrder: (agentId: string, newOrder: string[]) => void;
  nodeErrors: Record<string, string[]>;
  validateGraph: () => boolean;
  notification: AppNotification | null;
  showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  clearNotification: () => void;
  exportProjectJson: () => void;
  exportPythonProject: () => Promise<void>;
  loadProjectJson: (data: any) => boolean;
  executionResult: string | null;
  setExecutionResult: (result: string | null) => void;
  isConsoleOpen: boolean;
  isConsoleExpanded: boolean;
  setIsConsoleOpen: (isOpen: boolean) => void;
  setIsConsoleExpanded: (isExpanded: boolean) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  resetProject: () => void;
  duplicateProject: (id: string) => Promise<void>;
  updateProjectMetadata: (id: string, name: string, description: string) => Promise<void>;
  createNewProject: (name: string, description: string) => Promise<{id: string} | null>;
  credentials: Credential[];
  fetchCredentials: () => Promise<void>;
  addCredential: (credential: Omit<Credential, 'id' | 'created_at'>) => void;
  deleteCredential: (id: string) => void;
  
  models: ModelConfig[];
  fetchModels: () => Promise<void>;
  addModel: (model: Omit<ModelConfig, 'id'>) => void;
  duplicateModel: (id: string) => void;
  updateModel: (id: string, model: Partial<ModelConfig>) => void;
  deleteModel: (id: string) => void;
  setDefaultModelConfig: (id: string) => void;
  
  defaultModel: string;
  setDefaultModel: (model: string) => void;

  globalTools: ToolConfig[];
  updateToolConfig: (id: string, config: Partial<ToolConfig>) => void;
  
  customTools: CustomTool[];
  fetchCustomTools: () => Promise<void>;
  addCustomTool: (tool: Omit<CustomTool, 'id'>) => Promise<void>;
  updateCustomTool: (id: string, tool: Partial<CustomTool>) => Promise<void>;
  deleteCustomTool: (id: string) => Promise<void>;

  mcpServers: MCPServer[];
  fetchMCPServers: () => Promise<void>;
  addMCPServer: (server: Omit<MCPServer, 'id'>) => void;
  updateMCPServer: (id: string, server: Partial<MCPServer>) => void;
  deleteMCPServer: (id: string) => void;

  systemAiModelId: string | null;
  fetchSettings: () => Promise<void>;
  setSystemAiModelId: (id: string | null) => void;
  suggestAiContent: (nodeId: string, field: 'role' | 'goal' | 'backstory' | 'description' | 'expected_output') => Promise<void>;
  suggestBulkAiContent: (nodeId: string) => Promise<void>;
  suggestTaskBulkAiContent: (nodeId: string) => Promise<void>;
}
