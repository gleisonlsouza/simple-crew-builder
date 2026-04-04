import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { DragEndEvent } from '@dnd-kit/core';

// Mock Zustand store antes de importar
vi.mock('../../store/index', () => ({
  useStore: vi.fn(),
}));

import { useStore } from '../../store/index';
import { useNodeConfig } from '../useNodeConfig';
import type { AppNode, AppEdge } from '../../types/nodes.types';
import type { AppState } from '../../store/index';
import type { Mock } from 'vitest';
import React from 'react';

describe('useNodeConfig', () => {
  const mockNode = {
    id: 'node-1',
    type: 'agent',
    data: { 
      name: 'Test Agent', 
      role: 'Tester',
      goal: 'Test things',
      backstory: 'A test backstory'
    },
  };

  const mockStore = {
    activeNodeId: 'node-1',
    nodes: [mockNode] as unknown as AppNode[],
    edges: [] as AppEdge[],
    nodeWarnings: {} as Record<string, string[]>,
    setActiveNode: vi.fn(),
    updateNodeData: vi.fn(),
    deleteNode: vi.fn(),
    updateCrewAgentOrder: vi.fn(),
    updateCrewTaskOrder: vi.fn(),
    updateAgentTaskOrder: vi.fn(),
    models: [],
    mcpServers: [],
    suggestAiContent: vi.fn(),
    suggestBulkAiContent: vi.fn(),
    suggestTaskBulkAiContent: vi.fn(),
    customTools: [],
    globalTools: [],
    workspaces: [],
    settings: {},
  } as unknown as AppState;

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as Mock).mockImplementation((selector: (state: AppState) => unknown) => selector(mockStore));
  });

  it('should return initial values based on active node', () => {
    const { result } = renderHook(() => useNodeConfig());

    expect(result.current.activeNodeId).toBe('node-1');
  });

  describe('Suggestion System', () => {
    it('should open suggestion menu when typing "{"', () => {
      const { result } = renderHook(() => useNodeConfig());
      
      const mockEvent = {
        target: {
          value: 'This is a {',
          selectionStart: 11,
          getBoundingClientRect: () => ({ top: 10, left: 20, width: 100, height: 20 })
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleFieldChange(mockEvent, 'description', vi.fn());
      });

      expect(result.current.suggestionState.isOpen).toBe(true);
      expect(result.current.suggestionState.field).toBe('description');
    });

    it('should handle suggestion selection and inject into field', () => {
      // 1. Prepare store state with "Call {" already in the goal
      const nodeWithBrace = { 
        ...mockNode, 
        data: { ...mockNode.data, goal: 'Call {' } 
      };
      const storeWithBrace = { ...mockStore, nodes: [nodeWithBrace] as unknown as AppNode[] } as AppState;
      (useStore as unknown as Mock).mockImplementation((selector: (state: AppState) => unknown) => selector(storeWithBrace));

      const { result } = renderHook(() => useNodeConfig());

      // 2. Prepare suggestion state manually
      act(() => {
        result.current.setSuggestionState({
          isOpen: true,
          field: 'goal',
          filter: '',
          cursorPos: 6,
          anchorRect: null,
          selectedIndex: 0
        });
      });

      // 3. Select "api_key"
      act(() => {
        result.current.handleSelectSuggestion('api_key');
      });

      expect(storeWithBrace.updateNodeData).toHaveBeenCalledWith('node-1', expect.objectContaining({ 
        goal: 'Call {api_key}' 
      }));
      expect(result.current.suggestionState.isOpen).toBe(false);
    });
  });

  describe('Chat & Crew Logic', () => {
    it('should identify chat connection to crew and provide inputs', () => {
      const chatNode = { id: 'chat-1', type: 'chat', data: { name: 'Trigger' } } as unknown as AppNode;
      const crewNode = { id: 'crew-1', type: 'crew', data: { name: 'Main Crew', inputs: { topic: 'AI' } } } as unknown as AppNode;
      
      const storeWithChat = {
        ...mockStore,
        activeNodeId: 'chat-1',
        nodes: [chatNode, crewNode],
        edges: [{ id: 'e1', source: 'chat-1', target: 'crew-1' } as AppEdge]
      } as AppState;
      
      (useStore as unknown as Mock).mockImplementation((selector: (state: AppState) => unknown) => selector(storeWithChat));

      const { result } = renderHook(() => useNodeConfig());

      expect(result.current.isChatConnected).toBe(true);
      expect(result.current.connectedCrewInputs).toEqual(['topic']);
    });
  });

  describe('AI Suggestions', () => {
    it('should trigger individual AI suggestion', async () => {
      const { result } = renderHook(() => useNodeConfig());
      await act(async () => {
        await result.current.handleAiSuggest('role');
      });
      expect(mockStore.suggestAiContent).toHaveBeenCalledWith('node-1', 'role');
    });

    it('should trigger bulk AI suggestion for Agent', async () => {
      const { result } = renderHook(() => useNodeConfig());
      await act(async () => {
        await result.current.handleBulkAiSuggest();
      });
      expect(mockStore.suggestBulkAiContent).toHaveBeenCalledWith('node-1');
    });

    it('should trigger bulk AI suggestion for Task', async () => {
      const taskNode = { id: 'task-1', type: 'task', data: { name: 'Test Task' } } as unknown as AppNode;
      const storeWithTask = { ...mockStore, activeNodeId: 'task-1', nodes: [taskNode] } as AppState;
      (useStore as unknown as Mock).mockImplementation((selector: (state: AppState) => unknown) => selector(storeWithTask));

      const { result } = renderHook(() => useNodeConfig());
      await act(async () => {
        await result.current.handleBulkAiSuggest();
      });
      expect(mockStore.suggestTaskBulkAiContent).toHaveBeenCalledWith('task-1');
    });

    it('should show error if bulk suggest is called without name', async () => {
      const namelessAgent = { id: 'a1', type: 'agent', data: { name: '' } } as unknown as AppNode;
      const storeNoName = { ...mockStore, activeNodeId: 'a1', nodes: [namelessAgent] } as AppState;
      (useStore as unknown as Mock).mockImplementation((selector: (state: AppState) => unknown) => selector(storeNoName));
      
      const toast = await import('react-hot-toast');
      const spy = vi.spyOn(toast.default, 'error');

      const { result } = renderHook(() => useNodeConfig());
      await act(async () => {
        await result.current.handleBulkAiSuggest();
      });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('define a name'));
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle ArrowDown, ArrowUp and Enter in suggestion menu', () => {
      const chatNode = { id: 'chat-1', type: 'chat', data: { name: 'Chat', message: 'Send {' } } as unknown as AppNode;
      const crewNode = { id: 'crew-1', type: 'crew', data: { name: 'Crew', inputs: { topic: 'AI', context: 'Test' } } } as unknown as AppNode;
      
      mockStore.activeNodeId = 'chat-1';
      mockStore.nodes = [chatNode, crewNode] as unknown as AppNode[];
      mockStore.edges = [{ id: 'e1', source: 'chat-1', target: 'crew-1' } as AppEdge] as unknown as AppEdge[];

      const { result } = renderHook(() => useNodeConfig());

      // Open suggestion
      act(() => {
        result.current.setSuggestionState({ 
          isOpen: true, 
          selectedIndex: 0,
          field: 'message',
          filter: '',
          cursorPos: 6,
          anchorRect: null
        });
      });

      // ArrowDown
      act(() => {
        result.current.handleFieldKeyDown({ key: 'ArrowDown', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>);
      });
      expect(result.current.suggestionState.selectedIndex).toBe(1);

      // ArrowUp
      act(() => {
        result.current.handleFieldKeyDown({ key: 'ArrowUp', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>);
      });
      expect(result.current.suggestionState.selectedIndex).toBe(0);

      // Enter
      act(() => {
        result.current.handleFieldKeyDown({ key: 'Enter', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>);
      });
      expect(mockStore.updateNodeData).toHaveBeenCalled();
    });

    it('should close suggestion on Escape', () => {
      const { result } = renderHook(() => useNodeConfig());
      act(() => {
        result.current.setSuggestionState((prev) => ({ ...prev, isOpen: true }));
      });
      act(() => {
        result.current.handleFieldKeyDown({ key: 'Escape' } as unknown as React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>);
      });
      expect(result.current.suggestionState.isOpen).toBe(false);
    });
  });

  describe('Drag and Drop Order', () => {
    it('should update crew agent order on drag end', () => {
      const crewNode = { id: 'crew-1', type: 'crew', data: { agentOrder: ['a1', 'a2'] } } as unknown as AppNode;
      const agent1 = { id: 'a1', type: 'agent', data: { name: 'A1' } } as unknown as AppNode;
      const agent2 = { id: 'a2', type: 'agent', data: { name: 'A2' } } as unknown as AppNode;
      
      mockStore.activeNodeId = 'crew-1';
      mockStore.nodes = [crewNode, agent1, agent2] as unknown as AppNode[];
      mockStore.edges = [
        { id: 'e1', source: 'crew-1', target: 'a1' },
        { id: 'e2', source: 'crew-1', target: 'a2' }
      ] as unknown as AppEdge[];

      const { result } = renderHook(() => useNodeConfig());
      act(() => {
        result.current.handleAgentDragEnd({ active: { id: 'a1' }, over: { id: 'a2' } } as unknown as DragEndEvent);
      });
      expect(mockStore.updateCrewAgentOrder).toHaveBeenCalled();
    });

    it('should update task order on drag end', () => {
      const agentNode = { id: 'a1', type: 'agent', data: { taskOrder: ['t1', 't2'] } } as unknown as AppNode;
      const t1 = { id: 't1', type: 'task', data: { name: 'T1' } } as unknown as AppNode;
      const t2 = { id: 't2', type: 'task', data: { name: 'T2' } } as unknown as AppNode;
      
      mockStore.activeNodeId = 'a1';
      mockStore.nodes = [agentNode, t1, t2] as unknown as AppNode[];
      mockStore.edges = [
        { id: 'e1', source: 'a1', target: 't1' },
        { id: 'e2', source: 'a1', target: 't2' }
      ] as unknown as AppEdge[];

      const { result } = renderHook(() => useNodeConfig());
      act(() => {
        result.current.handleTaskDragEnd({ active: { id: 't1' }, over: { id: 't2' } } as unknown as DragEndEvent);
      });
      expect(mockStore.updateAgentTaskOrder).toHaveBeenCalled();
    });
    it('should update task order on drag end for crew node', () => {
      const crewNode = { id: 'crew-1', type: 'crew', data: { taskOrder: ['t1', 't2'] } } as unknown as AppNode;
      const t1 = { id: 't1', type: 'task', data: { name: 'T1' } } as unknown as AppNode;
      const t2 = { id: 't2', type: 'task', data: { name: 'T2' } } as unknown as AppNode;
      const agentNode = { id: 'a1', type: 'agent', data: { name: 'A' } } as unknown as AppNode;
      
      const storeState = { ...mockStore, activeNodeId: 'crew-1', nodes: [crewNode, agentNode, t1, t2], edges: [ { source: 'a1', target: 't1' }, { source: 'a1', target: 't2' }, { source: 'crew-1', target: 'a1' } ] } as unknown as AppState;
      (useStore as unknown as Mock).mockImplementation((selector: (state: AppState) => unknown) => selector(storeState));

      const { result } = renderHook(() => useNodeConfig());
      act(() => {
        result.current.handleTaskDragEnd({ active: { id: 't1' }, over: { id: 't2' } } as unknown as DragEndEvent);
      });
      expect(storeState.updateCrewTaskOrder).toHaveBeenCalled();
    });
  });

  describe('Missing Branches and Variables Extraction', () => {
    it('useEffect: should trigger updateCrewAgentOrder if missing agents in order', () => {
      const crewNode = { id: 'crew-1', type: 'crew', data: { agentOrder: ['a1'] } } as unknown as AppNode;
      const agent1 = { id: 'a1', type: 'agent', data: { name: 'A1' } } as unknown as AppNode;
      const agent2 = { id: 'a2', type: 'agent', data: { name: 'A2' } } as unknown as AppNode;
      const storeState = { ...mockStore, activeNodeId: 'crew-1', nodes: [crewNode, agent1, agent2], edges: [ { source: 'crew-1', target: 'a1' }, { source: 'crew-1', target: 'a2' } ] } as unknown as AppState;
      (useStore as unknown as Mock).mockImplementation((selector: (state: AppState) => unknown) => selector(storeState));

      renderHook(() => useNodeConfig());
      expect(storeState.updateCrewAgentOrder).toHaveBeenCalledWith('crew-1', ['a1', 'a2']);
    });

    it('should set name error if duplicate exists', () => {
      const agent1 = { id: 'a1', type: 'agent', data: { name: 'Existing' } } as unknown as AppNode;
      const agent2 = { id: 'a2', type: 'agent', data: { name: 'New' } } as unknown as AppNode;
      const storeState = { ...mockStore, activeNodeId: 'a2', nodes: [agent1, agent2] } as unknown as AppState;
      (useStore as unknown as Mock).mockImplementation((selector: (state: AppState) => unknown) => selector(storeState));

      const { result } = renderHook(() => useNodeConfig());
      act(() => {
        result.current.handleNameChange({ target: { value: 'Existing' } } as React.ChangeEvent<HTMLInputElement>);
      });
      expect(result.current.nameError).toBe(true);
      expect(storeState.updateNodeData).not.toHaveBeenCalled();
    });

    it('should update name if not duplicate', () => {
      const agent2 = { id: 'a2', type: 'agent', data: { name: 'Existing' } } as unknown as AppNode;
      const storeState = { ...mockStore, activeNodeId: 'a2', nodes: [agent2] } as unknown as AppState;
      (useStore as unknown as Mock).mockImplementation((selector: (state: AppState) => unknown) => selector(storeState));

      const { result } = renderHook(() => useNodeConfig());
      act(() => {
        result.current.handleNameChange({ target: { value: 'New Name' } } as React.ChangeEvent<HTMLInputElement>);
      });
      expect(result.current.nameError).toBe(false);
      expect(storeState.updateNodeData).toHaveBeenCalledWith('a2', { name: 'New Name' });
    });

    it('should show error if bulk suggest is called for task without name', async () => {
      const namelessTask = { id: 't1', type: 'task', data: { name: '' } } as unknown as AppNode;
      const storeState = { ...mockStore, activeNodeId: 't1', nodes: [namelessTask] } as unknown as AppState;
      (useStore as unknown as Mock).mockImplementation((selector: (state: AppState) => unknown) => selector(storeState));
      
      const toast = await import('react-hot-toast');
      const spy = vi.spyOn(toast.default, 'error');

      const { result } = renderHook(() => useNodeConfig());
      await act(async () => {
        await result.current.handleBulkAiSuggest();
      });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('define a name for the Task'));
    });

    it('should not open suggestion menu and close it if open, when typing normal text', () => {
      const { result } = renderHook(() => useNodeConfig());
      act(() => {
        result.current.handleFieldChange({ target: { value: 'Normal text {}', selectionStart: 14 } } as unknown as React.ChangeEvent<HTMLInputElement>, 'description', vi.fn());
      });
      expect(result.current.suggestionState.isOpen).toBe(false);
    });

    it('should extract variables from all nodes in the project correctly', () => {
      const agentNode = { id: 'a1', type: 'agent', data: { role: 'I am {agent_var}' } } as unknown as AppNode;
      const taskNode = { id: 't1', type: 'task', data: { description: 'Do {task_var}' } } as unknown as AppNode;
      const storeState = { ...mockStore, nodes: [agentNode, taskNode] } as unknown as AppState;
      (useStore as unknown as Mock).mockImplementation((selector: (state: AppState) => unknown) => selector(storeState));

      const { result } = renderHook(() => useNodeConfig());
      expect(result.current.allProjectVariables).toContain('agent_var');
      expect(result.current.allProjectVariables).toContain('task_var');
    });
});
  });
