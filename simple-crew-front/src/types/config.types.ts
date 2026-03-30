export interface Credential {
  id: string;
  name: string;
  description: string;
  key: string;
  provider?: string;
  created_at: string;
}

export type ModelType = 'GENERATIVE' | 'EMBEDDING';

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
  model_type: ModelType;
}

export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  apiKey?: string;
  requiresKey: boolean;
  category?: string;
  user_config_schema?: {
    fields: Record<string, {
      type: 'string' | 'number' | 'boolean' | 'select';
      label: string;
      placeholder?: string;
      description?: string;
      required?: boolean;
      options?: { label: string; value: any }[];
      optionsUrl?: string;
    }>;
  };
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
  transportType: 'stdio' | 'sse' | 'streamable-http';
  // Stdio fields
  command?: string;
  args?: string[];
  envVars?: Record<string, string>;
  // SSE fields
  url?: string;
  headers?: Record<string, string>;
}
