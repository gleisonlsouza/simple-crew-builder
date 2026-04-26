import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGraphSlice } from '../graph.slice';
import type { AppNode, AppEdge, AgentNodeData, TaskNodeData, CrewNodeData } from '../../../types/nodes.types';
import type { AppState } from '../../index';
import type { StoreApi } from 'zustand';
import type { Mock } from 'vitest';
import { type NodeChange, type EdgeChange } from '@xyflow/react';

describe('graphSlice', () => {
  let set: Mock;
  let get: Mock;
  let slice: ReturnType<typeof createGraphSlice>;
  let mockState: Partial<AppState>;

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
      messages: [],
    };

    set = vi.fn((update) => {
      if (typeof update === 'function') {
        const result = update(mockState as AppState);
        Object.assign(mockState, result);
      } else {
        Object.assign(mockState, update);
      }
    });
    
    get = vi.fn(() => mockState as AppState);
    slice = createGraphSlice(set, get, {} as unknown as StoreApi<AppState>);
  });

  it('onNodesChange: applies node changes', () => {
    const initialNodes: AppNode[] = [{ id: '1', type: 'agent', position: { x: 0, y: 0 }, data: { name: 'A', role: 'R', goal: 'G', backstory: 'B' } } as unknown as AppNode];
    mockState.nodes = initialNodes;
    
    const changes = [{ type: 'position', id: '1', position: { x: 10, y: 10 } }];
    slice.onNodesChange(changes as unknown as NodeChange<AppNode>[]);
    
    expect(mockState.nodes![0].position).toEqual({ x: 10, y: 10 });
  });

  it('onNodesChange: handles node removal and cleans up taskOrder in agents', () => {
    const nodes: AppNode[] = [
      { id: 'a1', type: 'agent', position: { x: 0, y: 0 }, data: { name: 'A', role: 'R', goal: 'G', backstory: 'B', taskOrder: ['t1', 't2'] } } as unknown as AppNode,
      { id: 't1', type: 'task', position: { x: 0, y: 0 }, data: { name: 'T', description: 'D', expected_output: 'O' } } as unknown as AppNode
    ];
    mockState.nodes = nodes;
    
    const changes = [{ type: 'remove', id: 't1' }];
    slice.onNodesChange(changes as unknown as NodeChange<AppNode>[]);
    
    // Node t1 should be removed
    expect(mockState.nodes?.find((n) => n.id === 't1')).toBeUndefined();
    // Agent a1 should have t1 removed from taskOrder
    const agent = mockState.nodes?.find((n) => n.id === 'a1');
    expect((agent?.data as AgentNodeData).taskOrder).toEqual(['t2']);
    
    // Hit line 158 (return node fallback)
    mockState.nodes.push({ id: 'ch1', type: 'chat', data: {} } as unknown as AppNode);
    slice.onNodesChange([{ type: 'remove', id: 'some-other' }] as unknown as NodeChange<AppNode>[]);
    expect(mockState.nodes.find(n => n.id === 'ch1')).toBeDefined();
  });

  it('onEdgesChange: applies edge changes', () => {
    const initialEdges: AppEdge[] = [{ id: 'e1', source: 'a1', target: 't1' }];
    mockState.edges = initialEdges;
    
    const changes = [{ type: 'remove', id: 'e1' }];
    slice.onEdgesChange(changes as unknown as EdgeChange<AppEdge>[]);
    
    expect(mockState.edges).toHaveLength(0);
  });

  it('onEdgesChange: handles edge removal and updates taskOrder', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', position: { x: 0, y: 0 }, data: { name: 'A', role: 'R', goal: 'G', backstory: 'B', taskOrder: ['t1'] } } as unknown as AppNode,
      { id: 't1', type: 'task', position: { x: 0, y: 0 }, data: { name: 'T', description: 'D', expected_output: 'O' } } as unknown as AppNode
    ];
    mockState.edges = [{ id: 'e1', source: 'a1', target: 't1' }];
    
    const changes = [{ type: 'remove', id: 'e1' }];
    slice.onEdgesChange(changes as unknown as EdgeChange<AppEdge>[]);
    
    const agent = mockState.nodes?.find((n) => n.id === 'a1');
    expect((agent?.data as AgentNodeData).taskOrder).toEqual([]);
  });

  it('onEdgesChange: removing Agent-Task edge updates Crew taskOrder if applicable', () => {
    mockState.nodes = [
      { id: 'c1', type: 'crew', data: { taskOrder: ['t1'] } } as unknown as AppNode,
      { id: 'a1', type: 'agent', data: { taskOrder: ['t1'] } } as unknown as AppNode,
      { id: 't1', type: 'task', data: {} } as unknown as AppNode
    ];
    mockState.edges = [{ id: 'e1', source: 'a1', target: 't1' }];
    
    slice.onEdgesChange([{ type: 'remove', id: 'e1' }] as unknown as EdgeChange<AppEdge>[]);
    
    const crew = mockState.nodes!.find(n => n.id === 'c1');
    expect((crew!.data as CrewNodeData).taskOrder).not.toContain('t1');
  });

  it('onEdgesChange: handles non-remove changes', () => {
    mockState.edges = [{ id: 'e1', source: 'a1', target: 't1' }];
    slice.onEdgesChange([{ type: 'select', id: 'e1', selected: true }] as unknown as EdgeChange<AppEdge>[]);
    expect(mockState.edges).toHaveLength(1);
  });

  it('onConnect: prevents invalid connections', () => {
    mockState.nodes = [
      { id: 't1', type: 'task', position: { x: 0, y: 0 }, data: { name: 'T1' } } as unknown as AppNode,
      { id: 'a1', type: 'agent', position: { x: 0, y: 0 }, data: { name: 'A1' } } as unknown as AppNode
    ];
    
    // Task to Agent is invalid (only Agent to Task is allowed)
    slice.onConnect({ source: 't1', target: 'a1', sourceHandle: 'right-source', targetHandle: 'left-target' });
    
    expect(mockState.edges).toHaveLength(0);
  });

  it('onConnect: allows valid connections and updates taskOrder', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', position: { x: 0, y: 0 }, data: { name: 'A', role: 'R', goal: 'G', backstory: 'B', taskOrder: [] } } as unknown as AppNode,
      { id: 't1', type: 'task', position: { x: 0, y: 0 }, data: { name: 'T', description: 'D', expected_output: 'O' } } as unknown as AppNode
    ];
    
    slice.onConnect({ source: 'a1', target: 't1', sourceHandle: 'right-source', targetHandle: 'left-target' });
    
    expect(mockState.edges).toHaveLength(1);
    expect((mockState.nodes![0].data as AgentNodeData).taskOrder).toContain('t1');
  });

  it('onConnect: handles chat to crew connection with UI trigger', () => {
    mockState.nodes = [
      { id: 'ch1', type: 'chat', data: {} } as unknown as AppNode,
      { id: 'c1', type: 'crew', data: {} } as unknown as AppNode
    ];
    
    vi.useFakeTimers();
    slice.onConnect({ source: 'ch1', target: 'c1', sourceHandle: null, targetHandle: null });
    
    expect(mockState.edges![0].animated).toBe(true);
    expect(mockState.edges![0].style?.stroke).toBe('#22d3ee');
    
    vi.runAllTimers();
    expect(mockState.setIsChatVisible).toHaveBeenCalledWith(true);
    vi.useRealTimers();
  });

  it('onConnect: prevents duplicate connections', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', data: { name: 'A' } } as unknown as AppNode,
      { id: 't1', type: 'task', data: { name: 'T' } } as unknown as AppNode
    ];
    mockState.edges = [{ id: 'e1', source: 'a1', target: 't1' }];
    
    slice.onConnect({ source: 'a1', target: 't1', sourceHandle: null, targetHandle: null });
    expect(mockState.edges).toHaveLength(1);
  });

  it('onConnect: ignores null source or target', () => {
    mockState.nodes = [{ id: 'a1' } as unknown as AppNode];
    slice.onConnect({ source: 'a1', target: 'non-existent', sourceHandle: null, targetHandle: null });
    expect(mockState.edges).toHaveLength(0);
    slice.onConnect({ source: null as unknown as string, target: 'a1', sourceHandle: null, targetHandle: null });
    expect(mockState.edges).toHaveLength(0);
  });

  it('deleteNode: removes node and its edges', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', position: { x: 0, y: 0 }, data: { name: 'A' } } as unknown as AppNode,
      { id: 't1', type: 'task', position: { x: 0, y: 0 }, data: { name: 'T' } } as unknown as AppNode
    ];
    mockState.edges = [{ id: 'e1', source: 'a1', target: 't1' }];
    
    slice.deleteNode('a1');
    
    expect(mockState.nodes).toHaveLength(1);
    expect(mockState.edges).toHaveLength(0);
  });

  it('updateNodeData: updates node data correctly', () => {
    mockState.nodes = [{ id: 'n1', type: 'agent', position: { x: 0, y: 0 }, data: { name: 'Old' } } as unknown as AppNode];
    
    slice.updateNodeData('n1', { name: 'New' });
    expect((mockState.nodes![0].data as AgentNodeData).name).toBe('New');

    // Case: node not found
    slice.updateNodeData('n2', { name: 'Ignored' });
    expect((mockState.nodes![0].data as AgentNodeData).name).toBe('New');
  });

  it('addNode: adds a node correctly', () => {
    mockState.nodes = [];
    const newNode = { id: 'n1', type: 'agent' } as unknown as AppNode;
    slice.addNode(newNode);
    expect(mockState.nodes).toHaveLength(1);
    expect(mockState.nodes![0].id).toBe('n1');
  });

  it('toggleCollapse: collapses node and hides descendants', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', position: { x: 0, y: 0 }, data: { isCollapsed: false } } as unknown as AppNode,
      { id: 't1', type: 'task', position: { x: 0, y: 0 }, data: {} } as unknown as AppNode
    ];
    mockState.edges = [{ id: 'e1', source: 'a1', target: 't1' }];
    
    slice.toggleCollapse('a1');
    expect((mockState.nodes![0].data as AgentNodeData).isCollapsed).toBe(true);
    expect(mockState.nodes![1].hidden).toBe(true);
    expect(mockState.edges![0].hidden).toBe(true);

    // Un-collapse with non-affected node/edge
    mockState.nodes.push({ id: 'other', type: 'agent', data: {} } as unknown as AppNode);
    mockState.edges.push({ id: 'e_other', source: 'other', target: 'other' } as unknown as AppEdge);
    slice.toggleCollapse('a1');
    expect(mockState.nodes.find(n => n.id === 'other')?.hidden).toBeFalsy();
    expect(mockState.edges.find(e => e.id === 'e_other')?.hidden).toBeFalsy();
  });

  it('validateGraph: flags missing fields', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', position: { x: 0, y: 0 }, data: { name: '', role: '', goal: '', backstory: '' } } as unknown as AppNode
    ];
    
    const isValid = slice.validateGraph();
    
    expect(isValid).toBe(false);
    expect(mockState.nodeErrors!['a1']).toContain('Missing Name');
  });

  it('setNodeStatus: cascades running status from task to parent agent', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', data: { name: 'A' } } as unknown as AppNode,
      { id: 't1', type: 'task', data: { name: 'T' } } as unknown as AppNode
    ];
    mockState.edges = [{ id: 'e1', source: 'a1', target: 't1' }];
    mockState.nodeStatuses = { a1: 'idle', t1: 'idle' };
    
    slice.setNodeStatus('t1', 'running');
    
    expect(mockState.nodeStatuses!['t1']).toBe('running');
    expect(mockState.nodeStatuses!['a1']).toBe('running');
  });

  it('setNodeStatus: cascades success status from task to agent only if all sibling tasks are successful', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', data: { name: 'A' } } as unknown as AppNode,
      { id: 't1', type: 'task', data: { name: 'T1' } } as unknown as AppNode,
      { id: 't2', type: 'task', data: { name: 'T2' } } as unknown as AppNode
    ];
    mockState.edges = [
      { id: 'e1', source: 'a1', target: 't1' },
      { id: 'e2', source: 'a1', target: 't2' }
    ];
    mockState.nodeStatuses = { a1: 'running', t1: 'running', t2: 'idle' };
    
    // t1 succeeds, but t2 is still idle/running
    slice.setNodeStatus('t1', 'success');
    expect(mockState.nodeStatuses!['a1']).toBe('running'); // Parent remains running
    
    // t2 succeeds
    slice.setNodeStatus('t2', 'success');
    expect(mockState.nodeStatuses!['a1']).toBe('success'); // Parent becomes success
  });

  it('onConnect: prevents connection between incompatible types (e.g. Task to Agent)', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', data: { name: 'A' } } as unknown as AppNode,
      { id: 't1', type: 'task', data: { name: 'T' } } as unknown as AppNode
    ];
    
    // Connection from Task (target) to Agent (source) is backwards
    slice.onConnect({ source: 't1', target: 'a1', sourceHandle: 'right-source', targetHandle: 'left-target' });
    
    expect(mockState.edges).toHaveLength(0);
  });

  it('onConnect: prevents Task to Task connections', () => {
    mockState.nodes = [
      { id: 't1', type: 'task', data: { name: 'T1' } } as unknown as AppNode,
      { id: 't2', type: 'task', data: { name: 'T2' } } as unknown as AppNode
    ];
    
    slice.onConnect({ source: 't1', target: 't2', sourceHandle: 'right-source', targetHandle: 'left-target' });
    
    expect(mockState.edges).toHaveLength(0);
  });

  it('validateGraph: covers all node types (crew, agent, task)', () => {
    mockState.nodes = [
      { id: 'c1', type: 'crew', data: { process: 'sequential' } } as unknown as AppNode,
      { id: 'a1', type: 'agent', data: { name: 'A1', role: 'R1', goal: 'G1', backstory: 'B1' } } as unknown as AppNode,
      { id: 't1', type: 'task', data: { name: 'T1', description: 'D1', expected_output: 'O1' } } as unknown as AppNode
    ];
    mockState.edges = [
        { id: 'e1', source: 'c1', target: 'a1' },
        { id: 'e2', source: 'a1', target: 't1' }
    ];
    
    expect(slice.validateGraph()).toBe(true);

    // Break crew
    mockState.edges = [{ id: 'e2', source: 'a1', target: 't1' }];
    expect(slice.validateGraph()).toBe(false);
    expect(mockState.nodeErrors!['c1']).toContain('Missing connected Agent');

    // Break agent
    (mockState.nodes![1].data as AgentNodeData).name = '';
    expect(slice.validateGraph()).toBe(false);
    expect(mockState.nodeErrors!['a1']).toContain('Missing Name');

    // Break task
    (mockState.nodes![2].data as TaskNodeData).description = '';
    expect(slice.validateGraph()).toBe(false);
    expect(mockState.nodeErrors!['t1']).toContain('Missing Description');
  });

  it('setMessages and clearChat: manages chat history', () => {
    slice.setMessages([{ id: '1', role: 'user', content: 'Hi' }]);
    expect(mockState.messages).toHaveLength(1);

    slice.setMessages((prev: AppState['messages']) => [...(prev || []), { id: '2', role: 'assistant' as const, content: 'Hello' }]);
    expect(mockState.messages).toHaveLength(2);

    slice.clearChat();
    // Should reset to INITIAL_CHAT_MESSAGES
    expect(mockState.messages![0].content).toContain('Hello! I am connected');
  });

  it('resetProject: comprehensively clears all graph state maps', () => {
    mockState.nodes = [{ id: 'n1' } as unknown as AppNode];
    mockState.edges = [{ id: 'e1' } as unknown as AppEdge];
    mockState.nodeErrors = { n1: ['Error'] };
    mockState.nodeWarnings = { n1: ['Warning'] };
    mockState.nodeStatuses = { n1: 'running' };
    
    slice.resetProject();
    
    expect(mockState.nodes).toHaveLength(0);
    expect(mockState.edges).toHaveLength(0);
    expect(Object.keys(mockState.nodeErrors!)).toHaveLength(0);
    expect(Object.keys(mockState.nodeWarnings!)).toHaveLength(0);
    expect(Object.keys(mockState.nodeStatuses!)).toHaveLength(0);
  });

  it('deleteEdge: removes edge and cleans up taskOrder', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', data: { name: 'A', taskOrder: ['t1'] } } as unknown as AppNode,
      { id: 't1', type: 'task', data: { name: 'T' } } as unknown as AppNode
    ];
    mockState.edges = [{ id: 'e1', source: 'a1', target: 't1' }];
    
    slice.deleteEdge('e1');
    
    expect(mockState.edges).toHaveLength(0);
    expect((mockState.nodes![0].data as AgentNodeData).taskOrder).toEqual([]);
  });

  it('addNodeWithAutoPosition: calculates grid position correctly', () => {
    mockState.nodes = new Array(3).fill({ id: 'existing' });
    slice.addNodeWithAutoPosition('agent', { name: 'New Agent' } as unknown as AgentNodeData);
    
    expect(mockState.nodes).toHaveLength(4);
    expect(mockState.nodes![3].position).toEqual({ x: 600, y: 320 });
  });

  it('updateCrewAgentOrder: updates agentOrder in crew node', () => {
    mockState.nodes = [{ id: 'c1', type: 'crew', data: { agentOrder: [] } } as unknown as AppNode];
    slice.updateCrewAgentOrder('c1', ['a1', 'a2']);
    expect((mockState.nodes![0].data as CrewNodeData).agentOrder).toEqual(['a1', 'a2']);
  });

  it('updateCrewTaskOrder: updates taskOrder in crew node', () => {
    mockState.nodes = [{ id: 'c1', type: 'crew', data: { taskOrder: [] } } as unknown as AppNode];
    slice.updateCrewTaskOrder('c1', ['t1', 't2']);
    expect((mockState.nodes![0].data as CrewNodeData).taskOrder).toEqual(['t1', 't2']);
  });

  it('updateAgentTaskOrder: updates taskOrder in agent node', () => {
    mockState.nodes = [{ id: 'a1', type: 'agent', data: { taskOrder: [] } } as unknown as AppNode];
    slice.updateAgentTaskOrder('a1', ['t1']);
    expect((mockState.nodes![0].data as AgentNodeData).taskOrder).toEqual(['t1']);
    
    // Case: wrong node type
    slice.updateAgentTaskOrder('a1', ['t2']); // Still a1 but we'll mock it as something else
    mockState.nodes = [{ id: 'not-agent', type: 'task', data: {} } as unknown as AppNode];
    slice.updateAgentTaskOrder('a1', ['t3']);
    expect(mockState.nodes[0].id).toBe('not-agent');
  });

  it('updateCrewAgentOrder/TaskOrder: handles non-crew nodes', () => {
    mockState.nodes = [{ id: 'n1', type: 'agent', data: {} } as unknown as AppNode];
    slice.updateCrewAgentOrder('n1', ['a1']);
    slice.updateCrewTaskOrder('n1', ['t1']);
    expect(mockState.nodes).toHaveLength(1);
    expect(mockState.nodes![0].type).toBe('agent');
  });

  it('setNodeWarnings: sets node warnings', () => {
    slice.setNodeWarnings({ n1: ['Warning'] });
    expect(mockState.nodeWarnings).toEqual({ n1: ['Warning'] });
  });

  it('setExecutionResult: sets execution result', () => {
    slice.setExecutionResult('success');
    expect(mockState.executionResult).toBe('success');
  });

  it('onConnect: connects Webhook to Crew', () => {
    mockState.nodes = [
      { id: 'w1', type: 'webhook', data: { name: 'W' } } as unknown as AppNode,
      { id: 'c1', type: 'crew', data: {} } as unknown as AppNode
    ];
    slice.onConnect({ source: 'w1', target: 'c1', sourceHandle: 'right', targetHandle: 'left' });
    expect(mockState.edges![0].style?.stroke).toBe('#f97316');
  });

  it('onConnect: connecting Agent to Task updates Crew taskOrder if Agent is in Crew', () => {
    mockState.nodes = [
      { id: 'c1', type: 'crew', data: { taskOrder: [] } } as unknown as AppNode,
      { id: 'a1', type: 'agent', data: { taskOrder: [] } } as unknown as AppNode,
      { id: 't1', type: 'task', data: {} } as unknown as AppNode
    ];
    mockState.edges = [{ id: 'e1', source: 'c1', target: 'a1' }];
    slice.onConnect({ source: 'a1', target: 't1', sourceHandle: 'right', targetHandle: 'left' });
    expect((mockState.nodes![0].data as CrewNodeData).taskOrder).toContain('t1');
  });

  it('onConnect: connecting Crew to Agent gathers existing tasks into Crew taskOrder', () => {
    mockState.nodes = [
      { id: 'c1', type: 'crew', data: { taskOrder: [], agentOrder: [] } } as unknown as AppNode,
      { id: 'a1', type: 'agent', data: { taskOrder: [] } } as unknown as AppNode,
      { id: 't1', type: 'task', data: {} } as unknown as AppNode
    ];
    mockState.edges = [{ id: 'e1', source: 'a1', target: 't1' }];
    slice.onConnect({ source: 'c1', target: 'a1', sourceHandle: 'right', targetHandle: 'left' });
    expect((mockState.nodes![0].data as CrewNodeData).taskOrder).toContain('t1');
    expect((mockState.nodes![0].data as CrewNodeData).agentOrder).toContain('a1');
  });

  it('deleteNode: removing task updates Crew taskOrder and Agent taskOrder', () => {
    const crewNode = { id: 'c1', type: 'crew', data: { taskOrder: ['t1'] } } as unknown as AppNode;
    const agentNode = { id: 'a1', type: 'agent', data: { taskOrder: ['t1'] } } as unknown as AppNode;
    const taskNode = { id: 't1', type: 'task', data: {} } as unknown as AppNode;
    
    mockState.nodes = [crewNode, agentNode, taskNode];
    slice.deleteNode('t1');
    const updatedCrew = mockState.nodes!.find(n => n.id === 'c1');
    const updatedAgent = mockState.nodes!.find(n => n.id === 'a1');
    expect((updatedCrew!.data as CrewNodeData).taskOrder).not.toContain('t1');
    expect((updatedAgent!.data as AgentNodeData).taskOrder).not.toContain('t1');

    // Case: node being mapped is neither agent nor crew (Hits line 397)
    mockState.nodes = [
        { id: 't1', type: 'task', data: {} } as unknown as AppNode,
        { id: 'ch1', type: 'chat', data: {} } as unknown as AppNode,
        { id: 'c1', type: 'crew', data: { taskOrder: ['t1'] } } as unknown as AppNode // To have something to clean up
    ];
    slice.deleteNode('t1');
    expect(mockState.nodes.find(n => n.id === 'ch1')).toBeDefined();
  });

  it('deleteNode: removing agent updates Crew agentOrder', () => {
    mockState.nodes = [
      { id: 'c1', type: 'crew', data: { agentOrder: ['a1'] } } as unknown as AppNode,
      { id: 'a1', type: 'agent', data: {} } as unknown as AppNode
    ];
    slice.deleteNode('a1');
    const crew = mockState.nodes!.find(n => n.id === 'c1');
    expect((crew!.data as CrewNodeData).agentOrder).not.toContain('a1');
  });

  it('deleteNode: removing crew, webhook or chat node', () => {
    mockState.nodes = [
      { id: 'c1', type: 'crew', data: {} } as unknown as AppNode,
      { id: 'w1', type: 'webhook', data: {} } as unknown as AppNode,
      { id: 'ch1', type: 'chat', data: {} } as unknown as AppNode
    ];
    slice.deleteNode('c1');
    expect(mockState.nodes).toHaveLength(2);
    slice.deleteNode('w1');
    expect(mockState.nodes).toHaveLength(1);
    slice.deleteNode('ch1');
    expect(mockState.nodes).toHaveLength(0);
  });

  it('onEdgesChange: removing Crew to Agent edge cleans up agentOrder and tasks in Crew', () => {
    mockState.nodes = [
      { id: 'c1', type: 'crew', data: { agentOrder: ['a1'], taskOrder: ['t1'] } } as unknown as AppNode,
      { id: 'a1', type: 'agent', data: {} } as unknown as AppNode,
      { id: 't1', type: 'task', data: {} } as unknown as AppNode
    ];
    mockState.edges = [
      { id: 'e1', source: 'c1', target: 'a1' },
      { id: 'e2', source: 'a1', target: 't1' }
    ];
    slice.onEdgesChange([{ type: 'remove', id: 'e1' }] as unknown as EdgeChange<AppEdge>[]);
    const crew = mockState.nodes!.find(n => n.id === 'c1');
    expect((crew!.data as CrewNodeData).agentOrder).not.toContain('a1');
    expect((crew!.data as CrewNodeData).taskOrder).not.toContain('t1');
  });
  
  it('onNodesChange: removing task cleans up Crew taskOrder', () => {
    mockState.nodes = [
      { id: 'c1', type: 'crew', data: { agentOrder: [], taskOrder: ['t1'] } } as unknown as AppNode,
      { id: 't1', type: 'task', data: {} } as unknown as AppNode
    ];
    slice.onNodesChange([{ type: 'remove', id: 't1' }] as unknown as NodeChange<AppNode>[]);
    const crew = mockState.nodes!.find(n => n.id === 'c1');
    expect((crew!.data as CrewNodeData).taskOrder).not.toContain('t1');
  });

  it('validateGraph: missing webhook name', () => {
    mockState.nodes = [{ id: 'w1', type: 'webhook', data: { name: '' } } as unknown as AppNode];
    const isValid = slice.validateGraph();
    expect(isValid).toBe(false);
    expect(mockState.nodeErrors!['w1']).toContain('Missing Name');
  });

  it('toggleCollapse: uncollapses and shows descendants properly', () => {
    mockState.nodes = [
      { id: 'a1', type: 'agent', data: { isCollapsed: true } } as unknown as AppNode,
      { id: 't1', type: 'task', hidden: true, data: { isCollapsed: false } } as unknown as AppNode,
      { id: 't2', type: 'task', hidden: true, data: { isCollapsed: false } } as unknown as AppNode
    ];
    mockState.edges = [
      { id: 'e1', source: 'a1', target: 't1', hidden: true },
      { id: 'e2', source: 't1', target: 't2', hidden: true }
    ];
    slice.toggleCollapse('a1');
    expect((mockState.nodes![0].data as AgentNodeData).isCollapsed).toBe(false);
    expect(mockState.nodes![1].hidden).toBe(false);
    expect(mockState.edges![0].hidden).toBe(false);
  });

  it('toggleCollapse: does nothing if node is not found', () => {
    mockState.nodes = [];
    slice.toggleCollapse('non-existent');
    expect(mockState.nodes).toHaveLength(0);
  });

  it('setActiveNode: manages active node id', () => {
    slice.setActiveNode('n1');
    expect(mockState.activeNodeId).toBe('n1');
    mockState.nodes = [{ id: 'n1', type: 'agent', data: {} } as unknown as AppNode];
    slice.deleteNode('n1');
    expect(mockState.activeNodeId).toBeNull();
  });
});
