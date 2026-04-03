import type { StateCreator } from 'zustand';
import toast from 'react-hot-toast';

import type { AppState, ConfigSlice } from '../../types/store.types';

const API_URL = import.meta.env.VITE_API_URL || '';

import { initialGlobalTools } from '../initialTools';

export const createConfigSlice: StateCreator<AppState, [], [], ConfigSlice> = (set, get) => ({
  credentials: [],
  models: JSON.parse(localStorage.getItem('models') || '[]'),
  defaultModel: localStorage.getItem('default_model') || 'gpt-4o',
  globalTools: JSON.parse(localStorage.getItem('global_tools_v8') || JSON.stringify(initialGlobalTools)),
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

  addCredential: async (cred) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred),
      });
      if (!response.ok) throw new Error('Failed to add credential');
      toast.success("Credential added successfully");
      await get().fetchCredentials();
    } catch (error: any) { toast.error(error.message); }
  },

  updateCredential: async (id, credUpdate) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/credentials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credUpdate),
      });
      if (!response.ok) throw new Error('Failed to update credential');
      toast.success("Credential updated successfully");
      await get().fetchCredentials();
    } catch (error: any) { toast.error(error.message); }
  },

  deleteCredential: async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/credentials/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete credential');
      toast.success("Credential removed");
      await get().fetchCredentials();
    } catch (error: any) { toast.error(error.message); }
  },

  fetchModels: async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/models`);
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();
      const mappedModels = data.map((m: any) => ({
        id: m.id, name: m.name, model_name: m.model_name, description: m.description,
        credentialId: m.credential_id, baseUrl: m.base_url, temperature: m.temperature,
        maxTokens: m.max_tokens, maxCompletionTokens: m.max_completion_tokens,
        isDefault: m.is_default, model_type: m.model_type
      }));
      set({ models: mappedModels });
    } catch (error) { console.error(error); }
  },

  addModel: async (modelConfig) => {
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
    } catch (error: any) { toast.error(error.message); }
  },

  duplicateModel: (id) => {
    const original = get().models.find(m => m.id === id);
    if (!original) return;
    const { id: _, ...copyData } = original;
    get().addModel({ ...copyData, name: `${original.name} (Copy)`, isDefault: false });
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
    if (modelUpdate.model_type !== undefined) mappedUpdate.model_type = modelUpdate.model_type;
    try {
      const response = await fetch(`${API_URL}/api/v1/models/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mappedUpdate)
      });
      if (!response.ok) throw new Error('Failed to update model');
      toast.success("Model updated successfully");
      await get().fetchModels();
    } catch (error: any) { toast.error(error.message); }
  },

  deleteModel: async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/models/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete model');
      toast.success("Model removed");
      const { systemAiModelId, embeddingModelId, setSystemAiModelId, setEmbeddingModelId } = get();
      if (systemAiModelId === id) setSystemAiModelId(null);
      if (embeddingModelId === id) setEmbeddingModelId(null);
      await get().fetchModels();
    } catch (error: any) { toast.error(error.message); }
  },

  setDefaultModelConfig: async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/models/${id}/set-default`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to set default model');
      toast.success("Default model updated");
      await get().fetchModels();
    } catch (error: any) { toast.error(error.message); }
  },

  setSystemAiModelId: (id) => {
    set({ systemAiModelId: id });
    if (id) localStorage.setItem('default_system_ai_model_id', id); else localStorage.removeItem('default_system_ai_model_id');
    get().updateSettings({ system_ai_model_id: id });
  },

  setEmbeddingModelId: (id) => {
    set({ embeddingModelId: id });
    if (id) localStorage.setItem('default_embedding_model_id', id); else localStorage.removeItem('default_embedding_model_id');
    get().updateSettings({ embedding_model_id: id });
  },

  setDefaultModel: (model) => {
    localStorage.setItem('default_model', model);
    set({ defaultModel: model });
  },

  updateToolConfig: (id, config) => {
    set((state: AppState) => {
      const newTools = state.globalTools.map((t: any) => t.id === id ? { ...t, ...config } : t);
      localStorage.setItem('global_tools_v8', JSON.stringify(newTools));
      return { globalTools: newTools };
    });
  },

  fetchCustomTools: async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/custom-tools`);
      if (!response.ok) throw new Error('Failed to fetch custom tools');
      set({ customTools: await response.json() });
    } catch (error) { console.error(error); }
  },

  addCustomTool: async (tool) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/custom-tools`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tool)
      });
      if (!response.ok) throw new Error('Failed to add custom tool');
      await get().fetchCustomTools();
      toast.success('Custom Tool added!');
    } catch (error: any) { toast.error(error.message); }
  },

  updateCustomTool: async (id, config) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/custom-tools/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error('Failed to update custom tool');
      await get().fetchCustomTools();
      toast.success('Custom Tool updated!');
    } catch (error: any) { toast.error(error.message); }
  },

  deleteCustomTool: async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/custom-tools/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete custom tool');
      await get().fetchCustomTools();
      toast.success('Custom Tool removed.');
    } catch (error: any) { toast.error(error.message); }
  },

  fetchMCPServers: async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/mcp-servers`);
      if (!response.ok) throw new Error('Failed to fetch MCP servers');
      const servers = await response.json();
      const mappedServers = servers.map((s: any) => ({
        id: s.id, name: s.name, transportType: s.transport_type, command: s.command,
        args: s.args, envVars: s.env_vars, url: s.url, headers: s.headers
      }));
      set({ mcpServers: mappedServers });
    } catch (error) { console.error(error); }
  },

  addMCPServer: async (server) => {
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
    } catch (error: any) { toast.error(error.message); }
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
      const response = await fetch(`${API_URL}/api/v1/mcp-servers/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to update MCP server');
      await get().fetchMCPServers();
      toast.success('MCP Server updated!');
    } catch (error: any) { toast.error(error.message); }
  },

  deleteMCPServer: async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/mcp-servers/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete MCP server');
      await get().fetchMCPServers();
      toast.success('MCP Server removed.');
    } catch (error: any) { toast.error(error.message); }
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

  updateSettings: async (settings) => {
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
    } catch (error: any) { toast.error(error.message); }
  },
});
