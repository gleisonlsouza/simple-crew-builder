import React, { useState, memo } from 'react';
import { X, Plus, Cpu, Sparkles, Settings, Code, FileText, Calendar, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import HighlightedTextField from '../HighlightedTextField';
import { SortableItem } from './SortableItem';
import type { AgentNodeData, TaskNodeData, AppNode } from '../../types/nodes.types';
import type { ModelConfig, ToolConfig, CustomTool, MCPServer } from '../../types/config.types';

interface AgentFormProps {
  data: AgentNodeData;
  nodeId: string;
  updateNodeData: (id: string, data: Partial<AgentNodeData>) => void;
  models: ModelConfig[];
  mcpServers: MCPServer[];
  globalTools: ToolConfig[];
  customTools: CustomTool[];
  loadingFields: Record<string, boolean>;
  onAiSuggest: (field: string) => void;
  onFieldKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }, field: string, updateFn: (val: string) => void) => void;
  isMcpSelectorOpen: boolean;
  setIsMcpSelectorOpen: (open: boolean) => void;
  isGlobalToolSelectorOpen: boolean;
  setIsGlobalToolSelectorOpen: (open: boolean) => void;
  isCustomToolSelectorOpen: boolean;
  setIsCustomToolSelectorOpen: (open: boolean) => void;
  setToolToConfigure: (tool: ToolConfig | null) => void;
  setIsToolConfigModalOpen: (open: boolean) => void;
  renderableTasks: AppNode[];
  handleTaskDragEnd: (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
}

export const AgentForm: React.FC<AgentFormProps> = memo(({
  data,
  nodeId,
  updateNodeData,
  models,
  mcpServers,
  globalTools,
  customTools,
  loadingFields,
  onAiSuggest,
  onFieldKeyDown,
  onFieldChange,
  isMcpSelectorOpen,
  setIsMcpSelectorOpen,
  isGlobalToolSelectorOpen,
  setIsGlobalToolSelectorOpen,
  isCustomToolSelectorOpen,
  setIsCustomToolSelectorOpen,
  setToolToConfigure,
  setIsToolConfigModalOpen,
  renderableTasks,
  handleTaskDragEnd,
  sensors
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'llm' | 'tools' | 'execution' | 'templates'>('basic');
  const [expandedTemplates, setExpandedTemplates] = useState<string[]>([]);

  const toggleTemplate = (template: string) => {
    setExpandedTemplates(prev => 
      prev.includes(template) ? prev.filter(t => t !== template) : [...prev, template]
    );
  };

  const isToolDisabled = (toolId: string) => (data.disabledToolIds || []).includes(toolId);

  const toggleToolEnabled = (toolId: string) => {
    const currentDisabled = data.disabledToolIds || [];
    const newDisabled = currentDisabled.includes(toolId)
      ? currentDisabled.filter(id => id !== toolId)
      : [...currentDisabled, toolId];
    updateNodeData(nodeId, { disabledToolIds: newDisabled });
  };

  const renderToggle = (id: string) => (
    <button 
      type="button" 
      onClick={(e) => { e.stopPropagation(); toggleToolEnabled(id); }}
      className={`p-1 rounded transition-colors ${!isToolDisabled(id) ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-brand-muted hover:bg-brand-muted/10'}`}
      title={isToolDisabled(id) ? 'Enable Tool' : 'Disable Tool'}
    >
      {!isToolDisabled(id) ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* -- Basic Settings -- */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-4 bg-brand-bg/20 rounded-xl border border-brand-border/30">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Role</label>
            <button 
              onClick={() => onAiSuggest('role')}
              disabled={loadingFields['role']}
              className={`p-1 transition-all duration-300 ${loadingFields['role'] ? 'animate-sparkle-shimmer cursor-wait' : 'text-brand-muted hover:text-indigo-500'}`}
              title="Generate with AI"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
          <HighlightedTextField
            type="input"
            value={data.role || ''}
            onKeyDown={onFieldKeyDown}
            onChange={(e) => onFieldChange(e, 'role', (val) => updateNodeData(nodeId, { role: val }))}
            placeholder="e.g. Senior Researcher"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Goal</label>
            <button 
              onClick={() => onAiSuggest('goal')}
              disabled={loadingFields['goal']}
              className={`p-1 transition-all duration-300 ${loadingFields['goal'] ? 'animate-sparkle-shimmer cursor-wait' : 'text-brand-muted hover:text-indigo-500'}`}
              title="Generate with AI"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
          <HighlightedTextField
            type="textarea"
            value={data.goal || ''}
            onKeyDown={onFieldKeyDown}
            onChange={(e) => onFieldChange(e, 'goal', (val) => updateNodeData(nodeId, { goal: val }))}
            placeholder="What does this agent need to achieve?"
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Backstory</label>
            <button 
              onClick={() => onAiSuggest('backstory')}
              disabled={loadingFields['backstory']}
              className={`p-1 transition-all duration-300 ${loadingFields['backstory'] ? 'animate-sparkle-shimmer cursor-wait' : 'text-brand-muted hover:text-indigo-500'}`}
              title="Generate with AI"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
          <HighlightedTextField
            type="textarea"
            value={data.backstory || ''}
            onKeyDown={onFieldKeyDown}
            onChange={(e) => onFieldChange(e, 'backstory', (val) => updateNodeData(nodeId, { backstory: val }))}
            placeholder="The agent's background and expertise..."
            rows={4}
          />
        </div>
      </div>

      {/* -- Tabs Navigation -- */}
      <div className="flex flex-wrap items-center gap-1 border-b border-brand-border/50 pb-2">
        {[
          { id: 'llm', label: 'LLM', icon: Cpu },
          { id: 'tools', label: 'Tools', icon: Settings },
          { id: 'execution', label: 'Exec', icon: Code },
          { id: 'templates', label: 'Templates', icon: FileText }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'llm' | 'tools' | 'execution' | 'templates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all mb-1 ${
              activeTab === tab.id 
                ? 'bg-indigo-500/10 text-indigo-500 shadow-sm border border-indigo-500/20' 
                : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg border border-transparent'
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* -- LLM Tab -- */}
      {activeTab === 'llm' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Main Model</label>
            <select 
              value={data.modelId || ''}
              onChange={(e) => updateNodeData(nodeId, { modelId: e.target.value || undefined })}
              className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text scrollbar-none cursor-pointer"
            >
              <option value="">Default ({models.find(m => m.isDefault)?.name || 'Not set'})</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Temperature</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                max="2"
                placeholder="0.7"
                value={data.temperature !== undefined ? data.temperature : ''}
                onChange={(e) => updateNodeData(nodeId, { temperature: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-sm text-brand-text"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Function Calling LLM</label>
              <select 
                value={data.function_calling_llm_id || ''}
                onChange={(e) => updateNodeData(nodeId, { function_calling_llm_id: e.target.value || undefined })}
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-sm text-brand-text"
              >
                <option value="">Default</option>
                {models.map(model => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* -- Tools Tab -- */}
      {activeTab === 'tools' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          {/* Default Tools */}
          <div className="flex flex-col gap-2 group">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Default Tools</label>
              <div className="relative">
                <button 
                  onClick={() => setIsGlobalToolSelectorOpen(true)}
                  className="p-1 hover:bg-brand-bg rounded-full text-indigo-500 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                {isGlobalToolSelectorOpen && (
                  <>
                    <div className="fixed inset-0 z-[55]" onClick={() => setIsGlobalToolSelectorOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-brand-card border border-brand-border rounded-xl shadow-xl z-[60] py-2">
                       <div className="max-h-60 overflow-y-auto px-1 custom-scrollbar">
                        {['Search', 'Web', 'Files & Documents', 'RAG / DATABASE'].map(cat => {
                          const catTools = globalTools.filter(t => t.category === cat && t.isEnabled && !(data.globalToolIds || []).some((e: string | { id: string }) => (typeof e === 'string' ? e : e.id) === t.id));
                          if (catTools.length === 0) return null;
                          return (
                            <div key={cat} className="mb-2 last:mb-0">
                              <div className="px-3 py-1 text-[9px] font-bold text-brand-muted uppercase tracking-widest">{cat}</div>
                              {catTools.map(tool => (
                                <button
                                  key={tool.id}
                                  onClick={() => {
                                    if (tool.user_config_schema) {
                                      setToolToConfigure(tool);
                                      setIsToolConfigModalOpen(true);
                                      setIsGlobalToolSelectorOpen(false);
                                    } else {
                                      updateNodeData(nodeId, { globalToolIds: [...(data.globalToolIds || []), tool.id] });
                                      setIsGlobalToolSelectorOpen(false);
                                    }
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-brand-text hover:bg-brand-bg rounded-lg transition-colors text-left"
                                >
                                  {tool.name}
                                  <Plus className="w-3 h-3 text-brand-muted" />
                                </button>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              {(data.globalToolIds || []).map((entry: string | { id: string }) => {
                const toolId = typeof entry === 'string' ? entry : entry.id;
                const tool = globalTools.find(t => t.id === toolId);
                if (!tool) return null;
                const disabled = isToolDisabled(toolId);
                return (
                  <div key={toolId} className={`flex flex-col gap-1 p-2 rounded-lg border border-brand-border/50 bg-brand-bg/10 ${disabled ? 'opacity-50 grayscale' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {renderToggle(toolId)}
                        <span className="text-xs font-medium text-brand-text">{tool.name}</span>
                      </div>
                      <button onClick={() => updateNodeData(nodeId, { globalToolIds: data.globalToolIds?.filter((e: string | { id: string }) => (typeof e === 'string' ? e : e.id) !== toolId) })} className="p-1 hover:bg-rose-500/10 text-brand-muted hover:text-rose-500 rounded"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MCP Servers */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">MCP Servers</label>
              <div className="relative">
                <button onClick={() => setIsMcpSelectorOpen(true)} className="p-1 hover:bg-brand-bg rounded-full text-indigo-500"><Plus className="w-3.5 h-3.5" /></button>
                {isMcpSelectorOpen && (
                  <>
                    <div className="fixed inset-0 z-[55]" onClick={() => setIsMcpSelectorOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-brand-card border border-brand-border rounded-xl shadow-xl z-[60] py-2">
                       <div className="max-h-48 overflow-y-auto px-1">
                        {mcpServers.filter(s => !(data.mcpServerIds || []).includes(s.id)).map(server => (
                          <button key={server.id} onClick={() => { updateNodeData(nodeId, { mcpServerIds: [...(data.mcpServerIds || []), server.id] }); setIsMcpSelectorOpen(false); }} className="w-full flex items-center justify-between px-3 py-2 text-xs text-brand-text hover:bg-brand-bg rounded-lg">{server.name}<Plus className="w-3 h-3" /></button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {(data.mcpServerIds || []).map((serverId: string) => {
                const server = mcpServers.find(s => s.id === serverId);
                if (!server) return null;
                const disabled = isToolDisabled(serverId);
                return (
                  <div key={serverId} className={`flex items-center justify-between p-2 rounded-lg border border-brand-border/50 bg-brand-bg/10 ${disabled ? 'opacity-50 grayscale' : ''}`}>
                    <div className="flex items-center gap-2">
                      {renderToggle(serverId)}
                      <span className="text-xs font-medium text-brand-text">{server.name}</span>
                    </div>
                    <button onClick={() => updateNodeData(nodeId, { mcpServerIds: data.mcpServerIds?.filter(id => id !== serverId) })} className="p-1 hover:bg-rose-500/10 text-brand-muted hover:text-rose-500 rounded"><X className="w-3 h-3" /></button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Tools */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Custom Python Tools</label>
              <div className="relative">
                <button onClick={() => setIsCustomToolSelectorOpen(true)} className="p-1 hover:bg-brand-bg rounded-full text-emerald-500"><Plus className="w-3.5 h-3.5" /></button>
                {isCustomToolSelectorOpen && (
                  <>
                    <div className="fixed inset-0 z-[55]" onClick={() => setIsCustomToolSelectorOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-brand-card border border-brand-border rounded-xl shadow-xl z-[60] py-2">
                      {customTools.filter(t => !(data.customToolIds || []).includes(t.id)).map(tool => (
                        <button key={tool.id} onClick={() => { updateNodeData(nodeId, { customToolIds: [...(data.customToolIds || []), tool.id] }); setIsCustomToolSelectorOpen(false); }} className="w-full flex items-center justify-between px-3 py-2 text-xs text-brand-text hover:bg-brand-bg rounded-lg">{tool.name}<Plus className="w-3 h-3" /></button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {(data.customToolIds || []).map((toolId: string) => {
                const tool = customTools.find(t => t.id === toolId);
                if (!tool) return null;
                const disabled = isToolDisabled(toolId);
                return (
                  <div key={toolId} className={`flex items-center justify-between p-2 rounded-lg border border-emerald-500/10 bg-emerald-500/5 ${disabled ? 'opacity-50 grayscale' : ''}`}>
                    <div className="flex items-center gap-2">
                      {renderToggle(toolId)}
                      <span className="text-xs font-medium text-brand-text">{tool.name}</span>
                    </div>
                    <button onClick={() => updateNodeData(nodeId, { customToolIds: data.customToolIds?.filter(id => id !== toolId) })} className="p-1 hover:bg-rose-500/10 text-brand-muted hover:text-rose-500 rounded"><X className="w-3 h-3" /></button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* -- Execution Tab -- */}
      {activeTab === 'execution' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 gap-4">
            {(['verbose', 'cache', 'allow_delegation', 'allow_code_execution', 'reasoning', 'multimodal', 'respect_context_window', 'use_system_prompt', 'inject_date'] as (keyof AgentNodeData)[]).map(field => (
                <label key={field} className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={field === 'verbose' || field === 'respect_context_window' ? data[field] !== false : data[field] === true}
                      onChange={(e) => updateNodeData(nodeId, { [field]: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${(field === 'verbose' || field === 'respect_context_window' ? data[field] !== false : data[field] === true) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${(field === 'verbose' || field === 'respect_context_window' ? data[field] !== false : data[field] === true) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-[10px] text-brand-text uppercase font-bold group-hover:text-indigo-400 transition-colors">{(field as string).replace(/_/g, ' ')}</span>
                </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-brand-border/50 pt-4">
            {(['max_iter', 'max_retry_limit', 'max_rpm', 'max_execution_time', 'max_reasoning_attempts'] as (keyof AgentNodeData)[]).map(field => (
              <div key={field} className="flex flex-col gap-1.5">
                <label 
                  htmlFor={`agent-${field}`}
                  className="text-[10px] font-bold text-brand-muted uppercase tracking-wider"
                >
                  {(field as string).replace(/_/g, ' ')}
                </label>
                <input 
                  id={`agent-${field}`}
                  type="number" 
                  value={(data[field] as number) || ''}
                  onChange={(e) => updateNodeData(nodeId, { [field]: e.target.value !== '' ? parseInt(e.target.value) : undefined })}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-sm text-brand-text"
                />
              </div>
            ))}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Code Exec Mode</label>
              <select 
                value={(data.code_execution_mode as string) || 'safe'}
                onChange={(e) => updateNodeData(nodeId, { code_execution_mode: e.target.value })}
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="safe">Safe (Virtual)</option>
                <option value="unsafe">Unsafe (Local)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-brand-border/50">
            <h3 className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1 flex items-center gap-2"><Settings className="w-3 h-3" /> Linked Tasks Order</h3>
            {renderableTasks.length === 0 ? (
              <div className="text-[10px] text-brand-muted italic bg-brand-bg/50 rounded-lg p-3 text-center border border-dashed border-brand-border">Connect tasks to see them here.</div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
                <SortableContext items={renderableTasks.map(a => a.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-1">
                    {renderableTasks.map((taskVal) => (
                      <SortableItem key={taskVal.id} id={taskVal.id} name={(taskVal.data as TaskNodeData).name || 'Task'} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      )}

      {/* -- Templates Tab -- */}
      {activeTab === 'templates' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
           <div className="flex flex-col gap-1.5 mb-2">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-3 h-3 text-brand-muted" />
              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Date Format</label>
            </div>
            <input 
              type="text" 
              placeholder="%Y-%m-%d"
              value={(data.date_format as string) || ''}
              onChange={(e) => updateNodeData(nodeId, { date_format: e.target.value })}
              className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-sm text-brand-text"
            />
          </div>

          {[
            { id: 'system_template', label: 'System Template' },
            { id: 'prompt_template', label: 'Prompt Template' },
            { id: 'response_template', label: 'Response Template' }
          ].map(tpl => (
            <div key={tpl.id} className="flex flex-col border border-brand-border/50 rounded-xl overflow-hidden bg-brand-bg/20">
              <button 
                onClick={() => toggleTemplate(tpl.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-brand-muted uppercase tracking-wider hover:bg-brand-bg transition-colors"
              >
                <span>{tpl.label}</span>
                {expandedTemplates.includes(tpl.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {expandedTemplates.includes(tpl.id) && (
                <div className="p-3 border-t border-brand-border/30 animate-in slide-in-from-top-1 duration-200">
                  <HighlightedTextField
                    type="textarea"
                    value={(data[tpl.id as keyof AgentNodeData] as string) || ''}
                    onKeyDown={onFieldKeyDown}
                    onChange={(e) => onFieldChange(e, tpl.id, (val) => updateNodeData(nodeId, { [tpl.id]: val }))}
                    placeholder={`Enter custom ${tpl.label.toLowerCase()}...`}
                    rows={4}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
