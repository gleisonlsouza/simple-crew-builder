import React, { useState, memo } from 'react';
import { 
  Trash2, 
  Plus, 
  Settings, 
  Users, 
  Cpu, 
  Zap, 
  Shield, 
  MessageSquare,
  ListTodo
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter 
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import type { CrewNodeData, AppNode } from '../../types/nodes.types';
import type { ModelConfig } from '../../types/config.types';

interface CrewFormProps {
  data: CrewNodeData;
  nodeId: string;
  updateNodeData: (id: string, data: Partial<CrewNodeData>) => void;
  localName: string;
  handleNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  nameError: boolean;
  renderableAgents: AppNode[];
  renderableTasks: AppNode[];
  handleAgentDragEnd: (event: any) => void;
  handleTaskDragEnd: (event: any) => void;
  sensors: any;
  models: ModelConfig[];
}

export const CrewForm: React.FC<CrewFormProps> = memo(({
  data,
  nodeId,
  updateNodeData,
  localName,
  handleNameChange,
  nameError,
  renderableAgents,
  renderableTasks,
  handleAgentDragEnd,
  handleTaskDragEnd,
  sensors,
  models
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'orch' | 'settings' | 'llm'>('basic');

  const tabs = [
    { id: 'basic', label: 'Basic', icon: MessageSquare },
    { id: 'orch', label: 'Orchestration', icon: ListTodo },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'llm', label: 'LLM & AI', icon: Cpu },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs Navigation */}
      <div className="flex flex-wrap border-b border-brand-border/50 -mx-6 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 py-2 px-3 text-[10px] font-bold uppercase tracking-wider transition-all rounded-lg mb-2 ${
              activeTab === tab.id 
                ? 'text-blue-500 bg-blue-500/10 border border-blue-500/20' 
                : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg border border-transparent'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {/* BASIC TAB */}
        {activeTab === 'basic' && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Crew Name</label>
              <input 
                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
                  nameError 
                    ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 focus:ring-red-500' 
                    : 'border-brand-border bg-brand-bg text-brand-text focus:ring-blue-500'
                }`} 
                value={localName} 
                onChange={handleNameChange} 
                placeholder="e.g. Marketing Research Crew"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Process Type</label>
              <select 
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none" 
                value={data.process || 'sequential'} 
                onChange={(e) => updateNodeData(nodeId, { process: e.target.value as any })}
              >
                <option value="sequential">Sequential (Step-by-step)</option>
                <option value="hierarchical">Hierarchical (Manager led)</option>
                <option value="consensual">Consensual (Group decision)</option>
              </select>
              <p className="text-[10px] text-brand-muted mt-1 px-1 italic">
                {data.process === 'hierarchical' 
                  ? "Requires a Manager LLM to coordinate tasks." 
                  : "Tasks are executed in the order they are defined."}
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t border-brand-border/30">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Execution Variables</label>
                <button 
                  onClick={() => updateNodeData(nodeId, { inputs: { ...(data.inputs || {}), [`input_${Date.now()}`]: '' } })} 
                  className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-md text-[10px] font-bold uppercase hover:bg-blue-500/20 transition-colors"
                >
                  <Plus className="w-3 h-3 inline mr-1" />
                  Add Variable
                </button>
              </div>
              <p className="text-[10px] text-brand-muted px-1 italic">Use {'{variable}'} syntax in agent goals or task descriptions.</p>
              
              {Object.entries(data.inputs || {}).map(([key, value], idx) => (
                <div key={idx} className="flex gap-2 items-center min-w-0">
                  <input
                    className="bg-brand-bg/50 border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-brand-text flex-1 min-w-0 focus:border-blue-500 outline-none transition-colors"
                    value={key.startsWith('input_') ? '' : key}
                    placeholder="Key"
                    onChange={(e) => {
                      const newInputs: Record<string, any> = { ...data.inputs };
                      delete newInputs[key];
                      newInputs[e.target.value || `input_${idx}`] = value;
                      updateNodeData(nodeId, { inputs: newInputs });
                    }}
                  />
                  <input
                    className="bg-brand-bg/50 border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-secondary flex-1 min-w-0 focus:border-blue-500 outline-none transition-colors"
                    value={value as string}
                    placeholder="Default Value"
                    onChange={(e) => {
                      const newInputs: Record<string, any> = { ...data.inputs };
                      newInputs[key] = e.target.value;
                      updateNodeData(nodeId, { inputs: newInputs });
                    }}
                  />
                  <button
                    onClick={() => {
                      const newInputs: Record<string, any> = { ...data.inputs };
                      delete newInputs[key];
                      updateNodeData(nodeId, { inputs: newInputs });
                    }}
                    className="flex-shrink-0 p-1.5 text-brand-muted hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {Object.entries(data.inputs || {}).length === 0 && (
                <div className="text-center py-4 border border-dashed border-brand-border rounded-xl">
                   <p className="text-[10px] text-brand-muted italic uppercase tracking-widest">No variables defined.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ORCHESTRATION TAB */}
        {activeTab === 'orch' && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider">Agent Priority</h3>
              </div>
              <p className="text-[10px] text-brand-muted italic">Drag to reorder. Agents will be assigned tasks in this sequence.</p>
              
              {renderableAgents.length === 0 ? (
                <div className="text-xs text-brand-muted italic bg-brand-bg/50 rounded-lg p-6 text-center border border-dashed border-brand-border">Connect agents to see them here.</div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleAgentDragEnd}>
                  <SortableContext items={renderableAgents.map(a => a.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-1">
                      {renderableAgents.map((agentVal) => (
                        <SortableItem key={agentVal.id} id={agentVal.id} name={(agentVal.data as any).name || 'Unnamed Agent'} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t border-brand-border/30">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider">Task Execution Order</h3>
              </div>
              <p className="text-[10px] text-brand-muted italic">Global execution sequence for connected tasks.</p>
              
              {renderableTasks.length === 0 ? (
                <div className="text-xs text-brand-muted italic bg-brand-bg/50 rounded-lg p-6 text-center border border-dashed border-brand-border">No connected tasks found.</div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
                  <SortableContext items={renderableTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-1">
                      {renderableTasks.map((task) => (
                        <SortableItem key={task.id} id={task.id} name={(task.data as any).name || 'Unnamed Task'} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div 
                className={`p-4 border rounded-xl transition-all cursor-pointer flex flex-col gap-2 ${data.memory ? 'border-blue-500 bg-blue-500/5 shadow-sm' : 'border-brand-border'}`}
                onClick={() => updateNodeData(nodeId, { memory: !data.memory })}
              >
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-lg ${data.memory ? 'bg-blue-500/20 text-blue-500' : 'bg-brand-bg text-brand-muted'}`}>
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${data.memory ? 'bg-blue-500' : 'bg-brand-border'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${data.memory ? 'left-[17px]' : 'left-0.5'}`} />
                  </div>
                </div>
                <span className="text-xs font-bold text-brand-text">Memory</span>
                <p className="text-[10px] text-brand-muted leading-relaxed">Persist context across agents and turns.</p>
              </div>

              <div 
                className={`p-4 border rounded-xl transition-all cursor-pointer flex flex-col gap-2 ${data.cache ? 'border-amber-500 bg-amber-500/5 shadow-sm' : 'border-brand-border'}`}
                onClick={() => updateNodeData(nodeId, { cache: !data.cache })}
              >
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-lg ${data.cache ? 'bg-amber-500/20 text-amber-500' : 'bg-brand-bg text-brand-muted'}`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${data.cache ? 'bg-amber-500' : 'bg-brand-border'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${data.cache ? 'left-[17px]' : 'left-0.5'}`} />
                  </div>
                </div>
                <span className="text-xs font-bold text-brand-text">Cache</span>
                <p className="text-[10px] text-brand-muted leading-relaxed">Save costs by caching recurring API responses.</p>
              </div>

              <div 
                className={`p-4 border rounded-xl transition-all cursor-pointer flex flex-col gap-2 ${data.verbose ? 'border-emerald-500 bg-emerald-500/5 shadow-sm' : 'border-brand-border'}`}
                onClick={() => updateNodeData(nodeId, { verbose: !data.verbose })}
              >
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-lg ${data.verbose ? 'bg-emerald-500/20 text-emerald-500' : 'bg-brand-bg text-brand-muted'}`}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${data.verbose ? 'bg-emerald-500' : 'bg-brand-border'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${data.verbose ? 'left-[17px]' : 'left-0.5'}`} />
                  </div>
                </div>
                <span className="text-xs font-bold text-brand-text">Verbose</span>
                <p className="text-[10px] text-brand-muted leading-relaxed">Detailed execution logs in the console.</p>
              </div>

              <div 
                className={`p-4 border rounded-xl transition-all cursor-pointer flex flex-col gap-2 ${data.share_crew ? 'border-indigo-500 bg-indigo-500/5 shadow-sm' : 'border-brand-border'}`}
                onClick={() => updateNodeData(nodeId, { share_crew: !data.share_crew })}
              >
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-lg ${data.share_crew ? 'bg-indigo-500/20 text-indigo-500' : 'bg-brand-bg text-brand-muted'}`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${data.share_crew ? 'bg-indigo-500' : 'bg-brand-border'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${data.share_crew ? 'left-[17px]' : 'left-0.5'}`} />
                  </div>
                </div>
                <span className="text-xs font-bold text-brand-text">Share Crew</span>
                <p className="text-[10px] text-brand-muted leading-relaxed">Allow sharing execution data with CrewAI service.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-brand-border/30">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Max RPM</label>
              <input 
                type="number"
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono" 
                value={data.max_rpm || ''} 
                onChange={(e) => updateNodeData(nodeId, { max_rpm: parseInt(e.target.value) || 0 })}
                placeholder="Unlimited"
              />
              <p className="text-[10px] text-brand-muted italic mt-1 px-1">Maximum requests per minute for the entire crew.</p>
            </div>
          </div>
        )}

        {/* LLM TAB */}
        {activeTab === 'llm' && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {data.process === 'hierarchical' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-blue-500 uppercase tracking-wider">Manager LLM</label>
                <select 
                  className="w-full bg-brand-bg border border-blue-500/30 rounded-lg px-3 py-2 text-sm text-brand-text outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer" 
                  value={data.manager_llm_id || ''} 
                  onChange={(e) => updateNodeData(nodeId, { manager_llm_id: e.target.value })}
                >
                  <option value="">Use Default Model</option>
                  {models.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-brand-muted italic mt-1 px-1">Specific model that will act as the team manager.</p>
              </div>
            )}

            <div className="flex flex-col gap-4 pt-4 border-t border-brand-border/30">
              <div className="flex justify-between items-center bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Planning Mode</span>
                  <p className="text-[10px] text-brand-muted leading-relaxed max-w-[200px]">Enables pre-analysis before execution for better results.</p>
                </div>
                <div 
                  className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${data.planning ? 'bg-emerald-500' : 'bg-brand-border'}`}
                  onClick={() => updateNodeData(nodeId, { planning: !data.planning })}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${data.planning ? 'left-5' : 'left-1'}`} />
                </div>
              </div>

              {data.planning && (
                <div className="flex flex-col gap-2 pl-4 border-l-2 border-emerald-500/20 animate-in slide-in-from-left-2 duration-300">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Planning LLM</label>
                  <select 
                    className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer" 
                    value={data.planning_llm_id || ''} 
                    onChange={(e) => updateNodeData(nodeId, { planning_llm_id: e.target.value })}
                  >
                    <option value="">Same as Manager/Default</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-brand-border/30">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Function Calling LLM</label>
              <select 
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer" 
                value={data.function_calling_llm_id || ''} 
                onChange={(e) => updateNodeData(nodeId, { function_calling_llm_id: e.target.value })}
              >
                <option value="">Use Default</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-brand-muted italic mt-1 px-1">Specialized model for better tool usage performance.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
