import { render, screen, within } from '@testing-library/react';
import { SnapshotFlow } from '../SnapshotFlow';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { useStore } from '../../store';
import type { AppNode, AppEdge } from '../../types/nodes.types';
import React from 'react';

// Mock Lucide icons used by the Badge Wrapper
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    CheckCircle2: () => <div data-testid="icon-check" />,
    XCircle: () => <div data-testid="icon-x" />,
  };
});

// Mock Store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

interface MockNode {
  id: string;
  type: string;
  data: unknown;
  position: { x: number, y: number };
  style?: { opacity?: string | number; filter?: string; boxShadow?: string };
}

interface MockEdge {
  id: string;
  source: string;
  target: string;
  style?: { stroke?: string };
  animated?: boolean;
}

// Mock React Flow so we can inspect props passed to it and avoid layout issues
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    Background: () => <div data-testid="background-mock" />,
    Controls: () => <div data-testid="controls-mock" />,
    MiniMap: (props: { nodeColor?: (node: { type: string }) => string }) => {
      if (typeof props.nodeColor === 'function') {
        ['agent', 'task', 'crew', 'webhook', 'chat', 'unknown'].forEach(type => {
          props.nodeColor!({ type });
        });
      }
      return <div data-testid="minimap-mock" />;
    },
    ReactFlow: (props: { 
      nodes: MockNode[], 
      edges: MockEdge[], 
      nodeTypes: Record<string, React.ComponentType<{ data: unknown }>>,
      children?: React.ReactNode 
    }) => {
      return (
        <div data-testid="react-flow-mock">
          <div data-testid="mock-edges-container">
            {props.edges.map((e) => (
              <div key={e.id} data-testid={`edge-${e.id}`}>
                <span data-testid={`edge-stroke-${e.id}`}>{e.style?.stroke}</span>
                <span data-testid={`edge-animated-${e.id}`}>{String(e.animated)}</span>
              </div>
            ))}
          </div>

          <div data-testid="mock-nodes-container">
            {props.nodes.map((n) => {
              const NodeTypeRender = props.nodeTypes[n.type];
              return (
                <div key={n.id} data-testid={`node-${n.id}`}>
                  <span data-testid={`node-style-opacity-${n.id}`}>{String(n.style?.opacity)}</span>
                  <span data-testid={`node-style-filter-${n.id}`}>{String(n.style?.filter)}</span>
                  <span data-testid={`node-style-boxShadow-${n.id}`}>{String(n.style?.boxShadow)}</span>
                  
                  <div data-testid={`wrapped-node-${n.id}`}>
                    {NodeTypeRender ? <NodeTypeRender data={n.data} /> : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div data-testid="mock-children-container">
            {props.children}
          </div>
        </div>
      );
    }
  };
});

// Mock Node Types
vi.mock('../../nodes/AgentNode', () => ({ AgentNode: () => <div data-testid="mock-agent-node" /> }));
vi.mock('../../nodes/TaskNode', () => ({ TaskNode: () => <div data-testid="mock-task-node" /> }));
vi.mock('../../nodes/CrewNode', () => ({ CrewNode: () => <div data-testid="mock-crew-node" /> }));
vi.mock('../../nodes/ChatNode', () => ({ ChatNode: () => <div data-testid="mock-chat-node" /> }));
vi.mock('../../nodes/WebhookNode', () => ({ WebhookNode: () => <div data-testid="mock-webhook-node" /> }));
vi.mock('../../nodes/DeletableEdge', () => ({ DeletableEdge: () => <div data-testid="mock-deletable-edge" /> }));

describe('SnapshotFlow', () => {
  const sampleNodes: MockNode[] = [
    { id: 'chat-1', type: 'chat', data: { name: 'Chat' }, position: { x: 0, y: 0 }, style: {} },
    { id: 'agent-1', type: 'agent', data: { name: 'Agent' }, position: { x: 100, y: 0 }, style: {} },
    { id: 'task-1', type: 'task', data: { name: 'Task' }, position: { x: 200, y: 0 }, style: {} },
    { id: 'crew-1', type: 'crew', data: { name: 'Crew' }, position: { x: 300, y: 0 }, style: {} }
  ];

  const sampleEdges: MockEdge[] = [
    { id: 'edge-1', source: 'chat-1', target: 'crew-1', style: {}, animated: false },
    { id: 'edge-2', source: 'crew-1', target: 'agent-1', style: {}, animated: false },
    { id: 'edge-3', source: 'agent-1', target: 'task-1', style: {}, animated: false }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as Mock).mockReturnValue('light');
  });

  it('renders gracefully with missing or undefined node_statuses', () => {
    render(<SnapshotFlow nodes={sampleNodes as unknown as AppNode[]} edges={sampleEdges as unknown as AppEdge[]} executionStatus="success" />);
    expect(screen.getByTestId('react-flow-mock')).toBeInTheDocument();
  });

  it('applies basic fallback logic when nodeStatuses are omitted but global status is error', () => {
    // @ts-expect-error - Mocks don't fully satisfy AppNode
    render(<SnapshotFlow nodes={sampleNodes} edges={sampleEdges} executionStatus="error" />);
    
    // Crew node should be marked as "error" explicitly due to fallback logic in SnapshotFlow.tsx
    expect(screen.getByTestId('node-style-boxShadow-crew-1')).toHaveTextContent(/#ef4444/);
    
    // Wrapped node (Crew) should render the red XCircle
    expect(within(screen.getByTestId('wrapped-node-crew-1')).getByTestId('icon-x')).toBeInTheDocument();
  });

  it('applies precise Green Check (success) using granular node_statuses mapping', () => {
    const granularStatuses = {
      'agent-1': 'success',
      'task-1': 'running', // simulating a running task
    };

    render(
      <SnapshotFlow 
        nodes={sampleNodes as unknown as AppNode[]} 
        edges={sampleEdges as unknown as AppEdge[]} 
        executionStatus="running" 
        nodeStatuses={granularStatuses} 
      />
    );

    // Agent 1 is success
    expect(screen.getByTestId('node-style-boxShadow-agent-1')).toHaveTextContent(/#22c55e/);
    expect(within(screen.getByTestId('wrapped-node-agent-1')).getByTestId('icon-check')).toBeInTheDocument();
    expect(within(screen.getByTestId('wrapped-node-agent-1')).queryByTestId('icon-x')).not.toBeInTheDocument();

    // Task 1 is not explicit 'success' or 'error' (it is 'running' fallback neutral) 
    // It should not have a badge
    expect(within(screen.getByTestId('wrapped-node-task-1')).queryByTestId('icon-check')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('wrapped-node-task-1')).queryByTestId('icon-x')).not.toBeInTheDocument();
  });

  it('applies precise Red X (error) using granular node_statuses mapping', () => {
    const granularStatuses = {
      'agent-1': 'success',
      'task-1': 'error', 
    };

    render(
      <SnapshotFlow 
        nodes={sampleNodes as unknown as AppNode[]} 
        edges={sampleEdges as unknown as AppEdge[]} 
        executionStatus="error" 
        nodeStatuses={granularStatuses} 
      />
    );

    // Task 1 is error
    expect(screen.getByTestId('node-style-boxShadow-task-1')).toHaveTextContent(/#ef4444/);
    expect(within(screen.getByTestId('wrapped-node-task-1')).getByTestId('icon-x')).toBeInTheDocument();

    // Agent 1 is success
    expect(screen.getByTestId('node-style-boxShadow-agent-1')).toHaveTextContent(/#22c55e/);
    expect(within(screen.getByTestId('wrapped-node-agent-1')).getByTestId('icon-check')).toBeInTheDocument();
  });

  it('updates edge styles to Vibrant Green (#22c55e) correctly for successful flows', () => {
    const granularStatuses = {
      'crew-1': 'success',   // Edge 2 source
      // 'chat-1' triggers are auto-lit
    };

    render(
      <SnapshotFlow 
        nodes={sampleNodes as unknown as AppNode[]} 
        edges={sampleEdges as unknown as AppEdge[]} 
        executionStatus="success" 
        nodeStatuses={granularStatuses} 
      />
    );

    // Edge 1 (chat-1 -> crew-1): chat-1 is a trigger node, it should be marked success naturally
    expect(screen.getByTestId('edge-stroke-edge-1')).toHaveTextContent('#22c55e');
    expect(screen.getByTestId('edge-animated-edge-1')).toHaveTextContent('true');

    // Edge 2 (crew-1 -> agent-1): crew-1 is success, so it flows out green
    expect(screen.getByTestId('edge-stroke-edge-2')).toHaveTextContent('#22c55e');
    expect(screen.getByTestId('edge-animated-edge-2')).toHaveTextContent('true');
  });

  it('maintains neutral edge styles where flow aborted (error path)', () => {
    const granularStatuses = {
      'crew-1': 'error',   // Edge 2 source
    };

    render(
      <SnapshotFlow 
        nodes={sampleNodes as unknown as AppNode[]} 
        edges={sampleEdges as unknown as AppEdge[]} 
        executionStatus="error" 
        nodeStatuses={granularStatuses} 
      />
    );

    // Edge 2 (crew-1 -> agent-1): crew-1 failed, edge should be neutral (#94a3b8)
    expect(screen.getByTestId('edge-stroke-edge-2')).not.toHaveTextContent('#22c55e');
    expect(screen.getByTestId('edge-animated-edge-2')).toHaveTextContent('false');
  });
});
