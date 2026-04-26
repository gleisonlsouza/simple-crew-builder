import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { useStore } from '../store/index';
import type { AppState } from '../types/store.types';
import type { AppNode } from '../types/nodes.types';
import type { ToolConfig } from '../types/config.types';
import { useGraphVariables } from './useGraphVariables';

export const useNodeConfig = () => {
  const activeNodeId = useStore((state: AppState) => state.activeNodeId);
  
  // Use a stable selector for the active node to avoid re-rendering on every nodes change
  const activeNode = useStore(useCallback((state: AppState) => 
    state.nodes.find((n) => n.id === state.activeNodeId), []
  ));

  // Only expose a stable list of nodes for forms that need it (like TaskForm context)
  const nodes = useStore((state: AppState) => 
    state.nodes.map(n => ({ id: n.id, type: n.type, data: { name: (n.data as { name?: string }).name, inputs: (n.data as { inputs?: Record<string, string> }).inputs } })),
    (a, b) => JSON.stringify(a) === JSON.stringify(b)
  );

  const edges = useStore((state: AppState) => state.edges);
  const setActiveNode = useStore((state: AppState) => state.setActiveNode);
  const updateNodeData = useStore((state: AppState) => state.updateNodeData);
  const deleteNode = useStore((state: AppState) => state.deleteNode);
  const updateCrewAgentOrder = useStore((state: AppState) => state.updateCrewAgentOrder);
  const updateCrewTaskOrder = useStore((state: AppState) => state.updateCrewTaskOrder);
  const updateAgentTaskOrder = useStore((state: AppState) => state.updateAgentTaskOrder);
  const updateStateConnection = useStore((state: AppState) => state.updateStateConnection);
  const models = useStore((state: AppState) => state.models);
  const mcpServers = useStore((state: AppState) => state.mcpServers);
  const suggestAiContent = useStore((state: AppState) => state.suggestAiContent);
  const suggestBulkAiContent = useStore((state: AppState) => state.suggestBulkAiContent);
  const suggestTaskBulkAiContent = useStore((state: AppState) => state.suggestTaskBulkAiContent);
  const customTools = useStore((state: AppState) => state.customTools);
  const globalTools = useStore((state: AppState) => state.globalTools);
  const skills = useStore((state: AppState) => state.skills);
  const nodeWarningsStore = useStore((state: AppState) => state.nodeWarnings);


  const { variables, framework } = useGraphVariables();

  const [localName, setLocalName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [isContextSelectorOpen, setIsContextSelectorOpen] = useState(false);
  const [isMcpSelectorOpen, setIsMcpSelectorOpen] = useState(false);
  const [isCustomToolSelectorOpen, setIsCustomToolSelectorOpen] = useState(false);
  const [isGlobalToolSelectorOpen, setIsGlobalToolSelectorOpen] = useState(false);
  const [isChatMappingSelectorOpen, setIsChatMappingSelectorOpen] = useState(false);
  const [loadingFields, setLoadingFields] = useState<Record<string, boolean>>({});

  const [isToolConfigModalOpen, setIsToolConfigModalOpen] = useState(false);
  const [toolToConfigure, setToolToConfigure] = useState<ToolConfig | null>(null);

  // Simple debounce implementation to avoid lodash dependency
  const debounce = useCallback(<T extends unknown[]>(fn: (...args: T) => void, ms: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function(...args: T) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), ms);
    };
  }, []);

  // Accumulate updates to avoid losing data when multiple fields are updated within the debounce window
  const pendingUpdatesRef = useRef<Record<string, Record<string, unknown>>>({});

  // Debounced update to avoid re-rendering the whole canvas on every keystroke
  const debouncedUpdateRef = useRef(
    debounce((id: string) => {
      const data = pendingUpdatesRef.current[id];
      if (data) {
        delete pendingUpdatesRef.current[id];
        useStore.getState().updateNodeData(id, data);
      }
    }, 500)
  );

  const updateNodeDataDebounced = useCallback((id: string, data: Record<string, unknown>) => {
    // For some fields we want immediate update, for others we debounce
    const immediateFields = ['isCollapsed', 'modelId', 'selectedStateId', 'showStateConnections', 'inputs'];
    const hasImmediate = Object.keys(data).some(k => immediateFields.includes(k));
    
    if (hasImmediate) {
      updateNodeData(id, data);
    } else {
      // Merge into pending updates for this specific node
      pendingUpdatesRef.current[id] = { 
        ...(pendingUpdatesRef.current[id] || {}), 
        ...data 
      };
      debouncedUpdateRef.current(id);
    }
  }, [updateNodeData]);

  const [suggestionState, setSuggestionState] = useState<{
    isOpen: boolean;
    field: string;
    filter: string;
    cursorPos: number;
    anchorRect: DOMRect | null;
    cursorRect: { top: number; left: number; height: number } | null;
    selectedIndex: number;
  }>({
    isOpen: false,
    field: '',
    filter: '',
    cursorPos: 0,
    anchorRect: null,
    cursorRect: null,
    selectedIndex: 0
  });

  const isCrew = activeNode?.type === 'crew';
  const isAgent = activeNode?.type === 'agent';
  const isTask = activeNode?.type === 'task';
  const isChat = activeNode?.type === 'chat';
  const isWebhook = activeNode?.type === 'webhook';

  useEffect(() => {
    if (activeNodeId && activeNode) {
        const data = activeNode.data;
        setLocalName((data as { name?: string }).name || '');
        setNameError(false);
        setIsContextSelectorOpen(false);
        setIsMcpSelectorOpen(false);
        setIsCustomToolSelectorOpen(false);
        setIsGlobalToolSelectorOpen(false);
        setIsChatMappingSelectorOpen(false);
    }
  }, [activeNodeId, activeNode]);

  const connectedAgents = useMemo(() => {
    if (!isCrew || !activeNodeId) return [];
    return edges
      .filter((e) => e.source === activeNodeId)
      .map((e) => useStore.getState().nodes.find((n) => n.id === e.target))
      .filter((n) => n?.type === 'agent') as AppNode[];
  }, [isCrew, activeNodeId, edges]);

  const connectedTasks = useMemo(() => {
    if (!activeNodeId) return [];
    const allNodes = useStore.getState().nodes;
    if (isAgent) {
      return edges
        .filter((e) => e.source === activeNodeId)
        .map((e) => allNodes.find((n) => n.id === e.target))
        .filter((n) => n?.type === 'task') as AppNode[];
    }
    if (isCrew) {
      const agentIds = new Set(connectedAgents.map(a => a.id));
      return allNodes.filter(n => n.type === 'task' && edges.some(e => e.target === n.id && agentIds.has(e.source))) as AppNode[];
    }
    return [];
  }, [activeNodeId, isAgent, isCrew, edges, connectedAgents]);

  const renderableAgents = useMemo(() => {
    const list = [...connectedAgents];
    const order = (activeNode?.data as { agentOrder?: string[] })?.agentOrder;
    if (isCrew && order && order.length > 0) {
      list.sort((a, b) => {
        const idxA = order.indexOf(a.id);
        const idxB = order.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }
    return list;
  }, [connectedAgents, activeNode?.data, isCrew]);

  const renderableTasks = useMemo(() => {
    const list = [...connectedTasks];
    const order = (activeNode?.data as { taskOrder?: string[] })?.taskOrder;
    if ((isAgent || isCrew) && order && order.length > 0) {
      list.sort((a, b) => {
        const idxA = order.indexOf(a.id);
        const idxB = order.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }
    return list;
  }, [connectedTasks, activeNode?.data, isAgent, isCrew]);

  useEffect(() => {
    if (isCrew && activeNodeId) {
      const order = (activeNode?.data as { agentOrder?: string[] })?.agentOrder;
      const currentIds = connectedAgents.map(a => a.id);
      
      const isMissing = currentIds.some(id => !order?.includes(id));
      const hasExtra = order?.some(id => !currentIds.includes(id));
      
      if (!order || isMissing || hasExtra) {
        const orderedIds = renderableAgents.map(a => a.id);
        if (JSON.stringify(order) !== JSON.stringify(orderedIds)) {
          updateCrewAgentOrder(activeNodeId, orderedIds);
        }
      }
    }
  }, [connectedAgents, isCrew, activeNodeId, renderableAgents, updateCrewAgentOrder, activeNode?.data]);

  useEffect(() => {
    if ((isAgent || isCrew) && activeNodeId) {
      const order = (activeNode?.data as { taskOrder?: string[] })?.taskOrder;
      const currentIds = connectedTasks.map(a => a.id);
      
      const isMissing = currentIds.some(id => !order?.includes(id));
      const hasExtra = order?.some(id => !currentIds.includes(id));
      
      if (!order || isMissing || hasExtra) {
        const orderedIds = renderableTasks.map(t => t.id);
        if (JSON.stringify(order) !== JSON.stringify(orderedIds)) {
          if (isAgent) updateAgentTaskOrder(activeNodeId, orderedIds);
          else if (isCrew) updateCrewTaskOrder(activeNodeId, orderedIds);
        }
      }
    }
  }, [connectedTasks, isAgent, isCrew, activeNodeId, renderableTasks, updateAgentTaskOrder, updateCrewTaskOrder, activeNode?.data]);

  const handleAgentDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (activeNodeId && over && active.id !== over.id) {
      const oldIndex = renderableAgents.findIndex((a) => a.id === active.id);
      const newIndex = renderableAgents.findIndex((a) => a.id === over.id);
      const computedNewOrder = arrayMove(renderableAgents, oldIndex, newIndex);
      const newOrderIds = computedNewOrder.map((a) => a.id);
      updateCrewAgentOrder(activeNodeId, newOrderIds);
    }
  }, [activeNodeId, renderableAgents, updateCrewAgentOrder]);

  const handleTaskDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (activeNodeId && over && active.id !== over.id) {
      const oldIndex = renderableTasks.findIndex((a) => a.id === active.id);
      const newIndex = renderableTasks.findIndex((a) => a.id === over.id);
      const computedNewOrder = arrayMove(renderableTasks, oldIndex, newIndex);
      const newOrderIds = computedNewOrder.map((a) => a.id);
      if (isAgent) updateAgentTaskOrder(activeNodeId, newOrderIds);
      else if (isCrew) updateCrewTaskOrder(activeNodeId, newOrderIds);
    }
  }, [activeNodeId, renderableTasks, isAgent, isCrew, updateAgentTaskOrder, updateCrewTaskOrder]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalName(value);
    if (!activeNode) return;
    
    // Perform duplicate check against all nodes (expensive, but only on name change)
    const allNodes = useStore.getState().nodes;
    const isDuplicate = allNodes.some(
      (n) => n.id !== activeNode.id && n.type === activeNode.type && (n.data as { name?: string }).name === value
    );
    setNameError(isDuplicate);
    if (!isDuplicate && activeNodeId) {
      updateNodeData(activeNodeId, { name: value });
    }
  }, [activeNode, activeNodeId, updateNodeData]);

  const handleAiSuggest = useCallback(async (field: string) => {
    if (!activeNodeId) return;
    setLoadingFields(prev => ({ ...prev, [field]: true }));
    try {
      await suggestAiContent(activeNodeId, field as 'role' | 'goal' | 'backstory' | 'description' | 'expected_output');
    } finally {
      setLoadingFields(prev => ({ ...prev, [field]: false }));
    }
  }, [activeNodeId, suggestAiContent]);

  const handleBulkAiSuggest = useCallback(async () => {
    if (!activeNodeId || !activeNode?.data) return;
    const { type, data } = activeNode;
    if (type === 'agent') {
      const agentName = (data as { name?: string }).name;
      if (!agentName || agentName.trim() === '') {
        toast.error('Please define a name for the Agent first.');
        return;
      }
      setLoadingFields(prev => ({ ...prev, role: true, goal: true, backstory: true }));
      try {
        await suggestBulkAiContent(activeNodeId);
      } finally {
        setLoadingFields(prev => ({ ...prev, role: false, goal: false, backstory: false }));
      }
    } else if (type === 'task') {
      const taskName = (data as { name?: string }).name;
      if (!taskName || taskName.trim() === '') {
        toast.error('Please define a name for the Task first.');
        return;
      }
      setLoadingFields(prev => ({ ...prev, description: true, expected_output: true }));
      try {
        await suggestTaskBulkAiContent(activeNodeId);
      } finally {
        setLoadingFields(prev => ({ ...prev, description: false, expected_output: false }));
      }
    }
  }, [activeNodeId, activeNode, suggestBulkAiContent, suggestTaskBulkAiContent]);

  const handleSelectSuggestion = useCallback((suggestion: string) => {
    if (!activeNodeId || !activeNode) return;
    const { field, cursorPos } = suggestionState;
    const currentData = activeNode.data as Record<string, string>;
    const currentValue = currentData[field] || '';
    const textBeforeCursor = currentValue.slice(0, cursorPos);
    const lastBraceIndex = textBeforeCursor.lastIndexOf('{');
    
    if (lastBraceIndex !== -1) {
      // Use double braces and $json syntax for LangGraph variables if it contains dots or if we want to standardize
      const isLangGraph = framework === 'langgraph';
      const formattedSuggestion = isLangGraph ? `${suggestion}` : suggestion;
      
      const newValue = 
        currentValue.slice(0, lastBraceIndex) + 
        `{${formattedSuggestion}}` + 
        currentValue.slice(cursorPos);
      updateNodeData(activeNodeId, { [field]: newValue });
    }
    setSuggestionState(prev => ({ ...prev, isOpen: false }));
  }, [activeNodeId, activeNode, suggestionState, updateNodeData, framework]);

  const filteredSuggestions = useMemo(() => {
    if (!suggestionState.isOpen) return [];
    
    const parts = suggestionState.filter.split('.');
    let currentTree = variables;
    let pathPrefix = '';

    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (currentTree[part] && currentTree[part].children) {
            currentTree = currentTree[part].children!;
            pathPrefix += part + '.';
        } else {
            break;
        }
    }

    const lastPart = parts[parts.length - 1].toLowerCase();
    return Object.entries(currentTree)
      .filter(([key]) => key.toLowerCase().includes(lastPart))
      .map(([key]) => pathPrefix + key);
  }, [suggestionState.isOpen, suggestionState.filter, variables]);

  const handleFieldKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (suggestionState.isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionState(prev => ({ 
          ...prev, 
          selectedIndex: (prev.selectedIndex + 1) % (filteredSuggestions.length || 1) 
        }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionState(prev => ({ 
          ...prev, 
          selectedIndex: (prev.selectedIndex - 1 + (filteredSuggestions.length || 1)) % (filteredSuggestions.length || 1) 
        }));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filteredSuggestions.length > 0) {
            e.preventDefault();
            handleSelectSuggestion(filteredSuggestions[suggestionState.selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        setSuggestionState(prev => ({ ...prev, isOpen: false }));
      }
    }
  }, [suggestionState, filteredSuggestions, handleSelectSuggestion]);

  const handleFieldChange = useCallback((
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement> | { target: { value: string, selectionStart?: number, cursorRect?: { top: number, left: number, height: number } } }, 
    field: string,
    updateFn: (val: string) => void
  ) => {
    const value = e.target.value;
    const target = e.target as { 
      value: string; 
      selectionStart?: number; 
      cursorRect?: { top: number; left: number; height: number };
      getBoundingClientRect?: () => DOMRect;
    };
    const cursorPos = (typeof target.selectionStart === 'number' && target.selectionStart > 0) 
      ? target.selectionStart 
      : value.length;
    const cursorRect = target.cursorRect || null;

    updateFn(value);

    const textBeforeCursor = value.slice(0, cursorPos);
    const lastBraceIndex = textBeforeCursor.lastIndexOf('{');
    const lastCloseBraceIndex = textBeforeCursor.lastIndexOf('}');

    if (lastBraceIndex > lastCloseBraceIndex) {
      const filter = textBeforeCursor.slice(lastBraceIndex + 1);
      const rect = target.getBoundingClientRect ? target.getBoundingClientRect() : null;
      setSuggestionState({
        isOpen: true,
        field,
        filter,
        cursorPos,
        anchorRect: rect,
        cursorRect,
        selectedIndex: 0
      });
    } else {
      setSuggestionState(prev => ({ ...prev, isOpen: false }));
    }
  }, []);

  const allProjectVariables = useMemo(() => {
    const vars = new Set<string>();
    const allNodes = useStore.getState().nodes;
    
    // 1. Inputs from Crew Node
    const crewNode = allNodes.find(n => n.type === 'crew');
    if (crewNode) {
      const inputs = (crewNode.data as { inputs?: Record<string, string> })?.inputs || {};
      Object.keys(inputs).forEach(k => {
        if (!k.startsWith('input_')) vars.add(k);
      });
    }

    // 2. Scan all nodes for {variable} patterns
    const variableRegex = /\{([a-zA-Z0-9_-]+)\}/g;
    allNodes.forEach(node => {
      const data = node.data as Record<string, string>;
      const fieldsToScan = [
        data.role, data.goal, data.backstory,
        data.description, data.expected_output,
        data.system_template, data.prompt_template, data.response_template
      ];
      
      fieldsToScan.forEach(field => {
        if (typeof field === 'string') {
          let match;
          while ((match = variableRegex.exec(field)) !== null) {
            vars.add(match[1]);
          }
        }
      });
    });

    return Array.from(vars).sort();
  }, []); // Only compute once or when needed via a different trigger

  let connectedCrewInputs: string[] = [];
  let isChatConnected = false;
  if ((isChat || isWebhook) && activeNodeId) {
    const edgeToSource = edges.find(e => e.source === activeNodeId);
    if (edgeToSource) {
      const targetNode = nodes.find(n => n.id === edgeToSource.target);
      if (targetNode && targetNode.type === 'crew') {
        isChatConnected = true;
        connectedCrewInputs = Object.keys((targetNode.data as { inputs?: Record<string, string> })?.inputs || {}).filter(k => !k.startsWith('input_'));
      }
    }
  }
  
  const currentProjectFramework = useStore((state: AppState) => state.currentProjectFramework);

  // Maintain backward compatibility for state nodes/fields
  const stateNodes = useMemo(() => {
    const allNodes = useStore.getState().nodes;
    return allNodes.filter(n => n.type === 'state').map(n => ({
      id: n.id,
      name: (n.data as { name?: string }).name || 'State',
      fields: ((n.data as { fields?: { key: string; type: string }[] }).fields || []).map(f => {
        // Find corresponding schema children from our new tree
        const treeField = variables[f.key];
        const childrenKeys = treeField?.children ? Object.keys(treeField.children) : undefined;
        return {
          key: f.key,
          type: f.type,
          subKeys: childrenKeys ? childrenKeys.map(sk => `${f.key}.${sk}`) : undefined,
        };
      }),
    }));
  }, [variables]);

  const stateFields = useMemo(() =>
    stateNodes.flatMap(s =>
      s.fields.flatMap(f => (f.subKeys ? f.subKeys : [f.key]))
    ),
  [stateNodes]);

  return {
    activeNodeId,
    activeNode,
    nodes,
    edges,
    setActiveNode,
    updateNodeData: updateNodeDataDebounced,
    deleteNode,
    updateCrewAgentOrder,
    updateAgentTaskOrder,
    models,
    mcpServers,
    customTools,
    globalTools,
    skills,
    localName,

    nameError,
    isContextSelectorOpen,
    setIsContextSelectorOpen,
    isMcpSelectorOpen,
    setIsMcpSelectorOpen,
    isCustomToolSelectorOpen,
    setIsCustomToolSelectorOpen,
    isGlobalToolSelectorOpen,
    setIsGlobalToolSelectorOpen,
    isChatMappingSelectorOpen,
    setIsChatMappingSelectorOpen,
    loadingFields,
    isToolConfigModalOpen,
    setIsToolConfigModalOpen,
    toolToConfigure,
    setToolToConfigure,
    suggestionState,
    setSuggestionState,
    isCrew,
    isAgent,
    isTask,
    isChat,
    isWebhook,
    renderableAgents,
    renderableTasks,
    handleAgentDragEnd,
    handleTaskDragEnd,
    handleNameChange,
    handleAiSuggest,
    handleBulkAiSuggest,
    handleSelectSuggestion,
    handleFieldKeyDown,
    handleFieldChange,
    connectedCrewInputs,
    isChatConnected,
    allProjectVariables,
    stateFields,
    stateNodes,
    variables,
    currentProjectFramework,
    updateStateConnection,
    nodeWarnings: activeNodeId ? (nodeWarningsStore[activeNodeId] || []) : []
  };
};
