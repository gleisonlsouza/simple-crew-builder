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

export type AppNode =
  | Node<AgentNodeData, 'agent'>
  | Node<TaskNodeData, 'task'>
  | Node<CrewNodeData, 'crew'>
  | Node<ChatNodeData, 'chat'>
  | Node<WebhookNodeData, 'webhook'>;

export type AppEdge = Edge;
