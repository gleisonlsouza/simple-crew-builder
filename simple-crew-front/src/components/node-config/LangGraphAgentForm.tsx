import React, { useState, memo } from 'react';
import { Sparkles, Cpu, MessageSquare, Server } from 'lucide-react';
import HighlightedTextField from '../HighlightedTextField';
import type { LangGraphAgentData, StateNodeInfo, StateFieldInfo } from '../../types/nodes.types';
import type { ModelConfig } from '../../types/config.types';

interface LangGraphAgentFormProps {
  data: LangGraphAgentData;
  nodeId: string;
  updateNodeData: (id: string, data: Partial<LangGraphAgentData>) => void;
  models: ModelConfig[];
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
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'llm'>('basic');

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
    </div>
  );
});
