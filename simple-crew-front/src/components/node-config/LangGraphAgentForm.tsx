import React, { useState, memo } from 'react';
import { Sparkles, Cpu, MessageSquare } from 'lucide-react';
import HighlightedTextField from '../HighlightedTextField';
import type { LangGraphAgentData } from '../../types/nodes.types';
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
