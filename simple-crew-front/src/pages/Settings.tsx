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
  ChevronDown,
  ShieldCheck,
  X,
  Copy
} from 'lucide-react';
import { useStore } from '../store';
import { type ModelConfig } from '../types';

interface CustomSelectProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const CustomSelect = ({ options, value, onChange, placeholder, className }: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-brand-bg border border-brand-border rounded-2xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-medium flex items-center justify-between text-left"
      >
        <span className={!selectedOption ? 'text-brand-muted' : ''}>
          {selectedOption ? selectedOption.label : (placeholder || 'Select...')}
        </span>
        <ChevronDown className={`w-4 h-4 text-brand-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full bg-brand-card border border-brand-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 py-1">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-xs text-brand-muted italic text-center">No options available</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                  value === opt.value 
                    ? 'bg-indigo-600 text-white font-bold' 
                    : 'text-brand-text hover:bg-brand-bg hover:text-indigo-600'
                }`}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const { 
    credentials, addCredential, deleteCredential, fetchCredentials,
    models: modelConfigs, addModel, updateModel, deleteModel, setDefaultModelConfig, fetchModels, duplicateModel
  } = useStore();

  React.useEffect(() => {
    fetchCredentials();
    fetchModels();
  }, [fetchCredentials, fetchModels]);

  const [activeTab, setActiveTab] = useState<'credentials' | 'models'>('credentials');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [newCred, setNewCred] = useState({ name: '', description: '', key: '', provider: '' });
  const [newModel, setNewModel] = useState({ 
    name: '', 
    model_name: '',
    description: '', 
    credentialId: '', 
    baseUrl: 'default', 
    temperature: 0.7, 
    maxTokens: 4096, 
    maxCompletionTokens: 2048, 
    isDefault: false 
  });
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddCredential = () => {
    if (newCred.name && newCred.key) {
      addCredential(newCred);
      setNewCred({ name: '', description: '', key: '', provider: '' });
      setIsModalOpen(false);
    }
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
      if (editingModelId) {
        updateModel(editingModelId, newModel);
      } else {
        addModel(newModel);
      }
      setNewModel({ 
        name: '', 
        model_name: '',
        description: '', 
        credentialId: '', 
        baseUrl: 'default', 
        temperature: 0.7, 
        maxTokens: 4096, 
        maxCompletionTokens: 2048, 
        isDefault: false 
      });
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
      baseUrl: model.baseUrl || 'default',
      temperature: model.temperature ?? 0.7,
      maxTokens: model.maxTokens ?? 4096,
      maxCompletionTokens: model.maxCompletionTokens ?? 2048,
      isDefault: model.isDefault
    });
    setEditingModelId(model.id);
    setIsModelModalOpen(true);
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
        </nav>

        <div className="p-4 border-t border-brand-border">
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
                  onClick={() => setIsModalOpen(true)}
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
                      
                      <button 
                        onClick={() => deleteCredential(cred.id)}
                        className="p-2 text-brand-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
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
                  onClick={() => setIsModelModalOpen(true)}
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
                            onClick={() => deleteModel(model.id)}
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
        </div>
      </main>

      {/* Modal - New Credential */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-brand-card border border-brand-border rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-brand-text">Add New Credential</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-brand-bg rounded-full text-brand-muted transition-colors">
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
                    placeholder="sk-..."
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
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-brand-bg border border-brand-border text-brand-text rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={!newCred.name || !newCred.key}
                  onClick={handleAddCredential}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Credential
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - New Model */}
      {isModelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setIsModelModalOpen(false); setEditingModelId(null); }} />
          <div className="relative w-full max-w-xl bg-brand-card border border-brand-border rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-brand-text">{editingModelId ? 'Edit AI Model' : 'Configure AI Model'}</h2>
                <p className="text-xs text-brand-muted mt-1">Set up specific parameters for your LLM.</p>
              </div>
              <button onClick={() => { setIsModelModalOpen(false); setEditingModelId(null); }} className="p-2 hover:bg-brand-bg rounded-full text-brand-muted transition-colors">
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
                  placeholder="default"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-mono"
                  value={newModel.baseUrl}
                  onChange={(e) => setNewModel({...newModel, baseUrl: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Temperature ({newModel.temperature})</label>
                <input 
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  className="w-full h-2 bg-brand-bg border border-brand-border rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-4"
                  value={newModel.temperature}
                  onChange={(e) => setNewModel({...newModel, temperature: parseFloat(e.target.value)})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Max Tokens</label>
                <input 
                  type="number"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm"
                  value={newModel.maxTokens}
                  onChange={(e) => setNewModel({...newModel, maxTokens: parseInt(e.target.value)})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Max Completion Tokens</label>
                <input 
                  type="number"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all text-sm"
                  value={newModel.maxCompletionTokens}
                  onChange={(e) => setNewModel({...newModel, maxCompletionTokens: parseInt(e.target.value)})}
                />
              </div>

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
                  onClick={() => { setIsModelModalOpen(false); setEditingModelId(null); }}
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
    </div>
  );
};

export default SettingsPage;
