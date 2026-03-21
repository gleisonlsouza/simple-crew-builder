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
  globalToolIds?: string[];
  function_calling_llm_id?: string;
  max_iter?: number;
  max_rpm?: number;
  max_execution_time?: number;
  verbose?: boolean;
  allow_delegation?: boolean;
  cache?: boolean;
  allow_code_execution?: boolean;
  max_retry_limit?: number;
  respect_context_window?: boolean;
  use_system_prompt?: boolean;
  code_execution_mode?: string;
  reasoning?: boolean;
  max_reasoning_attempts?: number;
  multimodal?: boolean;
  inject_date?: boolean;
  date_format?: string;
  system_template?: string;
  prompt_template?: string;
  response_template?: string;
}

export interface TaskNodeData extends Record<string, unknown> {
  name: string;
  description: string;
  expected_output: string;
  context?: string[];
  customToolIds?: string[];
  globalToolIds?: string[];
  async_execution?: boolean;
  human_input?: boolean;
  output_file?: string;
  create_directory?: boolean;
}

export interface CrewNodeData extends Record<string, unknown> {
  process: ProcessType;
  isCollapsed?: boolean;
  agentOrder?: string[];
  inputs?: Record<string, string>;
  verbose?: boolean;
  memory?: boolean;
  cache?: boolean;
  planning?: boolean;
  share_crew?: boolean;
  max_rpm?: number;
  manager_llm_id?: string;
  planning_llm_id?: string;
  function_calling_llm_id?: string;
  output_log_file?: string;
  embedder?: string; // Stored as a JSON string for easy editing
  prompt_file?: string;
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
  workspace_id?: string;
  canvas_data: {
    nodes: AppNode[];
    edges: AppEdge[];
    customTools?: CustomTool[];
    mcpServers?: MCPServer[];
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
  category?: string;
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

export interface Workspace {
  id: string;
  name: string;
  path: string;
}

export interface WorkspaceFile {
  name: string;
  path: string;
  is_dir: boolean;
  children?: WorkspaceFile[];
}

export interface AppState {
  nodes: AppNode[];
  edges: AppEdge[];
  activeNodeId: string | null;
  isExecuting: boolean;
  isSaving: boolean;
  savedProjects: Project[];
  currentProjectId: string | null;
  currentProjectName: string | null;
  currentProjectDescription: string | null;
  currentProjectWorkspaceId: string | null;
  updateProjectWorkspaceId: (workspaceId: string | null) => void;
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
  updateProjectMetadata: (id: string, name: string, description: string) => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  createNewProject: (name: string, description: string) => Promise<Project | null>;
  duplicateProject: (id: string) => Promise<void>;
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
  importProjectJsonAndSave: (data: any) => Promise<Project | null>;
  executionResult: string | null;
  setExecutionResult: (result: string | null) => void;
  resetProject: () => void;

  
  // Workspace management & Settings
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  systemAiModelId: string | null;
  setSystemAiModelId: (id: string | null) => void;
  setActiveWorkspaceId: (id: string | null) => void;
  fetchWorkspaces: () => Promise<void>;
  addWorkspace: (workspace: Omit<Workspace, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateWorkspace: (id: string, workspace: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  openWorkspace: (id: string) => Promise<void>;
  fetchSettings: () => Promise<void>;

  updateSettings: (settings: { active_workspace_id?: string | null; system_ai_model_id?: string | null }) => Promise<void>;

  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isConsoleOpen: boolean;
  isConsoleExpanded: boolean;
  setIsConsoleOpen: (isOpen: boolean) => void;
  setIsConsoleExpanded: (isExpanded: boolean) => void;

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

  // AI Assistant / Consulting
  suggestAiContent: (nodeId: string, field: 'role' | 'goal' | 'backstory' | 'description' | 'expected_output') => Promise<void>;
  suggestBulkAiContent: (nodeId: string) => Promise<void>;
  suggestTaskBulkAiContent: (nodeId: string) => Promise<void>;

  // Explorer
  isExplorerOpen: boolean;
  setIsExplorerOpen: (open: boolean) => void;
  currentExplorerWsId: string | null;
  setCurrentExplorerWsId: (id: string | null) => void;
  fetchWorkspaceFiles: (wsId: string) => Promise<WorkspaceFile[]>;
  fetchFileContent: (wsId: string, path: string) => Promise<string>;
  downloadWorkspaceZip: (wsId: string, path?: string) => Promise<void>;
}
