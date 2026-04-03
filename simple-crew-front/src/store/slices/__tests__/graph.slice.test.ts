import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGraphSlice } from '../graph.slice';
import type { AppNode, AppEdge } from '../../../types/nodes.types';

describe('graphSlice', () => {
  let set: any;
  let get: any;
  let slice: any;
  let mockState: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockState = {
      nodes: [],
      edges: [],
      nodeStatuses: {},
      nodeErrors: {},
      nodeWarnings: {},
      activeNodeId: null,
      setIsChatVisible: vi.fn(),
      validateGraph: vi.fn(),
    };

    set = vi.fn((update) => {
      if (typeof update === 'function') {
        const result = update(mockState);
        Object.assign(mockState, result);
      } else {
        Object.assign(mockState, update);
      }
    });
    
    get = vi.fn(() => mockState);
    slice = createGraphSlice(set, get, {} as any);
  });

  it('onNodesChange: applies node changes', () => {
    const initialNodes: AppNode[] = [{ id: '1', type: 'agent', position: { x: 0, y: 0 }, data: {} as any }];
    mockState.nodes = initialNodes;
    
    const changes: any[] = [{ type: 'position', id: '1', position: { x: 10, y: 10 } }];
    slice.onNodesChange(changes);
    
    expect(mockState.nodes[0].position).toEqual({ x: 10, y: 10 });
  });

  it('onNodesChange: handles node removal and cleans up taskOrder in agents', () => {
    const nodes: AppNode[] = [
      { id: 'a1', type: 'agent', position: { x: 0, y: 0 }, data: { taskOrder: ['t1', 't2'] } as any },
      { id: 't1', type: 'task', position: { x: 0, y: 0 }, data: {} as any }
    ];
    mockState.nodes = nodes;
    
    const changes: any[] = [{ type: 'remove', id: 't1' }];
    slice.onNodesChange(changes);
    
    // Node t1 should be removed
    expect(mockState.nodes.find((n: any) => n.id === 't1')).toBeUndefined();
    // Agent a1 should have t1 removed from taskOrder
    const agent = mockState.nodes.find((n: any) => n.id === 'a1');
    expect(agent.data.taskOrder).toEqual(['t2']);
  });

  it('onEdgesChange: applies edge changes', () => {
    const initialEdges: AppEdge[] = [{ id: 'e1', source: 'a1', target: 't1' }];
    mockState.edges = initialEdges;
    
    const changes: any[] = [{ type: 'remove', id: 'e1' }];
    slice.onEdgesChange(changes);
    
    expect(mockState.edges).toHaveLength(0);
  });

  it('onEdgesChange: handles edge removal and updates taskOrder', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', position: { x: 0, y: 0 }, data: { taskOrder: ['t1'] } },
      { id: 't1', type: 'task', position: { x: 0, y: 0 }, data: {} }
    ];
    mockState.edges = [{ id: 'e1', source: 'a1', target: 't1' }];
    
    const changes: any[] = [{ type: 'remove', id: 'e1' }];
    slice.onEdgesChange(changes);
    
    const agent = mockState.nodes.find((n: any) => n.id === 'a1');
    expect(agent.data.taskOrder).toEqual([]);
  });

  it('onConnect: prevents invalid connections', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', position: { x: 0, y: 0 }, data: {} },
      { id: 'a2', type: 'agent', position: { x: 0, y: 0 }, data: {} }
    ];
    
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    slice.onConnect({ source: 'a1', target: 'a2' });
    
    expect(mockState.edges).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid connection blocked'));
    consoleSpy.mockRestore();
  });

  it('onConnect: allows valid connections and updates taskOrder', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', position: { x: 0, y: 0 }, data: { taskOrder: [] } },
      { id: 't1', type: 'task', position: { x: 0, y: 0 }, data: {} }
    ];
    
    slice.onConnect({ source: 'a1', target: 't1', sourceHandle: 'right-source', targetHandle: 'left-target' });
    
    expect(mockState.edges).toHaveLength(1);
    expect(mockState.nodes[0].data.taskOrder).toContain('t1');
  });

  it('deleteNode: removes node and its edges', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', position: { x: 0, y: 0 }, data: {} },
      { id: 't1', type: 'task', position: { x: 0, y: 0 }, data: {} }
    ];
    mockState.edges = [{ id: 'e1', source: 'a1', target: 't1' }];
    
    slice.deleteNode('a1');
    
    expect(mockState.nodes).toHaveLength(1);
    expect(mockState.edges).toHaveLength(0);
  });

  it('updateNodeData: updates node data correctly', () => {
    mockState.nodes = [{ id: 'n1', type: 'agent', position: { x: 0, y: 0 }, data: { name: 'Old' } }];
    
    slice.updateNodeData('n1', { name: 'New' });
    
    expect(mockState.nodes[0].data.name).toBe('New');
  });

  it('toggleCollapse: collapses node and hides descendants', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', position: { x: 0, y: 0 }, data: { isCollapsed: false } },
      { id: 't1', type: 'task', position: { x: 0, y: 0 }, data: {} }
    ];
    mockState.edges = [{ id: 'e1', source: 'a1', target: 't1' }];
    
    slice.toggleCollapse('a1');
    
    expect(mockState.nodes[0].data.isCollapsed).toBe(true);
    expect(mockState.nodes[1].hidden).toBe(true);
    expect(mockState.edges[0].hidden).toBe(true);
  });

  it('validateGraph: flags missing fields', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', position: { x: 0, y: 0 }, data: { name: '', role: '', goal: '', backstory: '' } }
    ];
    
    const isValid = slice.validateGraph();
    
    expect(isValid).toBe(false);
    expect(mockState.nodeErrors['a1']).toContain('Missing Name');
  });

  it('setNodeStatus: cascades running status from task to parent agent', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', data: {} } as any,
      { id: 't1', type: 'task', data: {} } as any
    ];
    mockState.edges = [{ id: 'e1', source: 'a1', target: 't1' }];
    mockState.nodeStatuses = { a1: 'idle', t1: 'idle' };
    
    slice.setNodeStatus('t1', 'running');
    
    expect(mockState.nodeStatuses['t1']).toBe('running');
    expect(mockState.nodeStatuses['a1']).toBe('running');
  });

  it('setNodeStatus: cascades success status from task to agent only if all sibling tasks are successful', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', data: {} } as any,
      { id: 't1', type: 'task', data: {} } as any,
      { id: 't2', type: 'task', data: {} } as any
    ];
    mockState.edges = [
      { id: 'e1', source: 'a1', target: 't1' },
      { id: 'e2', source: 'a1', target: 't2' }
    ];
    mockState.nodeStatuses = { a1: 'running', t1: 'running', t2: 'idle' };
    
    // t1 succeeds, but t2 is still idle/running
    slice.setNodeStatus('t1', 'success');
    expect(mockState.nodeStatuses['a1']).toBe('running'); // Parent remains running
    
    // t2 succeeds
    slice.setNodeStatus('t2', 'success');
    expect(mockState.nodeStatuses['a1']).toBe('success'); // Parent becomes success
  });

  it('onConnect: prevents connection between incompatible types (e.g. Task to Agent)', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', data: {} } as any,
      { id: 't1', type: 'task', data: {} } as any
    ];
    
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Connection from Task (target) to Agent (source) is backwards
    slice.onConnect({ source: 't1', target: 'a1' });
    
    expect(mockState.edges).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid connection blocked'));
    consoleSpy.mockRestore();
  });

  it('onConnect: prevents Task to Task connections', () => {
    mockState.nodes = [
      { id: 't1', type: 'task', data: {} } as any,
      { id: 't2', type: 'task', data: {} } as any
    ];
    
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    slice.onConnect({ source: 't1', target: 't2' });
    
    expect(mockState.edges).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid connection blocked'));
    consoleSpy.mockRestore();
  });

  it('validateGraph: covers all node types (crew, agent, task)', () => {
    mockState.nodes = [
      { id: 'c1', type: 'crew', data: {} } as any,
      { id: 'a1', type: 'agent', data: { name: 'A1', role: 'R1', goal: 'G1', backstory: 'B1' } } as any,
      { id: 't1', type: 'task', data: { name: 'T1', description: 'D1', expected_output: 'O1' } } as any
    ];
    mockState.edges = [
        { id: 'e1', source: 'c1', target: 'a1' },
        { id: 'e2', source: 'a1', target: 't1' }
    ];
    
    expect(slice.validateGraph()).toBe(true);

    // Break crew
    mockState.edges = [{ id: 'e2', source: 'a1', target: 't1' }];
    expect(slice.validateGraph()).toBe(false);
    expect(mockState.nodeErrors['c1']).toContain('Missing connected Agent');

    // Break agent
    mockState.nodes[1].data.name = '';
    expect(slice.validateGraph()).toBe(false);
    expect(mockState.nodeErrors['a1']).toContain('Missing Name');

    // Break task
    mockState.nodes[2].data.description = '';
    expect(slice.validateGraph()).toBe(false);
    expect(mockState.nodeErrors['t1']).toContain('Missing Description');
  });

  it('setMessages and clearChat: manages chat history', () => {
    slice.setMessages([{ id: '1', role: 'user', content: 'Hi' }]);
    expect(mockState.messages).toHaveLength(1);

    slice.setMessages((prev: any) => [...prev, { id: '2', role: 'assistant', content: 'Hello' }]);
    expect(mockState.messages).toHaveLength(2);

    slice.clearChat();
    // Should reset to INITIAL_CHAT_MESSAGES
    expect(mockState.messages[0].content).toContain('Hello! I am connected');
  });

  it('resetProject: comprehensively clears all graph state maps', () => {
    mockState.nodes = [{ id: 'n1' } as any];
    mockState.edges = [{ id: 'e1' } as any];
    mockState.nodeErrors = { n1: ['Error'] };
    mockState.nodeWarnings = { n1: ['Warning'] };
    mockState.nodeStatuses = { n1: 'running' };
    
    slice.resetProject();
    
    expect(mockState.nodes).toHaveLength(0);
    expect(mockState.edges).toHaveLength(0);
    expect(Object.keys(mockState.nodeErrors)).toHaveLength(0);
    expect(Object.keys(mockState.nodeWarnings)).toHaveLength(0);
    expect(Object.keys(mockState.nodeStatuses)).toHaveLength(0);
  });

  it('deleteEdge: removes edge and cleans up taskOrder', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', data: { taskOrder: ['t1'] } } as any,
      { id: 't1', type: 'task', data: {} } as any
    ];
    mockState.edges = [{ id: 'e1', source: 'a1', target: 't1' }];
    
    slice.deleteEdge('e1');
    
    expect(mockState.edges).toHaveLength(0);
    expect(mockState.nodes[0].data.taskOrder).toEqual([]);
  });

  it('addNodeWithAutoPosition: calculates grid position correctly', () => {
    mockState.nodes = new Array(3).fill({ id: 'existing' });
    slice.addNodeWithAutoPosition('agent', { name: 'New Agent' });
    
    expect(mockState.nodes).toHaveLength(4);
    expect(mockState.nodes[3].position).toEqual({ x: 600, y: 320 });
  });

  it('updateCrewAgentOrder: updates agentOrder in crew node', () => {
    mockState.nodes = [{ id: 'c1', type: 'crew', data: { agentOrder: [] } } as any];
    slice.updateCrewAgentOrder('c1', ['a1', 'a2']);
    expect(mockState.nodes[0].data.agentOrder).toEqual(['a1', 'a2']);
  });

  it('updateCrewTaskOrder: updates taskOrder in crew node', () => {
    mockState.nodes = [{ id: 'c1', type: 'crew', data: { taskOrder: [] } } as any];
    slice.updateCrewTaskOrder('c1', ['t1', 't2']);
    expect(mockState.nodes[0].data.taskOrder).toEqual(['t1', 't2']);
  });

  it('updateAgentTaskOrder: updates taskOrder in agent node', () => {
    mockState.nodes = [{ id: 'a1', type: 'agent', data: { taskOrder: [] } } as any];
    slice.updateAgentTaskOrder('a1', ['t1']);
    expect(mockState.nodes[0].data.taskOrder).toEqual(['t1']);
  });

  it('setExecutionResult: updates the store', () => {
    slice.setExecutionResult('new result');
    expect(mockState.executionResult).toBe('new result');
  });
});
