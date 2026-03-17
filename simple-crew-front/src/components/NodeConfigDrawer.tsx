import React, { useState, useEffect } from 'react';
import { X, Trash2, GripVertical, Cpu, Plus } from 'lucide-react';
import { useStore } from '../store';
import type { AppState, ProcessType, AppNode } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, name }: { id: string; name: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-2.5 bg-brand-card border rounded-lg mb-2 transition-shadow ${
        isDragging 
          ? 'opacity-90 ring-2 ring-blue-500 dark:ring-blue-400 shadow-lg border-blue-200 dark:border-blue-800' 
          : 'border-brand-border shadow-sm hover:border-blue-400 dark:hover:border-blue-500'
      }`}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab active:cursor-grabbing hover:bg-brand-bg p-1.5 rounded text-brand-muted hover:text-brand-text transition-colors"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium text-brand-text truncate">{name}</span>
    </div>
  );
}

export function NodeConfigDrawer() {
  const activeNodeId = useStore((state: AppState) => state.activeNodeId);
  const nodes = useStore((state: AppState) => state.nodes);
  const edges = useStore((state: AppState) => state.edges);
  const setActiveNode = useStore((state: AppState) => state.setActiveNode);
  const updateNodeData = useStore((state: AppState) => state.updateNodeData);
  const deleteNode = useStore((state: AppState) => state.deleteNode);
  const updateCrewAgentOrder = useStore((state: AppState) => state.updateCrewAgentOrder);
  const updateAgentTaskOrder = useStore((state: AppState) => state.updateAgentTaskOrder);
  const models = useStore((state: AppState) => state.models);
  const mcpServers = useStore((state: AppState) => state.mcpServers);

  const [localName, setLocalName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [isContextSelectorOpen, setIsContextSelectorOpen] = useState(false);
  const [isMcpSelectorOpen, setIsMcpSelectorOpen] = useState(false);

  useEffect(() => {
    if (activeNodeId) {
      const node = nodes.find((n) => n.id === activeNodeId);
      if (node) {
        setLocalName((node.data as any).name || '');
        setNameError(false);
        setIsContextSelectorOpen(false);
        setIsMcpSelectorOpen(false);
      }
    }
  }, [activeNodeId, nodes]);

  // -- Sincronização e Ordenação Externa (Store) -- //
  const activeNode = nodes.find((n: AppNode) => n.id === activeNodeId);
  const isCrew = activeNode?.type === 'crew';
  const isAgent = activeNode?.type === 'agent';
  
  const connectedAgents = flexSearchAgents();
  const agentOrder = (activeNode?.data as any)?.agentOrder as string[] | undefined;
  
  const connectedTasks = flexSearchTasks();
  const taskOrder = (activeNode?.data as any)?.taskOrder as string[] | undefined;
  
  // Combina lista de ID's com os objetos de Node para render()
  let renderableAgents = [...connectedAgents];
  
  if (isCrew && agentOrder && agentOrder.length > 0) {
    // Sincroniza a visualização baseada na ordem gravada
    renderableAgents.sort((a, b) => {
      const idxA = agentOrder.indexOf(a.id);
      const idxB = agentOrder.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }

  let renderableTasks = [...connectedTasks];

  if (isAgent && taskOrder && taskOrder.length > 0) {
    renderableTasks.sort((a, b) => {
      const idxA = taskOrder.indexOf(a.id);
      const idxB = taskOrder.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }

  // Effect para sincronização inicial se não haver ordem ou houver inconsistência (Agents)
  useEffect(() => {
    if (isCrew && activeNodeId) {
      const currentIds = connectedAgents.map(a => a.id);
      const orderedIds = renderableAgents.map(a => a.id);
      
      const isMissing = currentIds.some(id => !agentOrder?.includes(id));
      const hasExtra = agentOrder?.some(id => !currentIds.includes(id));

      if (!agentOrder || isMissing || hasExtra) {
        // Corrige automaticamente gerando um AgentOrder fiel
        updateCrewAgentOrder(activeNodeId, orderedIds);
      }
    }
  }, [connectedAgents.length, isCrew, activeNodeId]);

  // Effect para sincronização inicial se não haver ordem ou houver inconsistência (Tasks)
  useEffect(() => {
    if (isAgent && activeNodeId) {
      const currentIds = connectedTasks.map(a => a.id);
      const orderedIds = renderableTasks.map(a => a.id);
      
      const isMissing = currentIds.some(id => !taskOrder?.includes(id));
      const hasExtra = taskOrder?.some(id => !currentIds.includes(id));

      if (!taskOrder || isMissing || hasExtra) {
        updateAgentTaskOrder(activeNodeId, orderedIds);
      }
    }
  }, [connectedTasks.length, isAgent, activeNodeId]);

  function flexSearchAgents() {
    if (!isCrew || !activeNodeId) return [];
    return edges
      .filter((e) => e.source === activeNodeId)
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter((n) => n?.type === 'agent') as AppNode[];
  }

  function flexSearchTasks() {
    if (!isAgent || !activeNodeId) return [];
    return edges
      .filter((e) => e.source === activeNodeId)
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter((n) => n?.type === 'task') as AppNode[];
  }

  // -- Handlers do Dnd-Kit -- //
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleAgentDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (activeNodeId && over && active.id !== over.id) {
      const oldIndex = renderableAgents.findIndex((a) => a.id === active.id);
      const newIndex = renderableAgents.findIndex((a) => a.id === over.id);

      const computedNewOrder = arrayMove(renderableAgents, oldIndex, newIndex);
      const newOrderIds = computedNewOrder.map((a) => a.id);
      
      updateCrewAgentOrder(activeNodeId, newOrderIds);
    }
  }

  function handleTaskDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (activeNodeId && over && active.id !== over.id) {
      const oldIndex = renderableTasks.findIndex((a) => a.id === active.id);
      const newIndex = renderableTasks.findIndex((a) => a.id === over.id);

      const computedNewOrder = arrayMove(renderableTasks, oldIndex, newIndex);
      const newOrderIds = computedNewOrder.map((a) => a.id);
      
      updateAgentTaskOrder(activeNodeId, newOrderIds);
    }
  }

  if (!activeNodeId || !activeNode) return null;

  const { type, data } = activeNode;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalName(value);

    const isDuplicate = nodes.some(
      (n) => n.id !== activeNode.id && n.type === activeNode.type && (n.data as any).name === value
    );

    setNameError(isDuplicate);

    if (!isDuplicate) {
      updateNodeData(activeNodeId, { name: value });
    }
  };

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-brand-card shadow-[-20px_0_50px_rgba(0,0,0,0.1)] dark:shadow-[-20px_0_50px_rgba(0,0,0,0.3)] z-50 flex flex-col border-l border-brand-border transition-all duration-300">
      <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between bg-brand-bg/50">
        <h2 className="text-lg font-bold text-brand-text capitalize tracking-tight">
          {type} Configuration
        </h2>
        <button
          id="btn-close-drawer"
          data-testid="btn-close-drawer"
          aria-label="Close configuration"
          onClick={() => setActiveNode(null)}
          className="p-2 hover:bg-brand-bg rounded-lg transition-colors group"
        >
          <X className="w-5 h-5 text-brand-muted group-hover:text-brand-text" />
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        {(type === 'agent' || type === 'task') && (
          <div className="flex flex-col gap-2 mb-6 pb-6 border-b border-brand-border/50">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Name</label>
            <input
              className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
                nameError
                  ? 'border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'border-brand-border focus:ring-blue-500 dark:focus:ring-blue-400 bg-brand-bg text-brand-text'
              }`}
              value={localName}
              onChange={handleNameChange}
              placeholder={type === 'agent' ? 'e.g. Senior Researcher' : 'e.g. SEO Writing Task'}
            />
            {nameError && (
              <span className="text-xs text-red-500 mt-1">
                This name is already in use. It must be unique.
              </span>
            )}
          </div>
        )}

        {type === 'agent' && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Role</label>
              <input
                className="border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-brand-bg text-brand-text transition-all"
                value={(data as any).role || ''}
                onChange={(e) => updateNodeData(activeNode.id, { role: e.target.value })}
                placeholder="e.g. Senior Researcher"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Goal</label>
              <textarea
                className="border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-brand-bg text-brand-text min-h-[80px] resize-none transition-all"
                value={(data as any).goal || ''}
                onChange={(e) => updateNodeData(activeNode.id, { goal: e.target.value })}
                placeholder="What does this agent need to achieve?"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Backstory</label>
              <textarea
                className="border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-brand-bg text-brand-text min-h-[120px] resize-none transition-all"
                value={(data as any).backstory || ''}
                onChange={(e) => updateNodeData(activeNode.id, { backstory: e.target.value })}
                placeholder="The agent's background and expertise..."
              />
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-brand-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-indigo-500" />
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">AI Model Configuration</label>
              </div>
              <select 
                value={(data as any).modelId || ''}
                onChange={(e) => updateNodeData(activeNode.id, { modelId: e.target.value || undefined })}
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer appearance-none"
              >
                <option value="">Default ({models.find(m => m.isDefault)?.name || 'Not set'})</option>
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} {model.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-brand-muted opacity-80">
                Choose a specific model configuration for this agent.
              </p>
            </div>

            {/* -- MCP Tool Servers Selection -- */}
            <div className="flex flex-col gap-2 pt-4 border-t border-brand-border/50">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">MCP Tool Servers</label>
              <p className="text-[11px] text-brand-muted opacity-80 mb-2">
                Enable custom MCP tool servers for this agent.
              </p>
              
              <div className="flex flex-wrap gap-2" data-testid="input-agent-mcp-servers">
                {((data as any).mcpServerIds || []).map((serverId: string) => {
                  const server = mcpServers.find(s => s.id === serverId);
                  if (!server) return null;
                  return (
                    <div key={serverId} className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-medium group">
                      <span className="truncate max-w-[120px]">{server.name}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          const currentIds = (data as any).mcpServerIds || [];
                          const newIds = currentIds.filter((id: string) => id !== serverId);
                          updateNodeData(activeNode.id, { mcpServerIds: newIds });
                        }}
                        className="hover:bg-indigo-500/20 p-0.5 rounded transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
                
                <div className="relative">
                  <button 
                    type="button"
                    data-testid="btn-add-mcp-server"
                    onClick={() => setIsMcpSelectorOpen(!isMcpSelectorOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 border border-dashed border-brand-border hover:border-indigo-400 rounded-lg text-xs font-medium text-brand-muted hover:text-indigo-500 transition-all bg-brand-bg/50"
                  >
                    <Plus className="w-3 h-3" />
                    Add MCP Server
                  </button>

                  {isMcpSelectorOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-[55]" 
                        onClick={() => setIsMcpSelectorOpen(false)}
                      />
                      <div className="absolute left-0 top-full mt-2 w-56 bg-brand-card border border-brand-border rounded-xl shadow-xl z-[60] py-2 animate-in fade-in zoom-in duration-200">
                        <div className="px-3 py-1.5 border-b border-brand-border mb-1">
                          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Select MCP Server</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto px-1">
                          {mcpServers
                            .filter(s => !((data as any).mcpServerIds || []).includes(s.id))
                            .map(server => (
                              <button
                                key={server.id}
                                onClick={() => {
                                  const currentIds = (data as any).mcpServerIds || [];
                                  const newIds = [...currentIds, server.id];
                                  updateNodeData(activeNode.id, { mcpServerIds: newIds });
                                  setIsMcpSelectorOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 text-xs text-brand-text hover:bg-brand-bg rounded-lg transition-colors text-left group"
                              >
                                <span className="truncate">{server.name}</span>
                                <Plus className="w-3 h-3 text-brand-muted group-hover:text-indigo-500" />
                              </button>
                            ))}
                          {mcpServers.filter(s => !((data as any).mcpServerIds || []).includes(s.id)).length === 0 && (
                            <div className="px-3 py-4 text-center">
                              <p className="text-[10px] text-brand-muted italic">No more servers available.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* -- Tasks Execution Order Ranking -- */}
            <div className="flex flex-col gap-2 pt-4 border-t border-brand-border/50">
              <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-1">Execution (Tasks)</h3>
              <p className="text-[11px] text-brand-muted opacity-80 mb-3">
                Drag to rearrange task execution priority.
              </p>
              
              {renderableTasks.length === 0 ? (
                <div className="text-xs text-brand-muted italic bg-brand-bg/50 rounded-lg p-6 text-center border border-dashed border-brand-border">
                  Connect tasks to see them here.
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleTaskDragEnd}
                >
                  <SortableContext
                    items={renderableTasks.map(a => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col">
                      {renderableTasks.map((taskVal) => (
                        <SortableItem 
                          key={taskVal.id} 
                          id={taskVal.id} 
                          name={(taskVal.data as any).name || 'Unnamed Task'} 
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        )}

        {type === 'task' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Description</label>
              <textarea
                className="border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-brand-bg text-brand-text min-h-[100px] resize-none transition-all"
                value={(data as any).description || ''}
                onChange={(e) => updateNodeData(activeNode.id, { description: e.target.value })}
                placeholder="What exactly needs to be done?"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Expected Output</label>
              <textarea
                className="border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-brand-bg text-brand-text min-h-[80px] resize-none transition-all"
                value={(data as any).expected_output || ''}
                onChange={(e) => updateNodeData(activeNode.id, { expected_output: e.target.value })}
                placeholder="What should this task produce?"
              />
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-brand-border/50">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Context (Optional)</label>
              <p className="text-[11px] text-brand-muted opacity-80 mb-2">
                Outputs of these tasks will be used as context.
              </p>
              
              <div className="flex flex-wrap gap-2" data-testid="input-task-context">
                {((data as any).context || []).map((contextId: string) => {
                  const taskNode = nodes.find(n => n.id === contextId);
                  if (!taskNode) return null;
                  return (
                    <div key={contextId} className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium group">
                      <span className="truncate max-w-[120px]">{(taskNode.data as any).name || 'Task'}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          const currentContext = (data as any).context || [];
                          const newContext = currentContext.filter((id: string) => id !== contextId);
                          updateNodeData(activeNode.id, { context: newContext });
                        }}
                        className="hover:bg-blue-500/20 p-0.5 rounded transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
                
                <div className="relative">
                  <button 
                    type="button"
                    data-testid="btn-add-context"
                    onClick={() => setIsContextSelectorOpen(!isContextSelectorOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 border border-dashed border-brand-border hover:border-blue-400 rounded-lg text-xs font-medium text-brand-muted hover:text-blue-500 transition-all bg-brand-bg/50"
                  >
                    <Plus className="w-3 h-3" />
                    Add Context
                  </button>

                  {isContextSelectorOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-[55]" 
                        onClick={() => setIsContextSelectorOpen(false)}
                      />
                      <div className="absolute left-0 top-full mt-2 w-56 bg-brand-card border border-brand-border rounded-xl shadow-xl z-[60] py-2 animate-in fade-in zoom-in duration-200">
                        <div className="px-3 py-1.5 border-b border-brand-border mb-1">
                          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Select Tasks</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto px-1">
                          {nodes
                            .filter(n => n.type === 'task' && n.id !== activeNode.id && !((data as any).context || []).includes(n.id))
                            .map(taskNode => (
                              <button
                                key={taskNode.id}
                                onClick={() => {
                                  const currentContext = (data as any).context || [];
                                  const newContext = [...currentContext, taskNode.id];
                                  updateNodeData(activeNode.id, { context: newContext });
                                  setIsContextSelectorOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 text-xs text-brand-text hover:bg-brand-bg rounded-lg transition-colors text-left group"
                              >
                                <span className="truncate">{(taskNode.data as any).name || 'Unnamed Task'}</span>
                                <Plus className="w-3 h-3 text-brand-muted group-hover:text-blue-500" />
                              </button>
                            ))}
                          {nodes.filter(n => n.type === 'task' && n.id !== activeNode.id && !((data as any).context || []).includes(n.id)).length === 0 && (
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
          </div>
        )}

        {type === 'crew' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Process</label>
              <select
                className="border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-brand-bg text-brand-text transition-all appearance-none cursor-pointer"
                value={(data as any).process || 'sequential'}
                onChange={(e) => updateNodeData(activeNode.id, { process: e.target.value as ProcessType })}
              >
                <option value="sequential">Sequential</option>
                <option value="hierarchical">Hierarchical</option>
              </select>
              <p className="text-[11px] text-brand-muted opacity-80 mt-1">
                Sequential processes execute tasks in order. Hierarchical needs a Manager Agent.
              </p>
            </div>
            
            {/* -- Agents Execution Order Ranking -- */}
            <div className="flex flex-col gap-2 pt-4 border-t border-brand-border/50">
              <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-1">Execution (Agents)</h3>
              <p className="text-[11px] text-brand-muted opacity-80 mb-3">
                Drag to rearrange execution priority.
              </p>
              
              {renderableAgents.length === 0 ? (
                <div className="text-xs text-brand-muted italic bg-brand-bg/50 rounded-lg p-6 text-center border border-dashed border-brand-border">
                  Connect agents to see them here.
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleAgentDragEnd}
                >
                  <SortableContext
                    items={renderableAgents.map(a => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col">
                      {renderableAgents.map((agentVal) => (
                        <SortableItem 
                          key={agentVal.id} 
                          id={agentVal.id} 
                          name={(agentVal.data as any).name || 'Unnamed Agent'} 
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-brand-border bg-brand-bg/50 flex gap-3">
        <button
          id="btn-delete-node"
          data-testid="btn-delete-node"
          aria-label="Delete node"
          onClick={() => deleteNode(activeNode.id)}
          className="flex items-center gap-2 text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer active:scale-95"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
        <button
          id="btn-done-config"
          data-testid="btn-done-config"
          aria-label="Complete configuration"
          onClick={() => setActiveNode(null)}
          className="flex-1 bg-slate-900 dark:bg-blue-600 border border-slate-700 dark:border-blue-500 hover:bg-slate-800 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md active:scale-95"
        >
          Done
        </button>
      </div>
    </div>
  );
}
