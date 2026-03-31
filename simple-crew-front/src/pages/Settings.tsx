import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Key, 
  Cpu, 
  Eye, 
  EyeOff, 
  Plus,
  Trash2,
  Calendar,
  ChevronRight,
  X,
  ShieldCheck,
  Copy,
  Wrench,
  Server,
  Settings2,
  PlusCircle,
  Hash,
  Search,
  Sparkles,
  Network,
  Code,
  Edit,
  Terminal,
  FileCode,
  FolderOpen,
  Layout,
  Type
} from 'lucide-react';
import { useStore } from '../store/index';
import { HighlightedTextField } from '../components/HighlightedTextField';
import { CustomSelect } from '../components/CustomSelect';
import { type ModelConfig, type MCPServer, type CustomTool } from '../types/config.types';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { KnowledgeBaseSettings } from '../components/KnowledgeBaseSettings';
import { Database } from 'lucide-react';


const INITIAL_CREDENTIAL = { name: '', description: '', key: '', provider: '' };
const INITIAL_MODEL = { 
  name: '', 
  model_name: '',
  description: '', 
  credentialId: '', 
  baseUrl: '', 
  temperature: undefined, 
  maxTokens: undefined, 
  maxCompletionTokens: undefined, 
  isDefault: false,
  model_type: 'GENERATIVE' as const
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const { 
    credentials, addCredential, updateCredential, deleteCredential, fetchCredentials,
    models: modelConfigs, addModel, updateModel, deleteModel, setDefaultModelConfig, fetchModels, duplicateModel,
    globalTools, updateToolConfig,
    customTools, addCustomTool, updateCustomTool, deleteCustomTool,
    mcpServers, addMCPServer, updateMCPServer, deleteMCPServer,
    systemAiModelId, setSystemAiModelId, embeddingModelId, setEmbeddingModelId, fetchSettings,
    workspaces, fetchWorkspaces, addWorkspace, updateWorkspace, deleteWorkspace, activeWorkspaceId, setActiveWorkspaceId
  } = useStore();

  React.useEffect(() => {
    fetchCredentials();
    fetchModels();
    fetchWorkspaces();
    fetchSettings();
  }, [fetchCredentials, fetchModels, fetchWorkspaces, fetchSettings]);

  const [activeTab, setActiveTab] = useState<'credentials' | 'models' | 'tools' | 'mcp' | 'workspaces' | 'knowledge_base'>('credentials');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isMCPModalOpen, setIsMCPModalOpen] = useState(false);
  const [isCustomToolModalOpen, setIsCustomToolModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [newCred, setNewCred] = useState(INITIAL_CREDENTIAL);
  const [newModel, setNewModel] = useState<Omit<ModelConfig, 'id'>>(INITIAL_MODEL);
  const [newMCP, setNewMCP] = useState<Omit<MCPServer, 'id'>>({
    name: '',
    transportType: 'stdio',
    command: '',
    args: [],
    envVars: {},
    url: '',
    headers: {}
  });
  const [newCustomTool, setNewCustomTool] = useState<Omit<CustomTool, 'id'>>({
    name: '',
    description: '',
    code: ''
  });
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    path: ''
  });
  const [mcpArgsString, setMcpArgsString] = useState('');
  const [newEnvVar, setNewEnvVar] = useState({ key: '', value: '' });
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);
  const [editingMCPId, setEditingMCPId] = useState<string | null>(null);
  const [editingCustomToolId, setEditingCustomToolId] = useState<string | null>(null);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'credential' | 'model' | 'tool' | 'mcp' | 'workspace' | null;
    id: string;
    name: string;
  }>({ isOpen: false, type: null, id: '', name: '' });

  const requestDelete = (type: 'credential' | 'model' | 'tool' | 'mcp' | 'workspace', id: string, name: string) => {
    setDeleteConfirm({ isOpen: true, type, id, name });
  };

  const executeDelete = () => {
    const { type, id } = deleteConfirm;
    if (type === 'credential') deleteCredential(id);
    else if (type === 'model') deleteModel(id);
    else if (type === 'tool') deleteCustomTool(id);
    else if (type === 'mcp') deleteMCPServer(id);
    else if (type === 'workspace') deleteWorkspace(id);
    
    setDeleteConfirm({ isOpen: false, type: null, id: '', name: '' });
  };

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddCredential = () => {
    if (newCred.name && (newCred.key || editingCredentialId)) {
      if (editingCredentialId) {
        // If key is empty, it won't be updated on the backend if we use PATCH correctly
        const updateData: any = { ...newCred };
        if (!newCred.key) delete updateData.key;
        updateCredential(editingCredentialId, updateData);
      } else {
        addCredential(newCred);
      }
      setNewCred(INITIAL_CREDENTIAL);
      setEditingCredentialId(null);
      setIsModalOpen(false);
    }
  };

  const handleEditCredential = (cred: any) => {
    setNewCred({
      name: cred.name,
      description: cred.description || '',
      key: '', // Don't show the existing key
      provider: cred.provider || ''
    });
    setEditingCredentialId(cred.id);
    setIsModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  const handleAddModel = () => {
    if (newModel.name && newModel.credentialId) {
      // Limpa valores vazios para serem nulos no backend
      const modelToSave = {
        ...newModel,
        baseUrl: newModel.baseUrl === '' ? null : newModel.baseUrl,
        temperature: (newModel.temperature === undefined || newModel.temperature === null || isNaN(newModel.temperature)) ? null : newModel.temperature,
        maxTokens: (newModel.maxTokens === undefined || newModel.maxTokens === null || isNaN(newModel.maxTokens)) ? null : newModel.maxTokens,
        maxCompletionTokens: (newModel.maxCompletionTokens === undefined || newModel.maxCompletionTokens === null || isNaN(newModel.maxCompletionTokens)) ? null : newModel.maxCompletionTokens,
      };

      if (editingModelId) {
        updateModel(editingModelId, modelToSave);
      } else {
        addModel(modelToSave);
      }
      setNewModel(INITIAL_MODEL);
      setEditingModelId(null);
      setIsModelModalOpen(false);
    }
  };

  const handleEditModel = (model: ModelConfig) => {
    setNewModel({
      name: model.name,
      model_name: model.model_name,
      description: model.description || '',
      credentialId: model.credentialId,
      baseUrl: model.baseUrl === 'default' ? '' : (model.baseUrl || ''),
      temperature: model.temperature,
      maxTokens: model.maxTokens,
      maxCompletionTokens: model.maxCompletionTokens,
      isDefault: model.isDefault,
      model_type: model.model_type || 'GENERATIVE'
    });
    setEditingModelId(model.id);
    setIsModelModalOpen(true);
  };

  const handleEditMCP = (server: MCPServer) => {
    setNewMCP({
      name: server.name,
      transportType: server.transportType || 'stdio',
      command: server.command || '',
      args: server.args || [],
      // For security: populate only the KEY names, not values
      // Empty values signal the backend to keep existing secrets unchanged
      envVars: Object.fromEntries(Object.keys(server.envVars || {}).map(k => [k, ''])),
      url: server.url || '',
      headers: Object.fromEntries(Object.keys(server.headers || {}).map(k => [k, '']))
    });
    setMcpArgsString((server.args || []).join(' '));
    setEditingMCPId(server.id);
    setIsMCPModalOpen(true);
  };

  const handleSaveMCP = () => {
    if (newMCP.name) {
      const serverData = {
        ...newMCP,
        args: newMCP.transportType === 'stdio' ? mcpArgsString.split(/\s+/).filter(a => a.trim() !== '') : []
      };
      
      if (editingMCPId) {
        updateMCPServer(editingMCPId, serverData);
      } else {
        addMCPServer(serverData);
      }
      
      setNewMCP({ 
        name: '', 
        transportType: 'stdio', 
        command: '', 
        args: [], 
        envVars: {}, 
        url: '', 
        headers: {} 
      });
      setMcpArgsString('');
      setEditingMCPId(null);
      setIsMCPModalOpen(false);
    }
  };


  const pythonBoilerplate = `def my_custom_tool(argument: str) -> str:
    """Description of what this tool does."""
    # Your python code here
    return "Success"`;

  const handleEditCustomTool = (tool: CustomTool) => {
    setNewCustomTool({
      name: tool.name,
      description: tool.description,
      code: tool.code
    });
    setEditingCustomToolId(tool.id);
    setIsCustomToolModalOpen(true);
  };

  const handleSaveCustomTool = () => {
    if (newCustomTool.name && newCustomTool.code) {
      if (editingCustomToolId) {
        updateCustomTool(editingCustomToolId, newCustomTool);
      } else {
        addCustomTool(newCustomTool);
      }
      setNewCustomTool({ name: '', description: '', code: '' });
      setEditingCustomToolId(null);
      setIsCustomToolModalOpen(false);
    }
  };

  const handleEditWorkspace = (ws: any) => {
    setNewWorkspace({
      name: ws.name,
      path: ws.path
    });
    setEditingWorkspaceId(ws.id);
    setIsWorkspaceModalOpen(true);
  };

  const handleSaveWorkspace = () => {
    if (newWorkspace.name && newWorkspace.path) {
      if (editingWorkspaceId) {
        updateWorkspace(editingWorkspaceId, newWorkspace);
      } else {
        addWorkspace(newWorkspace);
      }
      setNewWorkspace({ name: '', path: '' });
      setEditingWorkspaceId(null);
      setIsWorkspaceModalOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-brand-bg font-sans transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-card border-r border-brand-border flex flex-col transition-colors">
        <div className="p-6 border-b border-brand-border flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-brand-bg rounded-lg text-brand-muted hover:text-brand-text transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-brand-text">Settings</span>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          <button 
            onClick={() => setActiveTab('credentials')}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTab === 'credentials' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-brand-muted hover:bg-brand-bg hover:text-brand-text'}`}
          >
            <div className="flex items-center gap-3 text-sm font-bold">
              <Key className="w-4 h-4" />
              Credentials
            </div>
            <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'credentials' ? 'rotate-90' : ''}`} />
          </button>

          <button 
            onClick={() => setActiveTab('models')}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTab === 'models' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-brand-muted hover:bg-brand-bg hover:text-brand-text'}`}
          >
            <div className="flex items-center gap-3 text-sm font-bold">
              <Cpu className="w-4 h-4" />
              Models
            </div>
            <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'models' ? 'rotate-90' : ''}`} />
          </button>

          <button 
            onClick={() => setActiveTab('tools')}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTab === 'tools' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-brand-muted hover:bg-brand-bg hover:text-brand-text'}`}
          >
            <div className="flex items-center gap-3 text-sm font-bold">
              <Wrench className="w-4 h-4" />
              Tools
            </div>
            <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'tools' ? 'rotate-90' : ''}`} />
          </button>

          <button 
            onClick={() => setActiveTab('mcp')}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTab === 'mcp' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-brand-muted hover:bg-brand-bg hover:text-brand-text'}`}
          >
            <div className="flex items-center gap-3 text-sm font-bold">
              <Server className="w-4 h-4" />
              MCP Servers
            </div>
            <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'mcp' ? 'rotate-90' : ''}`} />
          </button>

          <button 
            onClick={() => setActiveTab('workspaces')}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTab === 'workspaces' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-brand-muted hover:bg-brand-bg hover:text-brand-text'}`}
          >
            <div className="flex items-center gap-3 text-sm font-bold">
              <FolderOpen className="w-4 h-4" />
              Workspaces
            </div>
            <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'workspaces' ? 'rotate-90' : ''}`} />
          </button>

          <button 
            onClick={() => setActiveTab('knowledge_base')}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTab === 'knowledge_base' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-brand-muted hover:bg-brand-bg hover:text-brand-text'}`}
          >
            <div className="flex items-center gap-3 text-sm font-bold">
              <Database className="w-4 h-4" />
              Knowledge Bases
            </div>
            <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'knowledge_base' ? 'rotate-90' : ''}`} />
          </button>
        </nav>

        <div className="p-4 border-t border-brand-border space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">System AI Configuration</span>
            </div>
            
            <div className="space-y-1.5">
              <label className="px-1 text-[9px] font-bold text-brand-muted uppercase tracking-tight">System LLM (Generative)</label>
              <CustomSelect 
                options={modelConfigs.filter(m => m.model_type !== 'EMBEDDING').map(m => ({ label: m.name, value: m.id }))}
                value={systemAiModelId || ''}
                onChange={(val) => setSystemAiModelId(val)}
                placeholder="Select System LLM..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="px-1 text-[9px] font-bold text-brand-muted uppercase tracking-tight">Embedding Model (RAG)</label>
              <CustomSelect 
                options={[
                  { label: '--- None / Unset ---', value: 'null' },
                  ...modelConfigs.filter(m => m.model_type === 'EMBEDDING').map(m => ({ label: m.name, value: m.id }))
                ]}
                value={embeddingModelId || 'null'}
                onChange={(val) => setEmbeddingModelId(val === 'null' ? null : val)}
                placeholder="Select Embedding..."
              />
            </div>

            <p className="px-1 text-[9px] text-brand-muted leading-tight border-l-2 border-indigo-500/30 pl-3 py-1">
              Used for AI assistance, auto-filling, and vector ingestion.
            </p>
          </div>


          <div className="bg-brand-bg rounded-xl p-4 flex flex-col items-center gap-2 text-center text-[10px] text-brand-muted">
            <ShieldCheck className="w-8 h-8 text-indigo-500 opacity-80" />
            <p>Your credentials stay on your machine (LocalStorage).</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12 bg-brand-bg">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'credentials' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="flex items-center justify-between mb-10">
                <div>
                  <h1 className="text-3xl font-bold text-brand-text tracking-tight mb-2">Credentials</h1>
                  <p className="text-brand-muted text-sm">Manage your API keys for different LLM providers.</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingCredentialId(null);
                    setNewCred(INITIAL_CREDENTIAL);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  New Credential
                </button>
              </header>

              <div className="space-y-4">
                {credentials.length === 0 ? (
                  <div className="py-20 text-center bg-brand-card border border-brand-border border-dashed rounded-3xl">
                    <Key className="w-12 h-12 text-brand-muted mx-auto mb-4 opacity-20" />
                    <p className="text-brand-muted">No credentials found. Create one to get started.</p>
                  </div>
                ) : (
                  credentials.map((cred) => (
                    <div key={cred.id} className="bg-brand-card border border-brand-border rounded-2xl p-6 flex items-center justify-between group hover:shadow-md transition-all">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600">
                          <Key className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-brand-text">{cred.name}</h3>
                          <p className="text-xs text-brand-muted line-clamp-1">{cred.description || 'No description'}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-[10px] text-brand-muted bg-brand-bg px-2 py-0.5 rounded-md">
                              <Calendar className="w-3 h-3" />
                              {formatDate(cred.created_at)}
                            </span>
                            {cred.provider && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                {cred.provider}
                              </span>
                            )}
                            <div className="flex items-center gap-2 text-[11px] font-mono text-indigo-500/70">
                              {showKeys[cred.id] ? cred.key : '••••••••••••••••'}
                              <button onClick={() => toggleShowKey(cred.id)} className="hover:text-indigo-600">
                                {showKeys[cred.id] ? <EyeOff className="w-3 w-3" /> : <Eye className="w-3 w-3" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleEditCredential(cred)}
                          className="p-2 text-brand-muted hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => requestDelete('credential', cred.id, cred.name)}
                          className="p-2 text-brand-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="flex items-center justify-between mb-10">
                <div>
                  <h1 className="text-3xl font-bold text-brand-text tracking-tight mb-2">AI Models</h1>
                  <p className="text-brand-muted text-sm">Configure your specific AI models and parameters.</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingModelId(null);
                    setNewModel(INITIAL_MODEL);
                    setIsModelModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  Add Model
                </button>
              </header>

              <div className="space-y-4">
                {modelConfigs.length === 0 ? (
                  <div className="py-20 text-center bg-brand-card border border-brand-border border-dashed rounded-3xl">
                    <Cpu className="w-12 h-12 text-brand-muted mx-auto mb-4 opacity-20" />
                    <p className="text-brand-muted">No models configured. Add one to use in your workflows.</p>
                  </div>
                ) : (
                  [...modelConfigs].sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1)).map((model) => {
                    const cred = credentials.find(c => c.id === model.credentialId);
                    return (
                      <div key={model.id} className="bg-brand-card border border-brand-border rounded-2xl p-6 flex items-center justify-between group hover:shadow-md transition-all">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-12 h-12 ${model.isDefault ? 'bg-indigo-600 text-white' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'} rounded-xl flex items-center justify-center`}>
                            <Cpu className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-brand-text">{model.name}</h3>
                              <span className="text-[10px] font-mono text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded">
                                {model.model_name}
                              </span>
                              {model.isDefault && (
                                <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">Default</span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                model.model_type === 'EMBEDDING' 
                                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' 
                                  : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600'
                              }`}>
                                {model.model_type || 'GENERATIVE'}
                              </span>
                            </div>
                            <p className="text-xs text-brand-muted line-clamp-1">{model.description || 'No description'}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {cred && (
                                <span className="text-[10px] font-bold text-brand-muted bg-brand-bg border border-brand-border px-2 py-0.5 rounded-md uppercase">
                                  {cred.provider || 'unknown'}
                                </span>
                              )}
                              <span className="text-[10px] text-brand-muted bg-brand-bg px-2 py-0.5 rounded-md">
                                Temp: {model.temperature}
                              </span>
                              <span className="text-[10px] text-brand-muted bg-brand-bg px-2 py-0.5 rounded-md">
                                Max Tokens: {model.maxTokens}
                              </span>
                              {model.baseUrl !== 'default' && (
                                <span className="text-[10px] text-brand-muted bg-brand-bg px-2 py-0.5 rounded-md truncate max-w-[150px]">
                                  URL: {model.baseUrl}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {!model.isDefault && (
                            <button 
                              onClick={() => setDefaultModelConfig(model.id)}
                              className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 py-1.5 rounded-lg transition-all"
                            >
                              Make Default
                            </button>
                          )}
                          <button 
                            onClick={() => handleEditModel(model)}
                            className="p-2 text-brand-muted hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => duplicateModel(model.id)}
                            className="p-2 text-brand-muted hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => requestDelete('model', model.id, model.name)}
                            className="p-2 text-brand-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="flex items-center justify-between mb-10">
                <div>
                  <h1 className="text-3xl font-bold text-brand-text tracking-tight mb-2">Agent Tools</h1>
                  <p className="text-brand-muted text-sm">Enable and create global capabilities for your crew agents.</p>
                </div>
              </header>

              <div className="space-y-12">
                {/* Default Tools Section */}
                <section className="space-y-12">
                  {Object.entries(
                    globalTools.reduce((acc, tool) => {
                      const category = tool.category || 'Other';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(tool);
                      return acc;
                    }, {} as Record<string, typeof globalTools>)
                  ).sort(([catA], [catB]) => {
                    // Place Files & Documents first
                    if (catA === 'Files & Documents') return -1;
                    if (catB === 'Files & Documents') return 1;
                    return catA.localeCompare(catB);
                  }).map(([category, tools]) => (
                    <div key={category} className="space-y-6">
                      <div className="flex items-center gap-4 mb-6">
                        <div className={`p-2 rounded-lg ${
                          category === 'Files & Documents' ? 'bg-amber-500/10 text-amber-500' :
                          category === 'Search' ? 'bg-blue-500/10 text-blue-500' :
                          category === 'Web' ? 'bg-emerald-500/10 text-emerald-500' :
                          category === 'RAG / DATABASE' ? 'bg-cyan-500/10 text-cyan-500' :
                          'bg-indigo-500/10 text-indigo-500'
                        }`}>
                          {category === 'Search' && <Search className="w-5 h-5" />}
                          {category === 'Web' && <Sparkles className="w-5 h-5" />}
                          {category === 'Files & Documents' && <FileCode className="w-5 h-5" />}
                          {category === 'RAG / DATABASE' && <Database className="w-5 h-5" />}
                          {category === 'Other' && <Wrench className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <h2 className="text-lg font-bold text-brand-text tracking-tight uppercase">
                            {category}
                          </h2>
                          <div className="h-px bg-gradient-to-r from-brand-border via-brand-border/20 to-transparent mt-1" />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-6">
                        {tools.map((tool) => (
                          <div key={tool.id} className={`bg-brand-card border rounded-2xl p-6 transition-all duration-300 ${tool.isEnabled ? 'border-indigo-500/30 shadow-lg shadow-indigo-500/5' : 'border-brand-border'}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${tool.isEnabled ? 'bg-indigo-600 text-white' : 'bg-brand-bg text-brand-muted'}`}>
                                  {tool.id === 'serper' && <Search className="w-5 h-5" />}
                                  {tool.id === 'scrape' && <Sparkles className="w-5 h-5" />}
                                  {tool.id === 'ocr' && <Eye className="w-5 h-5" />}
                                  {tool.id === 'search_knowledge_base' && <Database className="w-5 h-5" />}
                                  {tool.category === 'Files & Documents' && (
                                    tool.id.includes('search') ? <Search className="w-5 h-5" /> : 
                                    tool.id.includes('write') ? <Edit className="w-5 h-5" /> :
                                    tool.id.includes('mdx') ? <Layout className="w-5 h-5" /> :
                                    tool.id.includes('txt') ? <Type className="w-5 h-5" /> :
                                    <FileCode className="w-5 h-5" />
                                  )}
                                  {!(['serper', 'scrape', 'ocr', 'search_knowledge_base'].includes(tool.id) || tool.category === 'Files & Documents' || tool.category === 'RAG / DATABASE') && <Wrench className="w-5 h-5" />}
                                  {tool.category === 'RAG / DATABASE' && tool.id !== 'search_knowledge_base' && <Database className="w-5 h-5" />}
                                </div>
                                <div>
                                  <h3 className="font-bold text-brand-text flex items-center gap-2">
                                    {tool.name}
                                    {tool.isEnabled && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    )}
                                  </h3>
                                  <p className="text-xs text-brand-muted">{tool.description}</p>
                                </div>
                              </div>
                              
                              <button
                                onClick={() => updateToolConfig(tool.id, { isEnabled: !tool.isEnabled })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                  tool.isEnabled ? 'bg-indigo-600' : 'bg-brand-bg border border-brand-border'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    tool.isEnabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

                            {tool.isEnabled && tool.requiresKey && (
                              <div className="mt-6 pt-6 border-t border-brand-border animate-in slide-in-from-top-2 duration-300">
                                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">API Key</label>
                                <div className="relative max-w-md">
                                  <input 
                                    type={showKeys[tool.id] ? 'text' : 'password'}
                                    placeholder="Enter Serper API Key..."
                                    className="w-full bg-brand-bg border border-brand-border rounded-xl pl-4 pr-16 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-mono text-sm"
                                    value={tool.apiKey || ''}
                                    onChange={(e) => updateToolConfig(tool.id, { apiKey: e.target.value })}
                                  />
                                  <button 
                                    onClick={() => toggleShowKey(tool.id)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                                  >
                                    {showKeys[tool.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                                <p className="mt-2 text-[10px] text-brand-muted">
                                  Used for Google Search results. Get yours at <a href="https://serper.dev" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">serper.dev</a>
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>

                {/* Custom Tools Section */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-bold text-brand-muted uppercase tracking-[0.2em] flex items-center gap-2">
                      <Code className="w-4 h-4 opacity-50" />
                      Custom Python Tools
                    </h2>
                    <button 
                      onClick={() => {
                        setEditingCustomToolId(null);
                        setNewCustomTool({ name: '', description: '', code: pythonBoilerplate });
                        setIsCustomToolModalOpen(true);
                      }}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      New Custom Tool
                    </button>
                  </div>

                  <div className="space-y-4">
                    {customTools.length === 0 ? (
                      <div className="py-16 text-center bg-brand-card border border-brand-border border-dashed rounded-3xl">
                        <Terminal className="w-10 h-10 text-brand-muted mx-auto mb-3 opacity-20" />
                        <p className="text-sm text-brand-muted">No custom tools found. Create one with Python.</p>
                      </div>
                    ) : (
                      customTools.map((tool) => (
                        <div key={tool.id} className="bg-brand-card border border-brand-border rounded-2xl p-6 flex items-center justify-between group hover:shadow-md transition-all">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl flex items-center justify-center text-emerald-600">
                              <Code className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-brand-text">{tool.name}</h3>
                              <p className="text-xs text-brand-muted line-clamp-1">{tool.description}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-mono text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                                  <FileCode className="w-3 h-3" />
                                  Python Script
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleEditCustomTool(tool)}
                              className="p-2 text-brand-muted hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => requestDelete('tool', tool.id, tool.name)}
                              className="p-2 text-brand-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'mcp' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="flex items-center justify-between mb-10">
                <div>
                  <h1 className="text-3xl font-bold text-brand-text tracking-tight mb-2">MCP Servers</h1>
                  <p className="text-brand-muted text-sm">Connect external Model Context Protocol servers.</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingMCPId(null);
                    setNewMCP({ 
                      name: '', 
                      transportType: 'stdio', 
                      command: '', 
                      args: [], 
                      envVars: {}, 
                      url: '', 
                      headers: {} 
                    });
                    setMcpArgsString('');
                    setIsMCPModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  New MCP Server
                </button>
              </header>

              <div className="space-y-4">
                {mcpServers.length === 0 ? (
                  <div className="py-20 text-center bg-brand-card border border-brand-border border-dashed rounded-3xl">
                    <Server className="w-12 h-12 text-brand-muted mx-auto mb-4 opacity-20" />
                    <p className="text-brand-muted">No MCP servers configured yet.</p>
                  </div>
                ) : (
                  mcpServers.map((server) => (
                    <div key={server.id} className="bg-brand-card border border-brand-border rounded-2xl p-6 flex items-center justify-between group hover:shadow-md transition-all">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600">
                          <Network className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-brand-text">{server.name}</h3>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                              server.transportType === 'sse' 
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' 
                                : server.transportType === 'streamable-http'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                                : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'
                            }`}>
                              {server.transportType === 'streamable-http' ? 'HTTP' : (server.transportType || 'stdio')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {(server.transportType === 'sse' || server.transportType === 'streamable-http') ? (
                              <span className={`flex items-center gap-1.5 text-[10px] font-mono bg-brand-bg border border-brand-border px-2 py-0.5 rounded-md truncate max-w-[200px] ${server.transportType === 'sse' ? 'text-emerald-500' : 'text-blue-500'}`}>
                                <Server className="w-3 h-3" />
                                {server.url}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-500 bg-brand-bg border border-brand-border px-2 py-0.5 rounded-md">
                                <Settings2 className="w-3 h-3" />
                                {server.command}
                                {server.args && server.args.length > 0 && ` ${server.args.join(' ')}`.slice(0, 30) + (server.args.join(' ').length > 30 ? '...' : '')}
                              </span>
                            )}
                            
                            {(server.transportType === 'sse' || server.transportType === 'streamable-http') ? (
                              Object.keys(server.headers || {}).length > 0 && (
                                <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-bold ${server.transportType === 'sse' ? 'text-emerald-500 bg-emerald-500/10' : 'text-blue-500 bg-blue-500/10'}`}>
                                  {Object.keys(server.headers || {}).length} headers
                                </span>
                              )
                            ) : (
                              Object.keys(server.envVars || {}).length > 0 && (
                                <span className="flex items-center gap-1 text-[10px] text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md font-bold">
                                  {Object.keys(server.envVars || {}).length} env vars
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleEditMCP(server)}
                          className="p-2 text-brand-muted hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                        >
                          <Settings2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => requestDelete('mcp', server.id, server.name)}
                          className="p-2 text-brand-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'workspaces' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="flex items-center justify-between mb-10">
                <div>
                  <h1 className="text-3xl font-bold text-brand-text tracking-tight mb-2">Workspaces</h1>
                  <p className="text-brand-muted text-sm">Define directories for agents to interact with files.</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingWorkspaceId(null);
                    setNewWorkspace({ name: '', path: '' });
                    setIsWorkspaceModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  New Workspace
                </button>
              </header>

              <div className="space-y-4">
                {workspaces.length === 0 ? (
                  <div className="py-20 text-center bg-brand-card border border-brand-border border-dashed rounded-3xl">
                    <FolderOpen className="w-12 h-12 text-brand-muted mx-auto mb-4 opacity-20" />
                    <p className="text-brand-muted">No workspaces configured. Add one to enable file operations.</p>
                  </div>
                ) : (
                  workspaces.map((ws) => (
                    <div key={ws.id} className="bg-brand-card border border-brand-border rounded-2xl p-6 flex items-center justify-between group hover:shadow-md transition-all">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 ${activeWorkspaceId === ws.id ? 'bg-indigo-600 text-white' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'} rounded-xl flex items-center justify-center`}>
                          <FolderOpen className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-brand-text">{ws.name}</h3>
                            {activeWorkspaceId === ws.id && (
                              <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">Active</span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-brand-muted mt-1 bg-brand-bg px-2 py-1 rounded w-fit">{ws.path}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        {activeWorkspaceId !== ws.id && (
                          <button 
                            onClick={() => setActiveWorkspaceId(ws.id)}
                            className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 py-1.5 rounded-lg transition-all"
                          >
                            Set Active
                          </button>
                        )}
                        <button 
                          onClick={() => handleEditWorkspace(ws)}
                          className="p-2 text-brand-muted hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => requestDelete('workspace', ws.id, ws.name)}
                          className="p-2 text-brand-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'knowledge_base' && (
            <KnowledgeBaseSettings />
          )}
        </div>
      </main>

      {/* Modal - New Credential */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); setEditingCredentialId(null); setNewCred(INITIAL_CREDENTIAL); }} />
          <div className="relative w-full max-w-md bg-brand-card border border-brand-border rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-brand-text">{editingCredentialId ? 'Edit Credential' : 'Add New Credential'}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingCredentialId(null); setNewCred(INITIAL_CREDENTIAL); }} className="p-2 hover:bg-brand-bg rounded-full text-brand-muted transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Name</label>
                <input 
                  autoFocus
                  placeholder="e.g. OpenAI Production"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium"
                  value={newCred.name}
                  onChange={(e) => setNewCred({...newCred, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Description</label>
                <input 
                  placeholder="Short description of this key"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm"
                  value={newCred.description}
                  onChange={(e) => setNewCred({...newCred, description: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">API Key</label>
                <div className="relative">
                  <input 
                    type={showKeys['new'] ? 'text' : 'password'}
                    placeholder={editingCredentialId ? 'Leave empty to keep existing key...' : 'sk-...'}
                    className="w-full bg-brand-bg border border-brand-border rounded-xl pl-4 pr-16 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-mono"
                    value={newCred.key}
                    onChange={(e) => setNewCred({...newCred, key: e.target.value})}
                  />
                  <button 
                    onClick={() => toggleShowKey('new')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                  >
                    {showKeys['new'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Provider</label>
                <CustomSelect 
                  placeholder="Select a provider..."
                  value={newCred.provider}
                  onChange={(val) => setNewCred({...newCred, provider: val})}
                  options={[
                    { label: 'OpenAI', value: 'openai' },
                    { label: 'Anthropic', value: 'anthropic' },
                    { label: 'Google Gemini', value: 'google' },
                    { label: 'Groq', value: 'groq' },
                    { label: 'Cohere', value: 'cohere' },
                    { label: 'Mistral AI', value: 'mistral' },
                    { label: 'Local (Ollama/LM Studio)', value: 'local' },
                    { label: 'Other', value: 'other' },
                  ]}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => { setIsModalOpen(false); setEditingCredentialId(null); setNewCred(INITIAL_CREDENTIAL); }}
                  className="flex-1 py-3 bg-brand-bg border border-brand-border text-brand-text rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={!newCred.name || (!newCred.key && !editingCredentialId)}
                  onClick={handleAddCredential}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingCredentialId ? 'Update Credential' : 'Save Credential'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - New Model */}
      {isModelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setIsModelModalOpen(false); setEditingModelId(null); setNewModel(INITIAL_MODEL); }} />
          <div className="relative w-full max-w-xl bg-brand-card border border-brand-border rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-brand-text">{editingModelId ? 'Edit AI Model' : 'Configure AI Model'}</h2>
                <p className="text-xs text-brand-muted mt-1">Set up specific parameters for your LLM.</p>
              </div>
              <button onClick={() => { setIsModelModalOpen(false); setEditingModelId(null); setNewModel(INITIAL_MODEL); }} className="p-2 hover:bg-brand-bg rounded-full text-brand-muted transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2 text-indigo-500">Display Name</label>
                <input 
                  autoFocus
                  placeholder="e.g. GPT-4o Production"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-bold"
                  value={newModel.name}
                  onChange={(e) => setNewModel({...newModel, name: e.target.value})}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Model Name (ID)</label>
                <input 
                  placeholder="e.g. gpt-4o or claude-3-5-sonnet"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-mono"
                  value={newModel.model_name}
                  onChange={(e) => setNewModel({...newModel, model_name: e.target.value})}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Description</label>
                <input 
                  placeholder="Brief notes about this configuration"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm"
                  value={newModel.description}
                  onChange={(e) => setNewModel({...newModel, description: e.target.value})}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2 text-indigo-500">Model Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setNewModel({...newModel, model_type: 'GENERATIVE'})}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${newModel.model_type === 'GENERATIVE' ? 'bg-indigo-600/10 border-indigo-600 text-indigo-600 shadow-lg shadow-indigo-600/10' : 'bg-brand-bg border-brand-border text-brand-muted hover:border-brand-text'}`}
                  >
                    <Sparkles className="w-5 h-5" />
                    <span className="text-xs font-bold">Generative (Chat)</span>
                  </button>
                  <button 
                    onClick={() => setNewModel({...newModel, model_type: 'EMBEDDING'})}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${newModel.model_type === 'EMBEDDING' ? 'bg-emerald-600/10 border-emerald-600 text-emerald-600 shadow-lg shadow-emerald-600/10' : 'bg-brand-bg border-brand-border text-brand-muted hover:border-brand-text'}`}
                  >
                    <Database className="w-5 h-5" />
                    <span className="text-xs font-bold">Embedding (RAG)</span>
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Credential / Provider</label>
                <CustomSelect 
                  placeholder="Select a credential..."
                  value={newModel.credentialId}
                  onChange={(val) => setNewModel({...newModel, credentialId: val})}
                  options={credentials.map(c => ({
                    label: `${c.name} (${c.provider})`,
                    value: c.id
                  }))}
                />
                {credentials.length === 0 && (
                  <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-widest">No credentials found! Create one first.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Base URL</label>
                <input 
                  placeholder="Leave empty for default"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-mono"
                  value={newModel.baseUrl || ''}
                  onChange={(e) => setNewModel({...newModel, baseUrl: e.target.value})}
                />
              </div>

              {newModel.model_type === 'GENERATIVE' && (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider">Temperature</label>
                      <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                        {newModel.temperature !== undefined && newModel.temperature !== null ? newModel.temperature : 'Provider Default'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        className="flex-1 h-2 bg-brand-bg border border-brand-border rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
                        value={newModel.temperature ?? 0.7}
                        onChange={(e) => setNewModel({...newModel, temperature: parseFloat(e.target.value)})}
                      />
                      {newModel.temperature !== undefined && newModel.temperature !== null && (
                        <button 
                          onClick={() => setNewModel({...newModel, temperature: null})}
                          className="mt-2 text-[10px] uppercase font-bold text-brand-muted hover:text-red-500 transition-colors"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Max Tokens</label>
                    <input 
                      type="number"
                      placeholder="Provider Default"
                      className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm"
                      value={newModel.maxTokens ?? ''}
                      onChange={(e) => setNewModel({...newModel, maxTokens: e.target.value === '' ? null : parseInt(e.target.value)})}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Max Completion Tokens</label>
                    <input 
                      type="number"
                      placeholder="Provider Default"
                      className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm"
                      value={newModel.maxCompletionTokens ?? ''}
                      onChange={(e) => setNewModel({...newModel, maxCompletionTokens: e.target.value === '' ? null : parseInt(e.target.value)})}
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <label className="flex items-center gap-3 p-4 bg-brand-bg border border-brand-border rounded-2xl cursor-pointer hover:bg-brand-bg/50 hover:text-indigo-600 hover:border-indigo-600/30 transition-all">
                  <input 
                    type="checkbox"
                    className="w-5 h-5 rounded border-brand-border text-indigo-600 focus:ring-indigo-600"
                    checked={newModel.isDefault}
                    onChange={(e) => setNewModel({...newModel, isDefault: e.target.checked})}
                  />
                  <span className="text-sm font-bold text-brand-text">Set as Default AI Model</span>
                </label>
              </div>

              <div className="md:col-span-2 pt-6 flex gap-4 border-t border-brand-border mt-4">
                <button 
                  onClick={() => { setIsModelModalOpen(false); setEditingModelId(null); setNewModel(INITIAL_MODEL); }}
                  className="flex-1 py-3 bg-brand-bg border border-brand-border text-brand-text rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={!newModel.name || !newModel.credentialId}
                  onClick={handleAddModel}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingModelId ? 'Update Model' : 'Save Model'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - MCP Server */}
      {isMCPModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMCPModalOpen(false)} />
          <div className="relative w-full max-w-xl bg-brand-card border border-brand-border rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-brand-text">{editingMCPId ? 'Edit MCP Server' : 'Add MCP Server'}</h2>
                <p className="text-xs text-brand-muted mt-1">Configure external Model Context Protocol integration.</p>
              </div>
              <button onClick={() => setIsMCPModalOpen(false)} className="p-2 hover:bg-brand-bg rounded-full text-brand-muted transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2 text-indigo-500">Server Name</label>
                  <input 
                    autoFocus
                    placeholder="e.g. SQLite Tool Server"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-bold"
                    value={newMCP.name}
                    onChange={(e) => setNewMCP({...newMCP, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2 text-indigo-500">Transport Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => setNewMCP({ ...newMCP, transportType: 'stdio' })}
                      className={`py-3 rounded-xl text-[10px] font-bold border transition-all ${
                        newMCP.transportType === 'stdio' 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' 
                          : 'bg-brand-bg border-brand-border text-brand-muted hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      Stdio (Local)
                    </button>
                    <button 
                      onClick={() => setNewMCP({ ...newMCP, transportType: 'sse' })}
                      className={`py-3 rounded-xl text-[10px] font-bold border transition-all ${
                        newMCP.transportType === 'sse' 
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20' 
                          : 'bg-brand-bg border-brand-border text-brand-muted hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      SSE (Remote)
                    </button>
                    <button 
                      onClick={() => setNewMCP({ ...newMCP, transportType: 'streamable-http' })}
                      className={`py-3 rounded-xl text-[10px] font-bold border transition-all ${
                        newMCP.transportType === 'streamable-http' 
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' 
                          : 'bg-brand-bg border-brand-border text-brand-muted hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      HTTP (CrewAI)
                    </button>
                  </div>
                </div>
              </div>

              {(newMCP.transportType === 'sse' || newMCP.transportType === 'streamable-http') ? (
                <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                  <div>
                    <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Server URL</label>
                    <input 
                      placeholder="e.g. http://localhost:8000/sse"
                      className={`w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 transition-all font-mono text-sm ${newMCP.transportType === 'sse' ? 'focus:ring-emerald-600' : 'focus:ring-blue-600'}`}
                      value={newMCP.url || ''}
                      onChange={(e) => setNewMCP({...newMCP, url: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Hash className="w-3 h-3" />
                      Headers / Auth Tokens
                    </label>
                    <div className="space-y-3 bg-brand-bg/50 p-4 rounded-2xl border border-brand-border border-dashed">
                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          placeholder="HEADER-NAME"
                          className={`bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none focus:ring-1 ${newMCP.transportType === 'sse' ? 'focus:ring-emerald-600' : 'focus:ring-blue-600'}`}
                          value={newEnvVar.key}
                          onChange={(e) => setNewEnvVar({ ...newEnvVar, key: e.target.value.toUpperCase() })}
                        />
                        <div className="flex gap-2">
                          <input 
                            placeholder={editingMCPId ? 'Leave empty to keep existing value' : 'Value'}
                            className={`flex-1 bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none focus:ring-1 ${newMCP.transportType === 'sse' ? 'focus:ring-emerald-600' : 'focus:ring-blue-600'}`}
                            value={newEnvVar.value}
                            onChange={(e) => setNewEnvVar({ ...newEnvVar, value: e.target.value })}
                          />
                          <button 
                            onClick={() => {
                              // Allow empty value in edit mode (signals "keep existing secret")
                              if (newEnvVar.key && (newEnvVar.value || editingMCPId)) {
                                setNewMCP({
                                  ...newMCP,
                                  headers: { ...(newMCP.headers || {}), [newEnvVar.key]: newEnvVar.value }
                                });
                                setNewEnvVar({ key: '', value: '' });
                              }
                            }}
                            className={`p-2 rounded-lg text-white transition-colors ${newMCP.transportType === 'sse' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        {Object.entries(newMCP.headers || {}).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2 bg-brand-card border border-brand-border rounded-lg px-2 py-1.5 animate-in zoom-in-95 duration-200">
                            <span className={`text-[10px] font-bold ${newMCP.transportType === 'sse' ? 'text-emerald-500' : 'text-blue-500'}`}>{key}</span>
                            <span className="text-brand-muted opacity-30">|</span>
                            {/* Always show masked value — real value stays in DB */}
                            <span className="text-[10px] text-brand-muted font-mono">{value ? value : '••••••••'}</span>
                            <button 
                              onClick={() => {
                                const newHeaders = { ...(newMCP.headers || {}) };
                                delete newHeaders[key];
                                setNewMCP({ ...newMCP, headers: newHeaders });
                              }}
                              className="text-brand-muted hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {Object.keys(newMCP.headers || {}).length === 0 && (
                          <p className="text-[10px] text-brand-muted italic w-full text-center">No headers added.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Command</label>
                      <input 
                        placeholder="e.g. npx or python"
                        className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-mono"
                        value={newMCP.command || ''}
                        onChange={(e) => setNewMCP({...newMCP, command: e.target.value})}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Arguments (separated by space)</label>
                      <textarea 
                        placeholder="e.g. -y @modelcontextprotocol/server-sqlite --db path/to/db"
                        className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-mono min-h-[80px]"
                        value={mcpArgsString}
                        onChange={(e) => setMcpArgsString(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Settings2 className="w-3 h-3" />
                      Environment Variables
                    </label>
                    <div className="space-y-3 bg-brand-bg/50 p-4 rounded-2xl border border-brand-border border-dashed">
                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          placeholder="KEY"
                          className="bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none focus:ring-1 focus:ring-indigo-600"
                          value={newEnvVar.key}
                          onChange={(e) => setNewEnvVar({ ...newEnvVar, key: e.target.value.toUpperCase() })}
                        />
                        <div className="flex gap-2">
                          <input 
                            placeholder={editingMCPId ? 'Leave empty to keep existing value' : 'VALUE'}
                            className="flex-1 bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none focus:ring-1 focus:ring-indigo-600"
                            value={newEnvVar.value}
                            onChange={(e) => setNewEnvVar({ ...newEnvVar, value: e.target.value })}
                          />
                          <button 
                            onClick={() => {
                              if (newEnvVar.key && newEnvVar.value) {
                                setNewMCP({
                                  ...newMCP,
                                  envVars: { ...(newMCP.envVars || {}), [newEnvVar.key]: newEnvVar.value }
                                });
                                setNewEnvVar({ key: '', value: '' });
                              }
                            }}
                            className="bg-indigo-600 p-2 rounded-lg text-white hover:bg-indigo-700 transition-colors"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        {Object.entries(newMCP.envVars || {}).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2 bg-brand-card border border-brand-border rounded-lg px-2 py-1.5 animate-in zoom-in-95 duration-200">
                            <span className="text-[10px] font-bold text-indigo-500">{key}</span>
                            <span className="text-brand-muted opacity-30">|</span>
                            {/* Always show masked value — real value stays in DB */}
                            <span className="text-[10px] text-brand-muted font-mono">{value ? value : '••••••••'}</span>
                            <button 
                              onClick={() => {
                                const newEnv = { ...(newMCP.envVars || {}) };
                                delete newEnv[key];
                                setNewMCP({ ...newMCP, envVars: newEnv });
                              }}
                              className="text-brand-muted hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {Object.keys(newMCP.envVars || {}).length === 0 && (
                          <p className="text-[10px] text-brand-muted italic w-full text-center">No environment variables added.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6 flex gap-4 border-t border-brand-border">
                <button 
                  onClick={() => setIsMCPModalOpen(false)}
                  className="flex-1 py-3 bg-brand-bg border border-brand-border text-brand-text rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={!newMCP.name || (newMCP.transportType === 'stdio' ? !newMCP.command : !newMCP.url)}
                  onClick={handleSaveMCP}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingMCPId ? 'Update Server' : 'Save Server'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Custom Python Tool */}
      {isCustomToolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCustomToolModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-brand-card border border-brand-border rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[95vh]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl flex items-center justify-center text-emerald-600">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-brand-text">{editingCustomToolId ? 'Edit Custom Tool' : 'Create Custom Tool'}</h2>
                  <p className="text-xs text-brand-muted mt-1">Write your own agent logic in Python.</p>
                </div>
              </div>
              <button onClick={() => setIsCustomToolModalOpen(false)} className="p-2 hover:bg-brand-bg rounded-full text-brand-muted transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2 text-indigo-500">Tool Name</label>
                  <input 
                    autoFocus
                    placeholder="e.g. My Website Analyzer"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-bold"
                    value={newCustomTool.name}
                    onChange={(e) => setNewCustomTool({...newCustomTool, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2 text-indigo-500">Short Description</label>
                  <input 
                    placeholder="Briefly describe what this tool does..."
                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                    value={newCustomTool.description}
                    onChange={(e) => setNewCustomTool({...newCustomTool, description: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Python Script (CrewAI @tool pattern)</span>
                  <span className="text-[10px] text-brand-muted">Uses Python 3.12</span>
                </label>
                <div className="relative group">
                  <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-20 z-20 group-hover:opacity-40 transition-opacity">
                    <FileCode className="w-8 h-8 text-emerald-500" />
                  </div>
                  <HighlightedTextField
                    type="textarea"
                    language="python"
                    placeholder="def my_tool(arg: str): ..."
                    className="min-h-[450px]"
                    rows={15}
                    value={newCustomTool.code}
                    onChange={(e) => setNewCustomTool({...newCustomTool, code: e.target.value})}
                  />
                </div>
                <p className="mt-3 text-[10px] text-brand-muted flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-brand-accent" />
                  Tip: The LLM uses the function docstring to understand when to call the tool.
                </p>
              </div>

              <div className="pt-6 flex gap-4 border-t border-brand-border">
                <button 
                  onClick={() => setIsCustomToolModalOpen(false)}
                  className="flex-1 py-3 bg-brand-bg border border-brand-border text-brand-text rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={!newCustomTool.name || !newCustomTool.code}
                  onClick={handleSaveCustomTool}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingCustomToolId ? 'Update Tool' : 'Save Tool'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal - Workspace */}
      {isWorkspaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsWorkspaceModalOpen(false)} />
          <div className="relative w-full max-w-md bg-brand-card border border-brand-border rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-brand-text">{editingWorkspaceId ? 'Edit Workspace' : 'Add New Workspace'}</h2>
              <button onClick={() => setIsWorkspaceModalOpen(false)} className="p-2 hover:bg-brand-bg rounded-full text-brand-muted transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Workspace Name</label>
                <input 
                  autoFocus
                  placeholder="e.g. My Project Files"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium"
                  value={newWorkspace.name}
                  onChange={(e) => setNewWorkspace({...newWorkspace, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Workspace Folder Name</label>
                <div className="flex items-center">
                  <div className="bg-brand-bg border border-brand-border border-r-0 rounded-l-xl px-4 py-3 text-brand-muted font-mono text-sm">
                    workspaces/
                  </div>
                  <input 
                    placeholder="e.g. project-x"
                    className="flex-1 bg-brand-bg border border-brand-border rounded-r-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-mono text-sm"
                    value={newWorkspace.path.replace('workspaces/', '')}
                    onChange={(e) => {
                      const val = e.target.value.replace('workspaces/', '').replace(/^[./\\]+/, '');
                      setNewWorkspace({...newWorkspace, path: val})
                    }}
                  />
                </div>
                <p className="mt-2 text-[10px] text-brand-muted italic">
                  The folder will be automatically created inside the <strong>workspaces/</strong> directory of the backend.
                </p>
              </div>

              <div className="pt-6 flex gap-4">
                <button 
                  onClick={() => setIsWorkspaceModalOpen(false)}
                  className="flex-1 py-3 bg-brand-bg border border-brand-border text-brand-text rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={!newWorkspace.name || !newWorkspace.path}
                  onClick={handleSaveWorkspace}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {editingWorkspaceId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal 
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
        onConfirm={executeDelete}
        title={`Delete ${deleteConfirm.type?.charAt(0).toUpperCase()}${deleteConfirm.type?.slice(1)}`}
        message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
        confirmText="Delete Permanently"
        variant="danger"
        icon={<Trash2 className="w-6 h-6" />}
      />
    </div>
  );
};

export default SettingsPage;
