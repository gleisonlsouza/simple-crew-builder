import { type Node, type Edge } from '@xyflow/react';

export type ProcessType = 'sequential' | 'hierarchical' | 'consensual';

export interface AgentNodeData extends Record<string, unknown> {
  name: string;
  role: string;
  goal: string;
  backstory: string;
  isCollapsed?: boolean;
  modelId?: string;
  temperature?: number;
  mcpServerIds?: string[];
  customToolIds?: string[];
  globalToolIds?: (string | { id: string; config: Record<string, unknown> })[];
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
  taskOrder?: string[];
  disabledToolIds?: string[];
}

export interface LangGraphAgentData extends Record<string, unknown> {
  name: string;
  role: string;
  goal: string;
  backstory: string;
  llm_id?: string;
}

export interface LangGraphTaskData extends Record<string, unknown> {
  name: string;
  description: string;
  expected_output: string;
}

export interface TaskNodeData extends Record<string, unknown> {
  name: string;
  description: string;
  expected_output: string;
  agentId?: string;
  context?: string[];
  customToolIds?: string[];
  globalToolIds?: (string | { id: string; config: Record<string, unknown> })[];
  async_execution?: boolean;
  human_input?: boolean;
  output_file?: string;
  output_json?: boolean;
  output_pydantic?: boolean;
  create_directory?: boolean;
  isCollapsed?: boolean;
}

export interface CrewNodeData extends Record<string, unknown> {
  name: string;
  process: ProcessType;
  isCollapsed?: boolean;
  agentOrder?: string[];
  taskOrder?: string[];
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
  /** LangGraph only: the state key to surface as the final output.
   *  Use '__FULL_STATE__' (or leave undefined) to return the entire state object. */
  outputKey?: string;
}

export interface ChatNodeData extends Record<string, unknown> {
  name: string;
  description: string;
  isCollapsed?: boolean;
  inputMapping?: string;
  includeHistory?: boolean;
  systemMessage?: string;
}

export interface WebhookNodeData extends Record<string, unknown> {
  name: string;
  webhookId?: string;
  path: string;
  url: string;
  method?: 'POST' | 'GET';
  fieldMappings?: Record<string, string>;
  token?: string;
  headers?: Record<string, string>;
  isActive?: boolean;
  waitForResult?: boolean;
  isCollapsed?: boolean;
}

export interface ToolNodeData extends Record<string, unknown> {
  name: string;
  toolId: string;
  config?: Record<string, unknown>;
  category?: string;
}

export interface CustomToolNodeData extends Record<string, unknown> {
  name: string;
  toolId: string;
  description?: string;
}

export interface McpNodeData extends Record<string, unknown> {
  name: string;
  serverId: string;
  url?: string;
}

export interface StateField {
  id: string; // unique ID for the UI list rendering
  key: string; // e.g., 'messages', 'intent'
  type: string; // Can be 'string', 'integer', or a Dynamic Schema Name
  reducer: 'overwrite' | 'append'; // Represents LangGraph reducers (e.g., add_messages)
  defaultValue?: unknown;
}

export interface StateNodeData extends Record<string, unknown> {
  name: string;
  description?: string;
  fields: StateField[];
}

export interface SchemaField {
  id: string; 
  key: string; 
  type: 'string' | 'integer' | 'boolean' | 'float' | 'list' | 'dict';
  description: string; // Crucial for LLMs to understand the extraction target
  defaultValue?: unknown;
}

export interface SchemaNodeData extends Record<string, unknown> {
  name: string;
  description?: string;
  fields: SchemaField[];
}

export type RouterOperator = 'is_equal' | 'is_not_equal' | 'contains' | 'is_true' | 'is_false' | 'is_empty' | 'greater_than' | 'less_than';

export interface RouteCondition {
  id: string;
  label: string; // The name of the path (e.g., "Review Required")
  field: string; // The field from the State to check
  operator: RouterOperator;
  value: unknown;
}

export interface RouterNodeData extends Record<string, unknown> {
  name: string;
  conditions: RouteCondition[];
  defaultRouteLabel: string;
}

export type AppNode = 
  | Node<AgentNodeData, 'agent'>
  | Node<TaskNodeData, 'task'>
  | Node<CrewNodeData, 'crew'>
  | Node<ChatNodeData, 'chat'>
  | Node<WebhookNodeData, 'webhook'>
  | Node<ToolNodeData, 'tool'>
  | Node<CustomToolNodeData, 'customTool'>
  | Node<McpNodeData, 'mcp'>
  | Node<StateNodeData, 'state'>
  | Node<RouterNodeData, 'router'>
  | Node<SchemaNodeData, 'schema'>;

export type AppEdge = Edge;
