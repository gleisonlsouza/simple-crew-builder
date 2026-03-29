import { 
  type Connection, 
  type EdgeChange, 
  type NodeChange 
} from '@xyflow/react';
import { 
  type AppNode, 
  type AppEdge 
} from './nodes.types';
import { 
  type ModelConfig, 
  type ToolConfig, 
  type CustomTool, 
  type MCPServer, 
  type Credential 
} from './config.types';

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

export interface AppNotification {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  visible: boolean;
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

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface KnowledgeBaseDocument {
  id: string;
  filename: string;
  size?: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GraphSlice {
  nodes: AppNode[];
  edges: AppEdge[];
  nodeStatuses: Record<string, NodeStatus>;
  nodeErrors: Record<string, string[]>;
  nodeWarnings: Record<string, string[]>;
  executionResult: string | null;
  messages: ChatMessage[];
  activeNodeId: string | null;
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  deleteEdge: (edgeId: string) => void;
  deleteNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<any>) => void;
  addNode: (node: AppNode) => void;
  addNodeWithAutoPosition: (type: 'agent' | 'task' | 'crew' | 'chat' | 'webhook', data: any) => void;
  setNodeStatus: (id: string, status: NodeStatus) => void;
  setNodeWarnings: (warnings: Record<string, string[]>) => void;
  setActiveNode: (id: string | null) => void;
  toggleCollapse: (nodeId: string) => void;
  updateCrewAgentOrder: (crewId: string, newOrder: string[]) => void;
  updateCrewTaskOrder: (crewId: string, newOrder: string[]) => void;
  updateAgentTaskOrder: (agentId: string, newOrder: string[]) => void;
  validateGraph: () => boolean;
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  clearChat: () => void;
  resetProject: () => void;
}

export interface UISlice {
  theme: 'light' | 'dark';
  isSettingsOpen: boolean;
  isConsoleOpen: boolean;
  isConsoleExpanded: boolean;
  isUsabilityDrawerOpen: boolean;
  isChatVisible: boolean;
  notification: AppNotification | null;
  toggleTheme: () => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsConsoleOpen: (open: boolean) => void;
  setIsConsoleExpanded: (expanded: boolean) => void;
  setIsUsabilityDrawerOpen: (open: boolean) => void;
  setIsChatVisible: (visible: boolean) => void;
  resetUIState: () => void;
  showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  clearNotification: () => void;
}

export interface ProjectSlice {
  savedProjects: Project[];
  currentProjectId: string | null;
  currentProjectName: string | null;
  currentProjectDescription: string | null;
  currentProjectWorkspaceId: string | null;
  currentProjectWorkspaceName: string | null;
  isSaving: boolean;
  isExecuting: boolean;
  isDirty: boolean; // Add isDirty flag
  abortController: AbortController | null;
  setDirty: (dirty: boolean) => void;
  hydrateFromSnapshot: (projectId: string, snapshot: any) => void;
  fetchProjects: () => Promise<void>;
  saveProject: (name: string, description?: string) => Promise<void>;
  updateProjectMetadata: (id: string, name: string, description: string) => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  createNewProject: (name: string, description: string) => Promise<Project | null>;
  duplicateProject: (id: string) => Promise<void>;
  exportProjectJson: () => void;
  exportPythonProject: () => Promise<void>;
  loadProjectJson: (data: any) => boolean;
  importProjectJsonAndSave: (data: any) => Promise<Project | null>;
  startRealExecution: () => Promise<string | null>;
  stopExecution: () => void;
  updateProjectWorkspaceId: (workspaceId: string | null) => void;
}

export interface ConfigSlice {
  credentials: Credential[];
  models: ModelConfig[];
  globalTools: ToolConfig[];
  customTools: CustomTool[];
  mcpServers: MCPServer[];
  systemAiModelId: string | null;
  embeddingModelId: string | null;
  defaultModel: string;
  fetchCredentials: () => Promise<void>;
  addCredential: (credential: Omit<Credential, 'id' | 'created_at'>) => Promise<void>;
  deleteCredential: (id: string) => Promise<void>;
  fetchModels: () => Promise<void>;
  addModel: (model: Omit<ModelConfig, 'id'>) => Promise<void>;
  duplicateModel: (id: string) => void;
  updateModel: (id: string, model: Partial<ModelConfig>) => Promise<void>;
  deleteModel: (id: string) => Promise<void>;
  setDefaultModelConfig: (id: string) => Promise<void>;
  setSystemAiModelId: (id: string | null) => void;
  setEmbeddingModelId: (id: string | null) => void;
  setDefaultModel: (model: string) => void;
  updateToolConfig: (id: string, config: Partial<ToolConfig>) => void;
  fetchCustomTools: () => Promise<void>;
  addCustomTool: (tool: Omit<CustomTool, 'id'>) => Promise<void>;
  updateCustomTool: (id: string, tool: Partial<CustomTool>) => Promise<void>;
  deleteCustomTool: (id: string) => Promise<void>;
  fetchMCPServers: () => Promise<void>;
  addMCPServer: (server: Omit<MCPServer, 'id'>) => Promise<void>;
  updateMCPServer: (id: string, server: Partial<MCPServer>) => Promise<void>;
  deleteMCPServer: (id: string) => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: { active_workspace_id?: string | null; system_ai_model_id?: string | null; embedding_model_id?: string | null }) => Promise<void>;
}

export interface WorkspaceSlice {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isExplorerOpen: boolean;
  currentExplorerWsId: string | null;
  fetchWorkspaces: () => Promise<void>;
  addWorkspace: (workspace: Omit<Workspace, 'id'>) => Promise<void>;
  updateWorkspace: (id: string, workspace: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  openWorkspace: (id: string) => Promise<void>;
  setActiveWorkspaceId: (id: string | null) => void;
  setIsExplorerOpen: (open: boolean) => void;
  setCurrentExplorerWsId: (id: string | null) => void;
  fetchWorkspaceFiles: (wsId: string) => Promise<WorkspaceFile[]>;
  fetchFileContent: (wsId: string, path: string) => Promise<string>;
  uploadWorkspaceFiles: (wsId: string, files: FileList | File[]) => Promise<void>;
  deleteWorkspaceFile: (wsId: string, path: string) => Promise<void>;
  downloadWorkspaceZip: (wsId: string, path?: string) => Promise<void>;
}

export interface AISlice {
  suggestAiContent: (nodeId: string, field: 'role' | 'goal' | 'backstory' | 'description' | 'expected_output') => Promise<void>;
  suggestBulkAiContent: (nodeId: string) => Promise<void>;
  suggestTaskBulkAiContent: (nodeId: string) => Promise<void>;
}

export interface Execution {
  id: string;
  project_id: string;
  status: 'running' | 'success' | 'error';
  trigger_type: string;
  input_data: any;
  output_data?: any;
  graph_snapshot: any;
  duration?: number;
  timestamp: string;
}

export interface ExecutionSlice {
  executions: Execution[];
  currentExecution: Execution | null;
  isLoadingExecutions: boolean;
  fetchExecutions: (projectId: string) => Promise<void>;
  fetchExecutionDetails: (executionId: string) => Promise<Execution | null>;
  reRunExecution: (execution: Execution) => void;
}

export type AppState = GraphSlice & 
  UISlice & 
  ProjectSlice & 
  ConfigSlice & 
  WorkspaceSlice & 
  AISlice &
  ExecutionSlice;

