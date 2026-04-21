import type { StateCreator } from 'zustand';
import toast from 'react-hot-toast';

import type { AppState, ConfigSlice } from '../../types/store.types';
import type { ModelConfig, Credential, MCPServer, CustomTool, ToolConfig } from '../../types/config.types';

const API_URL = import.meta.env.VITE_API_URL || '';

import { initialGlobalTools } from '../initialTools';

const getInitialGlobalTools = (): ToolConfig[] => {
  const STORAGE_KEY = 'global_tools_v9';
  const persistedRaw = localStorage.getItem(STORAGE_KEY);
  
  if (!persistedRaw) return initialGlobalTools;

  try {
    const persistedTools = JSON.parse(persistedRaw) as ToolConfig[];
    
    // Check for tools in initialGlobalTools that are missing in persistedTools
    const missingTools = initialGlobalTools.filter(
      it => !persistedTools.some(pt => pt.id === it.id)
    );

    if (missingTools.length > 0) {
      const merged = [...persistedTools, ...missingTools];
      // Persist the merged list so next time we don't have to re-merge
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }

    return persistedTools;
  } catch (error) {
    console.error('Error hydrating global tools:', error);
    return initialGlobalTools;
  }
};

export const createConfigSlice: StateCreator<AppState, [], [], ConfigSlice> = (set, get) => ({
  credentials: [],
  models: JSON.parse(localStorage.getItem('models') || '[]'),
  defaultModel: localStorage.getItem('default_model') || 'gpt-4o',
  globalTools: getInitialGlobalTools(),
  customTools: [],
  mcpServers: [],
  systemAiModelId: localStorage.getItem('default_system_ai_model_id'),
  embeddingModelId: localStorage.getItem('default_embedding_model_id'),

  fetchCredentials: async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/credentials`);
      if (!response.ok) throw new Error('Failed to fetch credentials');
      set({ credentials: await response.json() });
    } catch (error) { console.error(error); }
  },

  addCredential: async (cred: Omit<Credential, 'id' | 'created_at'>) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred),
      });
      if (!response.ok) throw new Error('Failed to add credential');
      toast.success("Credential added successfully");
      await get().fetchCredentials();
    } catch (error) { toast.error((error as Error).message); }
  },

  updateCredential: async (id: string, credUpdate: Partial<Omit<Credential, 'id' | 'created_at'>>) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/credentials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credUpdate),
      });
      if (!response.ok) throw new Error('Failed to update credential');
      toast.success("Credential updated successfully");
      await get().fetchCredentials();
    } catch (error) { toast.error((error as Error).message); }
  },

  deleteCredential: async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/credentials/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete credential');
      toast.success("Credential removed");
      await get().fetchCredentials();
    } catch (error) { toast.error((error as Error).message); }
  },

  fetchModels: async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/models`);
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();
      const mappedModels = data.map((m: { 
        id: string; name: string; model_name: string; description?: string;
        credential_id: string; base_url?: string; temperature?: number;
        max_tokens?: number; max_completion_tokens?: number;
        is_default: boolean; model_type: ModelConfig['model_type']
      }) => ({
        id: m.id, name: m.name, model_name: m.model_name, description: m.description,
        credentialId: m.credential_id, baseUrl: m.base_url, temperature: m.temperature,
        maxTokens: m.max_tokens, maxCompletionTokens: m.max_completion_tokens,
        isDefault: m.is_default, model_type: m.model_type
      }));
      set({ models: mappedModels });
    } catch (error) { console.error(error); }
  },

  addModel: async (modelConfig: Omit<ModelConfig, 'id'>) => {
    const modelData = {
      name: modelConfig.name, model_name: modelConfig.model_name, description: modelConfig.description,
      credential_id: modelConfig.credentialId, base_url: modelConfig.baseUrl, temperature: modelConfig.temperature,
      max_tokens: modelConfig.maxTokens, max_completion_tokens: modelConfig.maxCompletionTokens,
      is_default: modelConfig.isDefault, model_type: modelConfig.model_type
    };
    try {
      const response = await fetch(`${API_URL}/api/v1/models`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(modelData)
      });
      if (!response.ok) throw new Error('Failed to add model');
      toast.success("Model added successfully");
      await get().fetchModels();
    } catch (error) { toast.error((error as Error).message); }
  },

  duplicateModel: (id: string) => {
    const original = get().models.find((m: ModelConfig) => m.id === id);
    if (!original) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _unused, ...copyData } = original;
    get().addModel({ ...copyData, name: `${original.name} (Copy)`, isDefault: false });
  },

  updateModel: async (id: string, modelUpdate: Partial<ModelConfig>) => {
    const mappedUpdate: Partial<{
      name: string; model_name: string; description: string; credential_id: string;
      base_url: string | null; temperature: number | null; max_tokens: number | null;
      max_completion_tokens: number | null; is_default: boolean; model_type: string;
    }> = {};
    if (modelUpdate.name !== undefined) mappedUpdate.name = modelUpdate.name;
    if (modelUpdate.model_name !== undefined) mappedUpdate.model_name = modelUpdate.model_name;
    if (modelUpdate.description !== undefined) mappedUpdate.description = modelUpdate.description;
    if (modelUpdate.credentialId !== undefined) mappedUpdate.credential_id = modelUpdate.credentialId;
    if (modelUpdate.baseUrl !== undefined) mappedUpdate.base_url = modelUpdate.baseUrl;
    if (modelUpdate.temperature !== undefined) mappedUpdate.temperature = modelUpdate.temperature;
    if (modelUpdate.maxTokens !== undefined) mappedUpdate.max_tokens = modelUpdate.maxTokens;
    if (modelUpdate.maxCompletionTokens !== undefined) mappedUpdate.max_completion_tokens = modelUpdate.maxCompletionTokens;
    if (modelUpdate.isDefault !== undefined) mappedUpdate.is_default = modelUpdate.isDefault;
    if (modelUpdate.model_type !== undefined) mappedUpdate.model_type = modelUpdate.model_type;
    try {
      const response = await fetch(`${API_URL}/api/v1/models/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mappedUpdate)
      });
      if (!response.ok) throw new Error('Failed to update model');
      toast.success("Model updated successfully");
      await get().fetchModels();
    } catch (error) { toast.error((error as Error).message); }
  },

  deleteModel: async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/models/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete model');
      toast.success("Model removed");
      const { systemAiModelId, embeddingModelId, setSystemAiModelId, setEmbeddingModelId } = get();
      if (systemAiModelId === id) setSystemAiModelId(null);
      if (embeddingModelId === id) setEmbeddingModelId(null);
      await get().fetchModels();
    } catch (error) { toast.error((error as Error).message); }
  },

  setDefaultModelConfig: async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/models/${id}/set-default`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to set default model');
      toast.success("Default model updated");
      await get().fetchModels();
    } catch (error) { toast.error((error as Error).message); }
  },

  setSystemAiModelId: (id: string | null) => {
    set({ systemAiModelId: id });
    if (id) localStorage.setItem('default_system_ai_model_id', id); else localStorage.removeItem('default_system_ai_model_id');
    get().updateSettings({ system_ai_model_id: id });
  },

  setEmbeddingModelId: (id: string | null) => {
    set({ embeddingModelId: id });
    if (id) localStorage.setItem('default_embedding_model_id', id); else localStorage.removeItem('default_embedding_model_id');
    get().updateSettings({ embedding_model_id: id });
  },

  setDefaultModel: (model: string) => {
    localStorage.setItem('default_model', model);
    set({ defaultModel: model });
  },

  updateToolConfig: (id: string, config: Partial<ToolConfig>) => {
    set((state) => {
      const newTools = state.globalTools.map((t) => t.id === id ? { ...t, ...config } : t);
      localStorage.setItem('global_tools_v8', JSON.stringify(newTools));
      return { globalTools: newTools };
    });
  },

  fetchCustomTools: async (framework?: string) => {
    try {
      const query = framework ? `?framework=${framework}` : '';
      const response = await fetch(`${API_URL}/api/v1/custom-tools${query}`);
      if (!response.ok) throw new Error('Failed to fetch custom tools');
      set({ customTools: await response.json() });
    } catch (error) { console.error(error); }
  },

  addCustomTool: async (tool: Omit<CustomTool, 'id'>) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/custom-tools`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tool)
      });
      if (!response.ok) throw new Error('Failed to add custom tool');
      await get().fetchCustomTools();
      toast.success('Custom Tool added!');
    } catch (error) { toast.error((error as Error).message); }
  },

  updateCustomTool: async (id: string, config: Partial<CustomTool>) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/custom-tools/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error('Failed to update custom tool');
      await get().fetchCustomTools();
      toast.success('Custom Tool updated!');
    } catch (error) { toast.error((error as Error).message); }
  },

  deleteCustomTool: async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/custom-tools/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete custom tool');
      await get().fetchCustomTools();
      toast.success('Custom Tool removed.');
    } catch (error) { toast.error((error as Error).message); }
  },

  fetchMCPServers: async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/mcp-servers`);
      if (!response.ok) throw new Error('Failed to fetch MCP servers');
      const servers = await response.json();
      const mappedServers = servers.map((s: {
        id: string; name: string; transport_type: string; command?: string;
        args?: string[]; env_vars?: Record<string, string>; url?: string; headers?: Record<string, string>;
      }) => ({
        id: s.id, name: s.name, transportType: s.transport_type, command: s.command,
        args: s.args, envVars: s.env_vars, url: s.url, headers: s.headers
      }));
      set({ mcpServers: mappedServers });
    } catch (error) { console.error(error); }
  },

  addMCPServer: async (server: Omit<MCPServer, 'id'>) => {
    try {
      const payload = {
        name: server.name, transport_type: server.transportType, command: server.command,
        args: server.args, env_vars: server.envVars, url: server.url, headers: server.headers
      };
      const response = await fetch(`${API_URL}/api/v1/mcp-servers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to add MCP server');
      await get().fetchMCPServers();
      toast.success('MCP Server added!');
    } catch (error) { toast.error((error as Error).message); }
  },

  updateMCPServer: async (id: string, config: Partial<MCPServer>) => {
    try {
      const payload: Partial<{
        name: string; transport_type: string; command: string;
        args: string[]; env_vars: Record<string, string>; url: string; headers: Record<string, string>;
      }> = {};
      if (config.name !== undefined) payload.name = config.name;
      if (config.transportType !== undefined) payload.transport_type = config.transportType;
      if (config.command !== undefined) payload.command = config.command;
      if (config.args !== undefined) payload.args = config.args;
      if (config.envVars !== undefined) payload.env_vars = config.envVars;
      if (config.url !== undefined) payload.url = config.url;
      if (config.headers !== undefined) payload.headers = config.headers;
      const response = await fetch(`${API_URL}/api/v1/mcp-servers/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to update MCP server');
      await get().fetchMCPServers();
      toast.success('MCP Server updated!');
    } catch (error) { toast.error((error as Error).message); }
  },

  deleteMCPServer: async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/mcp-servers/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete MCP server');
      await get().fetchMCPServers();
      toast.success('MCP Server removed.');
    } catch (error) { toast.error((error as Error).message); }
  },

  fetchSettings: async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/settings`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      const settings = await response.json();
      set({ 
        activeWorkspaceId: settings.active_workspace_id,
        systemAiModelId: settings.system_ai_model_id,
        embeddingModelId: settings.embedding_model_id
      });
      if (settings.system_ai_model_id) localStorage.setItem('default_system_ai_model_id', settings.system_ai_model_id);
      if (settings.embedding_model_id) localStorage.setItem('default_embedding_model_id', settings.embedding_model_id);
    } catch (error) { console.error("Error fetching settings:", error); }
  },

  updateSettings: async (settings: { active_workspace_id?: string | null; system_ai_model_id?: string | null; embedding_model_id?: string | null }) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      const updated = await response.json();
      set({ 
        activeWorkspaceId: updated.active_workspace_id,
        systemAiModelId: updated.system_ai_model_id,
        embeddingModelId: updated.embedding_model_id
      });
      toast.success("Settings updated");
    } catch (error) { toast.error((error as Error).message); }
  },
});
