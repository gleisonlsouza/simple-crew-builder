import React, { useState, memo } from 'react';
import { Sparkles, Cpu, MessageSquare, Server, BookOpen, Eye, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

import HighlightedTextField from '../HighlightedTextField';
import type { LangGraphAgentData, StateNodeInfo, StateFieldInfo } from '../../types/nodes.types';
import type { ModelConfig, AgentSkill } from '../../types/config.types';


interface LangGraphAgentFormProps {
  data: LangGraphAgentData;
  nodeId: string;
  updateNodeData: (id: string, data: Partial<LangGraphAgentData>) => void;
  models: ModelConfig[];
  skills: AgentSkill[];
  loadingFields: Record<string, boolean>;

  onAiSuggest: (field: string) => void;
  onFieldKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }, field: string, updateFn: (val: string) => void) => void;
  stateNodes: StateNodeInfo[];
  updateStateConnection: (nodeId: string, stateId: string | null, showLine: boolean, fieldKey?: string | null) => void;
}

export const LangGraphAgentForm: React.FC<LangGraphAgentFormProps> = memo(({
  data,
  nodeId,
  updateNodeData,
  models,
  loadingFields,
  onAiSuggest,
  onFieldKeyDown,
  onFieldChange,
  stateNodes,
  updateStateConnection,
  skills,
}) => {

  const [activeTab, setActiveTab] = useState<'basic' | 'llm'>('basic');
  const [isSkillSelectorOpen, setIsSkillSelectorOpen] = useState(false);
  const [skillToPreview, setSkillToPreview] = useState<AgentSkill | null>(null);


  return (
    <div className="flex flex-col gap-5">
      {/* -- Tabs Navigation -- */}
      <div className="flex flex-wrap items-center gap-1 border-b border-brand-border/50 pb-2">
        <button
          onClick={() => setActiveTab('basic')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all mb-1 ${
            activeTab === 'basic' 
              ? 'bg-indigo-500/10 text-indigo-500 shadow-sm border border-indigo-500/20' 
              : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg border border-transparent'
          }`}
        >
          <MessageSquare className="w-3 h-3" />
          Basic
        </button>
        <button
          onClick={() => setActiveTab('llm')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all mb-1 ${
            activeTab === 'llm' 
              ? 'bg-indigo-500/10 text-indigo-500 shadow-sm border border-indigo-500/20' 
              : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg border border-transparent'
          }`}
        >
          <Cpu className="w-3 h-3" />
          LLM
        </button>
      </div>

      {/* -- Basic Settings Tab -- */}
      {activeTab === 'basic' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          {/* -- Import From Skill Button -- */}
          <div className="relative">
            <button
              onClick={() => setIsSkillSelectorOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-500 text-xs font-bold transition-all group mb-2"
            >
              ✨ Import From Skill
            </button>

            {isSkillSelectorOpen && (
              <>
                <div className="fixed inset-0 z-[55]" onClick={() => setIsSkillSelectorOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-full bg-brand-card border border-brand-border rounded-xl shadow-xl z-[60] py-2 animate-in zoom-in-95 duration-150">
                  <div className="px-3 pb-2 border-b border-brand-border/50 mb-2 flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-brand-muted" />
                    <span className="text-[10px] font-bold text-brand-muted uppercase">Select Skill to Auto-Fill</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto px-1 custom-scrollbar">
                    {skills.length === 0 ? (
                      <div className="px-3 py-4 text-center text-[10px] text-brand-muted italic">No skills available in library.</div>
                    ) : (
                      skills.map(skill => (
                        <button
                          key={skill.id}
                          onClick={() => {
                            updateNodeData(nodeId, { 
                              identitySkillIds: [skill.id],
                              role: skill.name,
                              backstory: skill.description || data.backstory
                            });
                            toast.success(`Skill "${skill.name}" applied`);
                            setIsSkillSelectorOpen(false);
                          }}
                          className="w-full flex flex-col px-3 py-2 text-xs text-brand-text hover:bg-brand-bg rounded-lg transition-colors text-left group"
                        >
                          <span className="font-bold group-hover:text-indigo-500">{skill.name}</span>
                          {skill.description && <span className="text-[9px] text-brand-muted line-clamp-1">{skill.description}</span>}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

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
              data-testid="field-agent-role"
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
              data-testid="input-goal"
              footer={(data.identitySkillIds || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {data.identitySkillIds?.map(skillId => {
                    const skill = skills.find(s => s.id === skillId);
                    if (!skill) return null;
                    return (
                      <div 
                        key={skillId}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/40 border-dashed text-indigo-400 text-xs font-medium backdrop-blur-sm transition-all animate-in fade-in zoom-in-95 duration-200"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[150px]">{skill.name}</span>
                        <div className="flex items-center gap-1.5 border-l border-indigo-500/30 ml-1 pl-1.5">
                          <button 
                            onClick={() => setSkillToPreview(skill)}
                            className="p-1 hover:bg-indigo-500/20 rounded transition-colors"
                            title="View Content"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              updateNodeData(nodeId, { identitySkillIds: (data.identitySkillIds || []).filter(id => id !== skillId) });
                              toast.success("Skill removed from agent");
                            }}
                            className="p-1 hover:bg-red-500/20 hover:text-red-500 rounded transition-colors"
                            title="Remove Skill"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
              data-testid="field-agent-backstory"
            />
          </div>

          {/* -- State Connection -- */}
          <div className="flex flex-col gap-3 p-4 bg-brand-bg/20 rounded-xl border border-brand-border/30">
            <div className="flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-purple-500" />
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">State Connection</label>
            </div>
            
            <div className="space-y-3">
              <select
                value={data.selectedStateId ? `${data.selectedStateId}${data.selectedStateKey ? `:${data.selectedStateKey}` : ''}` : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    updateStateConnection(nodeId, null, data.showStateConnections ?? true);
                  } else {
                    const [stateId, key] = val.split(':');
                    updateStateConnection(nodeId, stateId, data.showStateConnections ?? true, key || null);
                  }
                }}
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
              >
                <option value="">No State Connected</option>
                {stateNodes?.flatMap(sNode => {
                  const fields = sNode.fields || [];
                  if (fields.length === 0) {
                    return [<option key={sNode.id} value={sNode.id}>{sNode.name} (Entire State)</option>];
                  }
                  return fields.map((f: StateFieldInfo) => (
                    <option key={`${sNode.id}-${f.key}`} value={`${sNode.id}:${f.key}`}>
                      {sNode.name} &gt; {f.key}
                    </option>
                  ));
                })}
              </select>

              <label className="flex items-center gap-2 cursor-pointer group/toggle">
                <input
                  type="checkbox"
                  checked={data.showStateConnections ?? true}
                  onChange={(e) => updateStateConnection(nodeId, data.selectedStateId || null, e.target.checked, data.selectedStateKey || null)}
                  className="w-4 h-4 rounded border-brand-border text-purple-600 focus:ring-purple-500 cursor-pointer bg-brand-bg"
                />
                <span className="text-xs font-medium text-brand-muted group-hover/toggle:text-brand-text transition-colors">
                  Show Connection Line on Canvas
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* -- LLM Tab -- */}
      {activeTab === 'llm' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Main Model</label>
            <select 
              value={data.llm_id || ''}
              onChange={(e) => updateNodeData(nodeId, { llm_id: e.target.value || undefined })}
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
        </div>
      )}
      {/* -- Preview Skill Modal -- */}
      {skillToPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSkillToPreview(null)} />
          <div className="relative w-full max-w-lg bg-brand-card border border-brand-border rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-brand-text leading-tight">{skillToPreview.name}</h2>
                  <p className="text-xs text-brand-muted">Injected Skill Content</p>
                </div>
              </div>
              <button onClick={() => setSkillToPreview(null)} className="p-2 hover:bg-brand-bg rounded-full text-brand-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {skillToPreview.description && (
              <div className="mb-4 p-3 bg-brand-bg/50 border border-brand-border rounded-xl">
                <p className="text-xs text-brand-text italic">{skillToPreview.description}</p>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto bg-slate-900 rounded-xl p-4 custom-scrollbar">
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words leading-relaxed">
                {skillToPreview.content}
              </pre>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setSkillToPreview(null)}
                className="bg-brand-bg border border-brand-border text-brand-text px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

