import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, Trash2, GripVertical, Cpu, Plus, Sparkles } from 'lucide-react';
import { HighlightedTextField } from './HighlightedTextField';
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
  const suggestAiContent = useStore((state: AppState) => state.suggestAiContent);
  const suggestBulkAiContent = useStore((state: AppState) => state.suggestBulkAiContent);
  const suggestTaskBulkAiContent = useStore((state: AppState) => state.suggestTaskBulkAiContent);
  const customTools = useStore((state: AppState) => state.customTools);
  const globalTools = useStore((state: AppState) => state.globalTools);

  const [localName, setLocalName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [isContextSelectorOpen, setIsContextSelectorOpen] = useState(false);
  const [isMcpSelectorOpen, setIsMcpSelectorOpen] = useState(false);
  const [isCustomToolSelectorOpen, setIsCustomToolSelectorOpen] = useState(false);
  const [isGlobalToolSelectorOpen, setIsGlobalToolSelectorOpen] = useState(false);
  const [loadingFields, setLoadingFields] = useState<Record<string, boolean>>({});

  // -- Autocomplete State --
  const [suggestionState, setSuggestionState] = useState<{
    isOpen: boolean;
    field: string;
    filter: string;
    cursorPos: number;
    anchorRect: DOMRect | null;
    selectedIndex: number;
  }>({
    isOpen: false,
    field: '',
    filter: '',
    cursorPos: 0,
    anchorRect: null,
    selectedIndex: 0
  });

  useEffect(() => {
    if (activeNodeId) {
      const node = nodes.find((n) => n.id === activeNodeId);
      if (node) {
        setLocalName((node.data as any).name || '');
        setNameError(false);
        setIsContextSelectorOpen(false);
        setIsMcpSelectorOpen(false);
        setIsCustomToolSelectorOpen(false);
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

  const handleAiSuggest = async (field: 'role' | 'goal' | 'backstory' | 'description' | 'expected_output') => {
    if (!activeNodeId) return;
    setLoadingFields(prev => ({ ...prev, [field]: true }));
    try {
      await suggestAiContent(activeNodeId, field);
    } finally {
      setLoadingFields(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleBulkAiSuggest = async () => {
    if (!activeNodeId || !data) return;
    
    if (type === 'agent') {
      const agentName = (data as any).name;
      if (!agentName || agentName.trim() === '') {
        toast.error('Please define a name for the Agent first.');
        return;
      }
      
      setLoadingFields(prev => ({
        ...prev,
        role: true,
        goal: true,
        backstory: true
      }));

      try {
        await suggestBulkAiContent(activeNodeId);
      } finally {
        setLoadingFields(prev => ({
          ...prev,
          role: false,
          goal: false,
          backstory: false
        }));
      }
    } else if (type === 'task') {
      const taskName = (data as any).name;
      if (!taskName || taskName.trim() === '') {
        toast.error('Please define a name for the Task first.');
        return;
      }
      
      setLoadingFields(prev => ({
        ...prev,
        description: true,
        expected_output: true
      }));

      try {
        await suggestTaskBulkAiContent(activeNodeId);
      } finally {
        setLoadingFields(prev => ({
          ...prev,
          description: false,
          expected_output: false
        }));
      }
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    if (!activeNodeId || !activeNode) return;
    const { field, cursorPos } = suggestionState;
    const currentData = activeNode.data as any;
    const currentValue = currentData[field] || '';
    
    // Encontra o início do placeholder (onde está o {)
    const textBeforeCursor = currentValue.slice(0, cursorPos);
    const lastBraceIndex = textBeforeCursor.lastIndexOf('{');
    
    if (lastBraceIndex !== -1) {
      const newValue = 
        currentValue.slice(0, lastBraceIndex) + 
        `{${suggestion}}` + 
        currentValue.slice(cursorPos);
      
      updateNodeData(activeNodeId, { [field]: newValue });
    }

    setSuggestionState(prev => ({ ...prev, isOpen: false }));
  };

  const handleFieldKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement | any>) => {
    if (suggestionState.isOpen) {
      const crewNode = nodes.find(n => n.type === 'crew');
      const inputs = Object.keys((crewNode?.data as any)?.inputs || {}).filter(k => !k.startsWith('input_'));
      const filtered = inputs.filter(k => k.toLowerCase().includes(suggestionState.filter.toLowerCase()));

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionState(prev => ({ 
          ...prev, 
          selectedIndex: (prev.selectedIndex + 1) % (filtered.length || 1) 
        }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionState(prev => ({ 
          ...prev, 
          selectedIndex: (prev.selectedIndex - 1 + (filtered.length || 1)) % (filtered.length || 1) 
        }));
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        handleSelectSuggestion(filtered[suggestionState.selectedIndex]);
      } else if (e.key === 'Escape') {
        setSuggestionState(prev => ({ ...prev, isOpen: false }));
      }
    }
  };

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement | any>, 
    field: string,
    updateFn: (val: string) => void
  ) => {
    const value = e.target.value;
    const targetElement = (e.target.getBoundingClientRect ? e.target : document.activeElement) as HTMLTextAreaElement | HTMLInputElement;
    const cursorPos = (targetElement && typeof targetElement.selectionStart === 'number') 
      ? targetElement.selectionStart 
      : value.length;

    updateFn(value);

    // Lógica para detectar se terminamos com "{" ou se estamos dentro de um "{... "
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastBraceIndex = textBeforeCursor.lastIndexOf('{');
    const lastCloseBraceIndex = textBeforeCursor.lastIndexOf('}');

    if (lastBraceIndex > lastCloseBraceIndex) {
      // Estamos dentro de um bloco de sugestão
      const filter = textBeforeCursor.slice(lastBraceIndex + 1);
      const rect = targetElement?.getBoundingClientRect ? targetElement.getBoundingClientRect() : null;
      
      setSuggestionState({
        isOpen: true,
        field,
        filter,
        cursorPos,
        anchorRect: rect,
        selectedIndex: 0
      });
    } else {
      setSuggestionState(prev => ({ ...prev, isOpen: false }));
    }
  };

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-brand-card shadow-[-20px_0_50px_rgba(0,0,0,0.1)] dark:shadow-[-20px_0_50px_rgba(0,0,0,0.3)] z-50 flex flex-col border-l border-brand-border transition-all duration-300">
      <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between bg-brand-bg/50">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-brand-text capitalize tracking-tight">
            {type} Configuration
          </h2>
          {(type === 'agent' || type === 'task') && (
            <button
              onClick={handleBulkAiSuggest}
              disabled={
                type === 'agent' 
                  ? (loadingFields['role'] || loadingFields['goal'] || loadingFields['backstory'])
                  : (loadingFields['description'] || loadingFields['expected_output'])
              }
              className={`p-1.5 rounded-lg transition-all duration-300 ${
                (type === 'agent' && (loadingFields['role'] || loadingFields['goal'] || loadingFields['backstory'])) ||
                (type === 'task' && (loadingFields['description'] || loadingFields['expected_output']))
                  ? 'animate-sparkle-shimmer cursor-wait'
                  : 'text-brand-muted hover:text-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20'
              }`}
              title="Fill all fields with AI"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          )}
        </div>
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

      {/* -- Autocomplete Dropdown -- */}
      {suggestionState.isOpen && (
        <div 
          className="fixed z-[100] bg-brand-card border border-brand-border rounded-xl shadow-2xl py-1.5 w-64 overflow-hidden animate-in fade-in zoom-in duration-150"
          style={{
            top: (suggestionState.anchorRect?.bottom || 0) + 4,
            left: suggestionState.anchorRect?.left || 0,
            maxHeight: '200px'
          }}
        >
          <div className="px-3 py-1.5 border-b border-brand-border mb-1">
            <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Crew Input Variables</span>
          </div>
          <div className="overflow-y-auto max-h-[160px] custom-scrollbar">
            {Object.keys((nodes.find(n => n.type === 'crew')?.data as any)?.inputs || {})
              .filter(k => !k.startsWith('input_') && k.toLowerCase().includes(suggestionState.filter.toLowerCase()))
              .map((key, idx) => (
                <button
                  key={key}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(key);
                  }}
                  onMouseEnter={() => setSuggestionState(prev => ({ ...prev, selectedIndex: idx }))}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                    idx === suggestionState.selectedIndex 
                      ? 'bg-blue-500/10 text-blue-500' 
                      : 'text-brand-text hover:bg-brand-bg'
                  }`}
                >
                  <span className="truncate">{key}</span>
                  <Plus className={`w-3 h-3 ${idx === suggestionState.selectedIndex ? 'opacity-100' : 'opacity-0'}`} />
                </button>
              ))}
            {Object.keys((nodes.find(n => n.type === 'crew')?.data as any)?.inputs || {})
              .filter(k => !k.startsWith('input_') && k.toLowerCase().includes(suggestionState.filter.toLowerCase())).length === 0 && (
              <div className="px-3 py-3 text-center">
                <p className="text-[10px] text-brand-muted italic">No matching inputs.</p>
              </div>
            )}
          </div>
        </div>
      )}

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
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Role</label>
                <button 
                  onClick={() => handleAiSuggest('role')}
                  disabled={loadingFields['role']}
                  className={`p-1 transition-all duration-300 ${loadingFields['role'] ? 'animate-sparkle-shimmer cursor-wait' : 'text-brand-muted hover:text-indigo-500'}`}
                  title="Generate with AI"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
              <HighlightedTextField
                type="input"
                value={(data as any).role || ''}
                onKeyDown={(e) => handleFieldKeyDown(e)}
                onChange={(e) => handleFieldChange(e, 'role', (val) => updateNodeData(activeNode.id, { role: val }))}
                placeholder="e.g. Senior Researcher"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Goal</label>
                <button 
                  onClick={() => handleAiSuggest('goal')}
                  disabled={loadingFields['goal']}
                  className={`p-1 transition-all duration-300 ${loadingFields['goal'] ? 'animate-sparkle-shimmer cursor-wait' : 'text-brand-muted hover:text-indigo-500'}`}
                  title="Generate with AI"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
              <HighlightedTextField
                type="textarea"
                value={(data as any).goal || ''}
                onKeyDown={(e) => handleFieldKeyDown(e)}
                onChange={(e) => handleFieldChange(e, 'goal', (val) => updateNodeData(activeNode.id, { goal: val }))}
                placeholder="What does this agent need to achieve?"
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Backstory</label>
                <button 
                  onClick={() => handleAiSuggest('backstory')}
                  disabled={loadingFields['backstory']}
                  className={`p-1 transition-all duration-300 ${loadingFields['backstory'] ? 'animate-sparkle-shimmer cursor-wait' : 'text-brand-muted hover:text-indigo-500'}`}
                  title="Generate with AI"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
              <HighlightedTextField
                type="textarea"
                value={(data as any).backstory || ''}
                onKeyDown={(e) => handleFieldKeyDown(e)}
                onChange={(e) => handleFieldChange(e, 'backstory', (val) => updateNodeData(activeNode.id, { backstory: val }))}
                placeholder="The agent's background and expertise..."
                rows={5}
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
            {/* -- Default CrewAI Tools Selection -- */}
            <div className="flex flex-col gap-2 pt-4 border-t border-brand-border/50">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Default CrewAI Tools</label>
              <p className="text-[11px] text-brand-muted opacity-80 mb-2">
                Official tools from the CrewAI library.
              </p>
              
              <div className="flex flex-wrap gap-2">
                {((data as any).globalToolIds || []).map((toolId: string) => {
                  const tool = globalTools.find(t => t.id === toolId);
                  if (!tool) return null;
                  return (
                    <div key={toolId} className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-medium group">
                      <span className="truncate max-w-[120px]">{tool.name}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          const currentIds = (data as any).globalToolIds || [];
                          const newIds = currentIds.filter((id: string) => id !== toolId);
                          updateNodeData(activeNode.id, { globalToolIds: newIds });
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
                    onClick={() => setIsGlobalToolSelectorOpen(!isGlobalToolSelectorOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 border border-dashed border-brand-border hover:border-indigo-400 rounded-lg text-xs font-medium text-brand-muted hover:text-indigo-500 transition-all bg-brand-bg/50"
                  >
                    <Plus className="w-3 h-3" />
                    Add Default Tool
                  </button>

                  {isGlobalToolSelectorOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-[55]" 
                        onClick={() => setIsGlobalToolSelectorOpen(false)}
                      />
                      <div className="absolute left-0 top-full mt-2 w-64 bg-brand-card border border-brand-border rounded-xl shadow-xl z-[60] py-2 animate-in fade-in zoom-in duration-200">
                        <div className="px-3 py-1.5 border-b border-brand-border mb-1">
                          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Select Default Tool</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto px-1">
                          {['Search', 'Web', 'Files & Documents'].map(cat => {
                            const catTools = globalTools.filter(t => t.category === cat && t.isEnabled && !((data as any).globalToolIds || []).includes(t.id));
                            if (catTools.length === 0) return null;
                            return (
                              <div key={cat} className="mb-2 last:mb-0">
                                <div className="px-3 py-1 text-[9px] font-bold text-brand-muted uppercase tracking-widest">{cat}</div>
                                {catTools.map(tool => (
                                  <button
                                    key={tool.id}
                                    onClick={() => {
                                      const currentIds = (data as any).globalToolIds || [];
                                      const newIds = [...currentIds, tool.id];
                                      updateNodeData(activeNode.id, { globalToolIds: newIds });
                                      setIsGlobalToolSelectorOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-brand-text hover:bg-brand-bg rounded-lg transition-colors text-left group"
                                  >
                                    <span className="truncate">{tool.name}</span>
                                    <Plus className="w-3 h-3 text-brand-muted group-hover:text-indigo-500" />
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
            </div>

            {/* -- Custom Python Tools Selection -- */}
            <div className="flex flex-col gap-2 pt-4 border-t border-brand-border/50">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Custom Python Tools</label>
              <p className="text-[11px] text-brand-muted opacity-80 mb-2">
                Enable your own Python logic for this agent.
              </p>
              
              <div className="flex flex-wrap gap-2">
                {((data as any).customToolIds || []).map((toolId: string) => {
                  const tool = customTools.find(t => t.id === toolId);
                  if (!tool) return null;
                  return (
                    <div key={toolId} className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-medium group">
                      <span className="truncate max-w-[120px]">{tool.name}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          const currentIds = (data as any).customToolIds || [];
                          const newIds = currentIds.filter((id: string) => id !== toolId);
                          updateNodeData(activeNode.id, { customToolIds: newIds });
                        }}
                        className="hover:bg-emerald-500/20 p-0.5 rounded transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
                
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setIsCustomToolSelectorOpen(!isCustomToolSelectorOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 border border-dashed border-brand-border hover:border-emerald-400 rounded-lg text-xs font-medium text-brand-muted hover:text-emerald-500 transition-all bg-brand-bg/50"
                  >
                    <Plus className="w-3 h-3" />
                    Add Custom Tool
                  </button>

                  {isCustomToolSelectorOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-[55]" 
                        onClick={() => setIsCustomToolSelectorOpen(false)}
                      />
                      <div className="absolute left-0 top-full mt-2 w-56 bg-brand-card border border-brand-border rounded-xl shadow-xl z-[60] py-2 animate-in fade-in zoom-in duration-200">
                        <div className="px-3 py-1.5 border-b border-brand-border mb-1">
                          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Select Custom Tool</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto px-1">
                          {customTools
                            .filter(t => !((data as any).customToolIds || []).includes(t.id))
                            .map(tool => (
                              <button
                                key={tool.id}
                                onClick={() => {
                                  const currentIds = (data as any).customToolIds || [];
                                  const newIds = [...currentIds, tool.id];
                                  updateNodeData(activeNode.id, { customToolIds: newIds });
                                  setIsCustomToolSelectorOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 text-xs text-brand-text hover:bg-brand-bg rounded-lg transition-colors text-left group"
                              >
                                <span className="truncate">{tool.name}</span>
                                <Plus className="w-3 h-3 text-brand-muted group-hover:text-emerald-500" />
                              </button>
                            ))}
                          {customTools.filter(t => !((data as any).customToolIds || []).includes(t.id)).length === 0 && (
                            <div className="px-3 py-4 text-center">
                              <p className="px-2 text-[10px] text-brand-muted italic">
                                {customTools.length === 0 
                                  ? 'No custom tools defined. Create them in Settings.' 
                                  : 'All custom tools already added.'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* -- Agent Execution Settings -- */}
            <div className="flex flex-col gap-4 pt-4 border-t border-brand-border/50">
              <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-1">Execution Settings</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={(data as any).verbose !== false}
                      onChange={(e) => updateNodeData(activeNode.id, { verbose: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${((data as any).verbose !== false) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${((data as any).verbose !== false) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-text group-hover:text-indigo-400 transition-colors">Verbose</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={(data as any).allow_delegation === true}
                      onChange={(e) => updateNodeData(activeNode.id, { allow_delegation: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${((data as any).allow_delegation === true) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${((data as any).allow_delegation === true) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-text group-hover:text-indigo-400 transition-colors">Allow Delegation</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={(data as any).cache === true}
                      onChange={(e) => updateNodeData(activeNode.id, { cache: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${((data as any).cache === true) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${((data as any).cache === true) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-text group-hover:text-indigo-400 transition-colors">Cache</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={(data as any).allow_code_execution === true}
                      onChange={(e) => updateNodeData(activeNode.id, { allow_code_execution: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${((data as any).allow_code_execution === true) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${((data as any).allow_code_execution === true) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-text group-hover:text-indigo-400 transition-colors">Code Execution</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={(data as any).respect_context_window !== false}
                      onChange={(e) => updateNodeData(activeNode.id, { respect_context_window: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${((data as any).respect_context_window !== false) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${((data as any).respect_context_window !== false) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-text group-hover:text-indigo-400 transition-colors">Respect Context</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={(data as any).use_system_prompt === true}
                      onChange={(e) => updateNodeData(activeNode.id, { use_system_prompt: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${((data as any).use_system_prompt === true) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${((data as any).use_system_prompt === true) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-text group-hover:text-indigo-400 transition-colors">System Prompt</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={(data as any).reasoning === true}
                      onChange={(e) => updateNodeData(activeNode.id, { reasoning: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${((data as any).reasoning === true) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${((data as any).reasoning === true) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-text group-hover:text-indigo-400 transition-colors">Reasoning</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={(data as any).multimodal === true}
                      onChange={(e) => updateNodeData(activeNode.id, { multimodal: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${((data as any).multimodal === true) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${((data as any).multimodal === true) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-text group-hover:text-indigo-400 transition-colors">Multimodal</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={(data as any).inject_date === true}
                      onChange={(e) => updateNodeData(activeNode.id, { inject_date: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${((data as any).inject_date === true) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${((data as any).inject_date === true) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-text group-hover:text-indigo-400 transition-colors">Inject Date</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Max Iterations</label>
                  <input 
                    type="number" 
                    value={(data as any).max_iter ?? 25}
                    onChange={(e) => updateNodeData(activeNode.id, { max_iter: parseInt(e.target.value) || 25 })}
                    className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="25"
                    min="1"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Max Retries</label>
                  <input 
                    type="number" 
                    value={(data as any).max_retry_limit ?? 2}
                    onChange={(e) => updateNodeData(activeNode.id, { max_retry_limit: parseInt(e.target.value) || 2 })}
                    className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="2"
                    min="0"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Max RPM</label>
                  <input 
                    type="number" 
                    value={(data as any).max_rpm || ''}
                    onChange={(e) => updateNodeData(activeNode.id, { max_rpm: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="No limit"
                    min="1"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Max Exec Time (s)</label>
                  <input 
                    type="number" 
                    value={(data as any).max_execution_time || ''}
                    onChange={(e) => updateNodeData(activeNode.id, { max_execution_time: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="No limit"
                    min="1"
                  />
                </div>
                
                {((data as any).reasoning === true) && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Max Reasoning</label>
                    <input 
                      type="number" 
                      value={(data as any).max_reasoning_attempts || ''}
                      onChange={(e) => updateNodeData(activeNode.id, { max_reasoning_attempts: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="No limit"
                      min="1"
                    />
                  </div>
                )}
                
                {((data as any).inject_date === true) && (
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Date Format</label>
                    <input 
                      type="text" 
                      value={(data as any).date_format || ''}
                      onChange={(e) => updateNodeData(activeNode.id, { date_format: e.target.value })}
                      className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="%Y-%m-%d"
                    />
                  </div>
                )}
              </div>

              {((data as any).allow_code_execution === true) && (
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Code Execution Mode</label>
                  <select 
                    value={(data as any).code_execution_mode || 'safe'}
                    onChange={(e) => updateNodeData(activeNode.id, { code_execution_mode: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer appearance-none"
                  >
                    <option value="safe">Safe (Docker)</option>
                    <option value="unsafe">Unsafe (Local)</option>
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Function Calling LLM</label>
                <select 
                  value={(data as any).function_calling_llm_id || ''}
                  onChange={(e) => updateNodeData(activeNode.id, { function_calling_llm_id: e.target.value || undefined })}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer appearance-none"
                >
                  <option value="">Default (Same as Agent LLM)</option>
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} {model.isDefault ? '(Global)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-brand-muted opacity-80 mt-1">
                  Optional LLM to specifically handle function/tool calling.
                </p>
              </div>

              {/* -- Advanced Templates -- */}
              <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-brand-border/50">
                <h4 className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Advanced Templates</h4>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">System Template</label>
                  <textarea 
                    value={(data as any).system_template || ''}
                    onChange={(e) => updateNodeData(activeNode.id, { system_template: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono resize-y"
                    placeholder="Custom system prompt template..."
                    rows={2}
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Prompt Template</label>
                  <textarea 
                    value={(data as any).prompt_template || ''}
                    onChange={(e) => updateNodeData(activeNode.id, { prompt_template: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono resize-y"
                    placeholder="Custom prompt template..."
                    rows={2}
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Response Template</label>
                  <textarea 
                    value={(data as any).response_template || ''}
                    onChange={(e) => updateNodeData(activeNode.id, { response_template: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono resize-y"
                    placeholder="Custom response template..."
                    rows={2}
                  />
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Description</label>
                <button 
                  onClick={() => handleAiSuggest('description')}
                  disabled={loadingFields['description']}
                  className={`p-1 transition-all duration-300 ${loadingFields['description'] ? 'animate-sparkle-shimmer cursor-wait' : 'text-brand-muted hover:text-indigo-500'}`}
                  title="Generate with AI"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
              <HighlightedTextField
                type="textarea"
                value={(data as any).description || ''}
                onKeyDown={(e) => handleFieldKeyDown(e)}
                onChange={(e) => handleFieldChange(e, 'description', (val) => updateNodeData(activeNode.id, { description: val }))}
                placeholder="What exactly needs to be done?"
                rows={4}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Expected Output</label>
                <button 
                  onClick={() => handleAiSuggest('expected_output')}
                  disabled={loadingFields['expected_output']}
                  className={`p-1 transition-all duration-300 ${loadingFields['expected_output'] ? 'animate-sparkle-shimmer cursor-wait' : 'text-brand-muted hover:text-indigo-500'}`}
                  title="Generate with AI"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
              <HighlightedTextField
                type="textarea"
                value={(data as any).expected_output || ''}
                onKeyDown={(e) => handleFieldKeyDown(e)}
                onChange={(e) => handleFieldChange(e, 'expected_output', (val) => updateNodeData(activeNode.id, { expected_output: val }))}
                placeholder="What should this task produce?"
                rows={3}
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

            <div className="flex flex-col gap-2 pt-4 border-t border-brand-border/50">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Custom Python Tools</label>
              <p className="text-[11px] text-brand-muted opacity-80 mb-2">
                Enable your custom Python tools for this task.
              </p>
              
              <div className="flex flex-wrap gap-2" data-testid="input-task-custom-tools">
                {((data as any).customToolIds || []).map((toolId: string) => {
                  const tool = customTools.find(t => t.id === toolId);
                  if (!tool) return null;
                  return (
                    <div key={toolId} className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-medium group">
                      <span className="truncate max-w-[120px]">{tool.name}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          const currentIds = (data as any).customToolIds || [];
                          const newIds = currentIds.filter((id: string) => id !== toolId);
                          updateNodeData(activeNode.id, { customToolIds: newIds });
                        }}
                        className="hover:bg-emerald-500/20 p-0.5 rounded transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
                
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setIsCustomToolSelectorOpen(!isCustomToolSelectorOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 border border-dashed border-brand-border hover:border-emerald-400 rounded-lg text-xs font-medium text-brand-muted hover:text-emerald-500 transition-all bg-brand-bg/50"
                  >
                    <Plus className="w-3 h-3" />
                    Add Custom Tool
                  </button>

                  {isCustomToolSelectorOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-[55]" 
                        onClick={() => setIsCustomToolSelectorOpen(false)}
                      />
                      <div className="absolute left-0 top-full mt-2 w-56 bg-brand-card border border-brand-border rounded-xl shadow-xl z-[60] py-2 animate-in fade-in zoom-in duration-200">
                        <div className="px-3 py-1.5 border-b border-brand-border mb-1">
                          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Select Custom Tool</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto px-1">
                          {customTools
                            .filter(t => !((data as any).customToolIds || []).includes(t.id))
                            .map(tool => (
                              <button
                                key={tool.id}
                                onClick={() => {
                                  const currentIds = (data as any).customToolIds || [];
                                  const newIds = [...currentIds, tool.id];
                                  updateNodeData(activeNode.id, { customToolIds: newIds });
                                  setIsCustomToolSelectorOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 text-xs text-brand-text hover:bg-brand-bg rounded-lg transition-colors text-left group"
                              >
                                <span className="truncate">{tool.name}</span>
                                <Plus className="w-3 h-3 text-brand-muted group-hover:text-emerald-500" />
                              </button>
                            ))}
                          {customTools.filter(t => !((data as any).customToolIds || []).includes(t.id)).length === 0 && (
                            <div className="px-3 py-4 text-center">
                              <p className="px-2 text-[10px] text-brand-muted italic">
                                {customTools.length === 0 
                                  ? 'No custom tools defined. Create them in Settings.' 
                                  : 'All custom tools already added.'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* -- Advanced Execution Settings -- */}
            <div className="flex flex-col gap-4 pt-4 border-t border-brand-border/50">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Execution Settings</label>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={(data as any).async_execution === true}
                      onChange={(e) => updateNodeData(activeNode.id, { async_execution: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${((data as any).async_execution === true) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${((data as any).async_execution === true) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-text group-hover:text-indigo-400 transition-colors">Async</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={(data as any).human_input === true}
                      onChange={(e) => updateNodeData(activeNode.id, { human_input: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${((data as any).human_input === true) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${((data as any).human_input === true) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-text group-hover:text-indigo-400 transition-colors">Human Input</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer group col-span-2">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={(data as any).create_directory === true}
                      onChange={(e) => updateNodeData(activeNode.id, { create_directory: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${((data as any).create_directory === true) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${((data as any).create_directory === true) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-text group-hover:text-indigo-400 transition-colors">Create Dir for Output File</span>
                </label>
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Output File</label>
                <input 
                  type="text" 
                  value={(data as any).output_file || ''}
                  onChange={(e) => updateNodeData(activeNode.id, { output_file: e.target.value })}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  placeholder="e.g. report.md"
                />
              </div>
            </div>
          </div>
        )}

        {type === 'crew' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Name</label>
              <input
                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
                  nameError
                    ? 'border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'border-brand-border focus:ring-blue-500 dark:focus:ring-blue-400 bg-brand-bg text-brand-text'
                }`}
                value={localName}
                onChange={handleNameChange}
                placeholder="e.g. My Awesome Crew"
              />
            </div>

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

            {/* -- Crew Inputs (Key-Value) -- */}
            <div className="flex flex-col gap-3 pt-5 border-t border-brand-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Execution Inputs</label>
                  <p className="text-[10px] text-brand-muted opacity-70 mt-0.5">
                    Variables available for your agents/tasks (e.g. {"{topic}"}).
                  </p>
                </div>
                <button
                  onClick={() => {
                    const currentInputs = (data as any).inputs || {};
                    const newId = `input_${Date.now()}`;
                    updateNodeData(activeNode.id, {
                      inputs: { ...currentInputs, [newId]: '' }
                    });
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-md text-[10px] font-bold uppercase transition-all hover:bg-blue-500/20 active:scale-95"
                  title="Add New Input Variable"
                >
                  <Plus className="w-3 h-3" />
                  Add Input
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {Object.entries((data as any).inputs || {}).map(([key, value], index) => {
                  const isTempKey = key.startsWith('input_');
                  return (
                    <div key={index} className="flex items-center gap-2 group animate-in fade-in slide-in-from-right-1 duration-200">
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <input
                          className="bg-brand-bg/50 border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-brand-text outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:opacity-50"
                          placeholder="Key (e.g. topic)"
                          value={isTempKey ? '' : key}
                          onChange={(e) => {
                            const newKey = e.target.value;
                            const currentInputs = { ...(data as any).inputs };
                            const oldValue = currentInputs[key];
                            delete currentInputs[key];
                            currentInputs[newKey || `input_${index}_${Date.now()}`] = oldValue;
                            updateNodeData(activeNode.id, { inputs: currentInputs });
                          }}
                        />
                        <input
                          className="bg-brand-bg/50 border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-secondary outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-medium"
                          placeholder="Value"
                          value={value as string}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            const currentInputs = { ...(data as any).inputs };
                            currentInputs[key] = newValue;
                            updateNodeData(activeNode.id, { inputs: currentInputs });
                          }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          const currentInputs = { ...(data as any).inputs };
                          delete currentInputs[key];
                          updateNodeData(activeNode.id, { inputs: currentInputs });
                        }}
                        className="p-1.5 text-brand-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Input"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                
                {Object.keys((data as any).inputs || {}).length === 0 && (
                  <div className="text-[10px] text-brand-muted italic py-4 text-center border border-dashed border-brand-border rounded-xl bg-brand-bg/20">
                    No inputs defined. Click "Add Input" to start.
                  </div>
                )}
              </div>
            </div>
            {/* -- Additional Settings -- */}
            <div className="flex flex-col gap-4 pt-5 border-t border-brand-border/50">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Additional Settings</label>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={(data as any).verbose !== false}
                      onChange={(e) => updateNodeData(activeNode.id, { verbose: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${((data as any).verbose !== false) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${((data as any).verbose !== false) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-text group-hover:text-indigo-400 transition-colors">Verbose</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={(data as any).memory === true}
                      onChange={(e) => updateNodeData(activeNode.id, { memory: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${((data as any).memory === true) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${((data as any).memory === true) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-text group-hover:text-indigo-400 transition-colors">Memory</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={(data as any).cache === true}
                      onChange={(e) => updateNodeData(activeNode.id, { cache: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${((data as any).cache === true) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${((data as any).cache === true) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-text group-hover:text-indigo-400 transition-colors">Cache</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={(data as any).share_crew === true}
                      onChange={(e) => updateNodeData(activeNode.id, { share_crew: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${((data as any).share_crew === true) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${((data as any).share_crew === true) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-text group-hover:text-indigo-400 transition-colors">Share Crew</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group col-span-2">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={(data as any).planning === true}
                      onChange={(e) => updateNodeData(activeNode.id, { planning: e.target.checked })}
                    />
                    <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${((data as any).planning === true) ? 'bg-indigo-500/20 border-indigo-500' : ''}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${((data as any).planning === true) ? 'translate-x-4 bg-indigo-500' : 'bg-brand-muted'}`} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-text group-hover:text-indigo-400 transition-colors">Enable Planning Phase</span>
                </label>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <label className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Max RPM</label>
                <input
                  type="number"
                  className="bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:opacity-50"
                  placeholder="Requests per minute (optional)"
                  value={(data as any).max_rpm || ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    updateNodeData(activeNode.id, { max_rpm: val });
                  }}
                />
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                  <label className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Manager LLM</label>
                </div>
                <select 
                  value={(data as any).manager_llm_id || ''}
                  onChange={(e) => updateNodeData(activeNode.id, { manager_llm_id: e.target.value || undefined })}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer appearance-none"
                >
                  <option value="">Default (Auto)</option>
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} {model.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-brand-muted opacity-80">
                  Required if process is Hierarchical.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Function Calling LLM</label>
                <select 
                  value={(data as any).function_calling_llm_id || ''}
                  onChange={(e) => updateNodeData(activeNode.id, { function_calling_llm_id: e.target.value || undefined })}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer appearance-none"
                >
                  <option value="">Default</option>
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} {model.isDefault ? '(Global)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-brand-muted opacity-80 mt-1">
                  Global fallback LLM to specifically handle function/tool calling for all agents.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Output Log File</label>
                <input 
                  type="text" 
                  value={(data as any).output_log_file || ''}
                  onChange={(e) => updateNodeData(activeNode.id, { output_log_file: e.target.value })}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  placeholder="e.g. logs.txt"
                />
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Prompt File (JSON)</label>
                <input 
                  type="text" 
                  value={(data as any).prompt_file || ''}
                  onChange={(e) => updateNodeData(activeNode.id, { prompt_file: e.target.value })}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  placeholder="e.g. prompt.json"
                />
              </div>
              
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Embedder Config (JSON)</label>
                <textarea 
                  value={(data as any).embedder || ''}
                  onChange={(e) => updateNodeData(activeNode.id, { embedder: e.target.value })}
                  className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-mono resize-y"
                  placeholder='{"provider": "openai"}'
                  rows={2}
                />
              </div>

              {(data as any).planning === true && (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                    <label className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Planning LLM</label>
                  </div>
                  <select 
                    value={(data as any).planning_llm_id || ''}
                    onChange={(e) => updateNodeData(activeNode.id, { planning_llm_id: e.target.value || undefined })}
                    className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer appearance-none"
                  >
                    <option value="">Default (Auto)</option>
                    {models.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} {model.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
