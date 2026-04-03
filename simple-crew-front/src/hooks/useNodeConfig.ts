import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { useStore } from '../store/index';
import type { AppState } from '../types/store.types';
import type { AppNode } from '../types/nodes.types';
import type { ToolConfig } from '../types/config.types';

export const useNodeConfig = () => {
  const activeNodeId = useStore((state: AppState) => state.activeNodeId);
  const nodes = useStore((state: AppState) => state.nodes);
  const edges = useStore((state: AppState) => state.edges);
  const setActiveNode = useStore((state: AppState) => state.setActiveNode);
  const updateNodeData = useStore((state: AppState) => state.updateNodeData);
  const deleteNode = useStore((state: AppState) => state.deleteNode);
  const updateCrewAgentOrder = useStore((state: AppState) => state.updateCrewAgentOrder);
  const updateCrewTaskOrder = useStore((state: AppState) => state.updateCrewTaskOrder);
  const updateAgentTaskOrder = useStore((state: AppState) => state.updateAgentTaskOrder);
  const models = useStore((state: AppState) => state.models);
  const mcpServers = useStore((state: AppState) => state.mcpServers);
  const suggestAiContent = useStore((state: AppState) => state.suggestAiContent);
  const suggestBulkAiContent = useStore((state: AppState) => state.suggestBulkAiContent);
  const suggestTaskBulkAiContent = useStore((state: AppState) => state.suggestTaskBulkAiContent);
  const customTools = useStore((state: AppState) => state.customTools);
  const globalTools = useStore((state: AppState) => state.globalTools);
  const nodeWarningsStore = useStore((state: AppState) => state.nodeWarnings);

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

  const activeNode = nodes.find((n: AppNode) => n.id === activeNodeId);
  const isCrew = activeNode?.type === 'crew';
  const isAgent = activeNode?.type === 'agent';
  const isTask = activeNode?.type === 'task';
  const isChat = activeNode?.type === 'chat';
  const isWebhook = activeNode?.type === 'webhook';

  useEffect(() => {
    if (activeNodeId) {
      const node = nodes.find((n) => n.id === activeNodeId);
      if (node) {
        setLocalName((node.data as any).name || '');
        setNameError(false);
        setIsContextSelectorOpen(false);
        setIsMcpSelectorOpen(false);
        setIsCustomToolSelectorOpen(false);
        setIsGlobalToolSelectorOpen(false);
        setIsChatMappingSelectorOpen(false);
      }
    }
  }, [activeNodeId, nodes]);

  const connectedAgents = useMemo(() => {
    if (!isCrew || !activeNodeId) return [];
    return edges
      .filter((e) => e.source === activeNodeId)
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter((n) => n?.type === 'agent') as AppNode[];
  }, [isCrew, activeNodeId, edges, nodes]);

  const connectedTasks = useMemo(() => {
    if (!activeNodeId) return [];
    if (isAgent) {
      return edges
        .filter((e) => e.source === activeNodeId)
        .map((e) => nodes.find((n) => n.id === e.target))
        .filter((n) => n?.type === 'task') as AppNode[];
    }
    if (isCrew) {
      const agentIds = new Set(connectedAgents.map(a => a.id));
      return nodes.filter(n => n.type === 'task' && edges.some(e => e.target === n.id && agentIds.has(e.source))) as AppNode[];
    }
    return [];
  }, [activeNodeId, isAgent, isCrew, edges, nodes, connectedAgents]);
  const renderableAgents = useMemo(() => {
    let list = [...connectedAgents];
    const order = (activeNode?.data as any)?.agentOrder as string[] | undefined;
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
    let list = [...connectedTasks];
    const order = (activeNode?.data as any)?.taskOrder as string[] | undefined;
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
      const order = (activeNode?.data as any)?.agentOrder as string[] | undefined;
      const currentIds = connectedAgents.map(a => a.id);
      
      // Check if order is missing any current IDs or has IDs that no longer exist
      const isMissing = currentIds.some(id => !order?.includes(id));
      const hasExtra = order?.some(id => !currentIds.includes(id));
      
      if (!order || isMissing || hasExtra) {
        // Only update if the content actually changes to avoid loops
        const orderedIds = renderableAgents.map(a => a.id);
        if (JSON.stringify(order) !== JSON.stringify(orderedIds)) {
          updateCrewAgentOrder(activeNodeId, orderedIds);
        }
      }
    }
  }, [connectedAgents.length, isCrew, activeNodeId, renderableAgents, updateCrewAgentOrder]);

  useEffect(() => {
    if ((isAgent || isCrew) && activeNodeId) {
      const order = (activeNode?.data as any)?.taskOrder as string[] | undefined;
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
  }, [connectedTasks.length, isAgent, isCrew, activeNodeId, renderableTasks, updateAgentTaskOrder, updateCrewTaskOrder]);

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
    const isDuplicate = nodes.some(
      (n) => n.id !== activeNode.id && n.type === activeNode.type && (n.data as any).name === value
    );
    setNameError(isDuplicate);
    if (!isDuplicate && activeNodeId) {
      updateNodeData(activeNodeId, { name: value });
    }
  }, [activeNode, nodes, activeNodeId, updateNodeData]);

  const handleAiSuggest = useCallback(async (field: string) => {
    if (!activeNodeId) return;
    setLoadingFields(prev => ({ ...prev, [field]: true }));
    try {
      await suggestAiContent(activeNodeId, field as any);
    } finally {
      setLoadingFields(prev => ({ ...prev, [field]: false }));
    }
  }, [activeNodeId, suggestAiContent]);

  const handleBulkAiSuggest = useCallback(async () => {
    if (!activeNodeId || !activeNode?.data) return;
    const { type, data } = activeNode;
    if (type === 'agent') {
      const agentName = (data as any).name;
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
      const taskName = (data as any).name;
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
    const currentData = activeNode.data as any;
    const currentValue = currentData[field] || '';
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
  }, [activeNodeId, activeNode, suggestionState, updateNodeData]);

  const handleFieldKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement | any>) => {
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
  }, [suggestionState, nodes, handleSelectSuggestion]);

  const handleFieldChange = useCallback((
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

    const textBeforeCursor = value.slice(0, cursorPos);
    const lastBraceIndex = textBeforeCursor.lastIndexOf('{');
    const lastCloseBraceIndex = textBeforeCursor.lastIndexOf('}');

    if (lastBraceIndex > lastCloseBraceIndex) {
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
  }, []);

  const allProjectVariables = useMemo(() => {
    const vars = new Set<string>();
    
    // 1. Inputs from Crew Node
    const crewNode = nodes.find(n => n.type === 'crew');
    if (crewNode) {
      const inputs = (crewNode.data as any)?.inputs || {};
      Object.keys(inputs).forEach(k => {
        if (!k.startsWith('input_')) vars.add(k);
      });
    }

    // 2. Scan all nodes for {variable} patterns
    const variableRegex = /\{([a-zA-Z0-9_-]+)\}/g;
    nodes.forEach(node => {
      const data = node.data as any;
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
  }, [nodes]);

  let connectedCrewInputs: string[] = [];
  let isChatConnected = false;
  if ((isChat || isWebhook) && activeNodeId) {
    const edgeToSource = edges.find(e => e.source === activeNodeId);
    if (edgeToSource) {
      const targetNode = nodes.find(n => n.id === edgeToSource.target);
      if (targetNode && targetNode.type === 'crew') {
        isChatConnected = true;
        connectedCrewInputs = Object.keys((targetNode.data as any)?.inputs || {}).filter(k => !k.startsWith('input_'));
      }
    }
  }

  return {
    activeNodeId,
    activeNode,
    nodes,
    edges,
    setActiveNode,
    updateNodeData,
    deleteNode,
    updateCrewAgentOrder,
    updateAgentTaskOrder,
    models,
    mcpServers,
    customTools,
    globalTools,
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
    nodeWarnings: activeNodeId ? (nodeWarningsStore[activeNodeId] || []) : []
  };
};
