import React, { useState, memo } from 'react';
import { X, Plus, Sparkles, User, Settings, FileOutput } from 'lucide-react';
import { HighlightedTextField } from '../HighlightedTextField';
import type { TaskNodeData, AppNode } from '../../types/nodes.types';

interface TaskFormProps {
  data: TaskNodeData;
  nodeId: string;
  updateNodeData: (id: string, data: Partial<TaskNodeData>) => void;
  nodes: AppNode[];
  loadingFields: Record<string, boolean>;
  onAiSuggest: (field: string) => void;
  onFieldKeyDown: (e: React.KeyboardEvent) => void;
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: string, updateFn: (val: string) => void) => void;
  isContextSelectorOpen: boolean;
  setIsContextSelectorOpen: (open: boolean) => void;
}

export const TaskForm: React.FC<TaskFormProps> = memo(({
  data,
  nodeId,
  updateNodeData,
  nodes,
  loadingFields,
  onAiSuggest,
  onFieldKeyDown,
  onFieldChange,
  isContextSelectorOpen,
  setIsContextSelectorOpen
}) => {
  const [isAgentSelectorOpen, setIsAgentSelectorOpen] = useState(false);

  // Find assigned agent via edge or agentId field
  const assignedAgent = nodes.find(n => n.type === 'agent' && n.id === data.agentId);

  return (
    <div className="flex flex-col gap-6">
      {/* -- Agent Assignment -- */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Assigned Agent</label>
        <div className="relative">
          <button
            onClick={() => setIsAgentSelectorOpen(!isAgentSelectorOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-brand-bg/50 border border-brand-border hover:border-indigo-500/50 rounded-lg text-sm transition-all group"
          >
            <div className="flex items-center gap-2">
              <User className={`w-4 h-4 ${assignedAgent ? 'text-indigo-500' : 'text-brand-muted'}`} />
              <span className={assignedAgent ? 'text-brand-text' : 'text-brand-muted italic'}>
                {assignedAgent ? (assignedAgent.data as any).name || 'Unnamed Agent' : 'Select an agent...'}
              </span>
            </div>
            <Plus className="w-3 h-3 text-brand-muted group-hover:text-indigo-500" />
          </button>

          {isAgentSelectorOpen && (
            <>
              <div className="fixed inset-0 z-[55]" onClick={() => setIsAgentSelectorOpen(false)} />
              <div className="absolute left-0 top-full mt-2 w-full bg-brand-card border border-brand-border rounded-xl shadow-xl z-[60] py-2 animate-in fade-in zoom-in duration-200">
                <div className="px-3 py-1.5 border-b border-brand-border mb-1">
                  <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Available Agents</span>
                </div>
                <div className="max-h-48 overflow-y-auto px-1">
                  {nodes.filter(n => n.type === 'agent').map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        updateNodeData(nodeId, { agentId: agent.id });
                        setIsAgentSelectorOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-text hover:bg-brand-bg rounded-lg transition-colors text-left"
                    >
                      <User className="w-3 h-3 text-indigo-500" />
                      <span className="truncate">{(agent.data as any).name || 'Unnamed Agent'}</span>
                    </button>
                  ))}
                  {nodes.filter(n => n.type === 'agent').length === 0 && (
                    <div className="px-3 py-4 text-center">
                      <p className="text-[10px] text-brand-muted italic">No agents found in workflow.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {(['description', 'expected_output'] as (keyof TaskNodeData)[]).map(field => (
        <div key={field} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider capitalize">{(field as string).replace('_', ' ')}</label>
            <button 
              onClick={() => onAiSuggest(field as string)} 
              disabled={loadingFields[field as string]} 
              className={`p-1 ${loadingFields[field as string] ? 'animate-sparkle-shimmer' : 'text-brand-muted hover:text-indigo-500'}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
          <HighlightedTextField 
            type="textarea" 
            value={(data[field] as string) || ''} 
            onKeyDown={onFieldKeyDown} 
            onChange={(e) => onFieldChange(e, field as string, (val) => updateNodeData(nodeId, { [field]: val }))} 
            rows={field === 'description' ? 4 : 3} 
          />
        </div>
      ))}

      <div className="flex flex-col gap-2 pt-4 border-t border-brand-border/50">
        <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Context (Optional)</label>
        <div className="flex flex-wrap gap-2">
          {(data.context || []).map((contextId: string) => {
            const taskNode = nodes.find(n => n.id === contextId);
            return (
              <div key={contextId} className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium">
                <span className="truncate max-w-[120px]">{(taskNode?.data as any)?.name || 'Task'}</span>
                <button 
                  onClick={() => updateNodeData(nodeId, { context: (data.context || []).filter((id: string) => id !== contextId) })} 
                  className="hover:bg-blue-500/20 p-0.5 rounded"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
          <div className="relative">
            <button 
              onClick={() => setIsContextSelectorOpen(!isContextSelectorOpen)} 
              className="flex items-center gap-1.5 px-2.5 py-1 border border-dashed border-brand-border hover:border-blue-400 rounded-lg text-xs text-brand-muted hover:text-blue-500 transition-all bg-brand-bg/50"
            >
              <Plus className="w-3 h-3" />
              Add Context
            </button>
            {isContextSelectorOpen && (
              <>
                <div className="fixed inset-0 z-[55]" onClick={() => setIsContextSelectorOpen(false)} />
                <div className="absolute left-0 top-full mt-2 w-56 bg-brand-card border border-brand-border rounded-xl shadow-xl z-[60] py-2 animate-in fade-in zoom-in duration-200">
                  <div className="px-3 py-1.5 border-b border-brand-border mb-1 text-[10px] font-bold text-brand-muted uppercase">Select Tasks</div>
                  <div className="max-h-48 overflow-y-auto px-1">
                    {nodes.filter(n => n.type === 'task' && n.id !== nodeId && !(data.context || []).includes(n.id)).map(taskNode => (
                      <button 
                        key={taskNode.id} 
                        onClick={() => { 
                          updateNodeData(nodeId, { context: [...(data.context || []), taskNode.id] }); 
                          setIsContextSelectorOpen(false); 
                        }} 
                        className="w-full flex justify-between px-3 py-2 text-xs text-brand-text hover:bg-brand-bg rounded-lg"
                      >
                        {(taskNode.data as any).name || 'Unnamed Task'}
                        <Plus className="w-3 h-3" />
                      </button>
                    ))}
                    {nodes.filter(n => n.type === 'task' && n.id !== nodeId && !(data.context || []).includes(n.id)).length === 0 && (
                      <div className="px-3 py-4 text-center">
                        <p className="text-[10px] text-brand-muted italic">No more tasks available.</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* -- Execution Settings -- */}
      <div className="flex flex-col gap-4 pt-4 border-t border-brand-border/50">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-3.5 h-3.5 text-brand-muted" />
          <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wider">Execution Settings</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {(['async_execution', 'human_input'] as (keyof TaskNodeData)[]).map(field => (
            <label key={field} className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  className="sr-only"
                  checked={data[field] === true}
                  onChange={(e) => updateNodeData(nodeId, { [field]: e.target.checked })}
                />
                <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${data[field] === true ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${data[field] === true ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                </div>
              </div>
              <span className="text-xs text-brand-text capitalize group-hover:text-indigo-400 transition-colors">{(field as string).replace(/_/g, ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      {/* -- Output Settings -- */}
      <div className="flex flex-col gap-4 pt-4 border-t border-brand-border/50">
        <div className="flex items-center gap-2 mb-1">
          <FileOutput className="w-3.5 h-3.5 text-brand-muted" />
          <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wider">Output Settings</h3>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Output File Path</label>
          <input 
            type="text"
            placeholder="e.g. results/summary.md"
            value={data.output_file || ''}
            onChange={(e) => updateNodeData(nodeId, { output_file: e.target.value })}
            className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-brand-muted/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
          {(['create_directory', 'output_json', 'output_pydantic'] as (keyof TaskNodeData)[]).map(field => (
            <label key={field} className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  className="sr-only"
                  checked={field === 'create_directory' ? data[field] !== false : data[field] === true}
                  onChange={(e) => updateNodeData(nodeId, { [field]: e.target.checked })}
                />
                <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${(field === 'create_directory' ? data[field] !== false : data[field] === true) ? 'bg-emerald-500/20 border-emerald-500' : ''}`}>
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${(field === 'create_directory' ? data[field] !== false : data[field] === true) ? 'translate-x-4 bg-emerald-500' : 'bg-brand-muted'}`} />
                </div>
              </div>
              <span className="text-xs text-brand-text capitalize group-hover:text-emerald-400 transition-colors">{(field as string).replace(/_/g, ' ')}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
});
