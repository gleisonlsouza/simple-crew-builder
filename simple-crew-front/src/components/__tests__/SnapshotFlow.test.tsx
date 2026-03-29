import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { SnapshotFlow } from '../SnapshotFlow';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store';

// Mock Lucide icons used by the Badge Wrapper
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, any>;
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

// Mock React Flow so we can inspect props passed to it and avoid layout issues
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, any>;
  return {
    ...actual,
    Background: () => <div data-testid="background-mock" />,
    Controls: () => <div data-testid="controls-mock" />,
    MiniMap: (props: any) => {
      // Execute `nodeColor` for all node types to satisfy code coverage
      if (typeof props.nodeColor === 'function') {
        ['agent', 'task', 'crew', 'webhook', 'chat', 'unknown'].forEach(type => {
          props.nodeColor({ type });
        });
      }
      return <div data-testid="minimap-mock" />;
    },
    ReactFlow: (props: any) => {
      return (
        <div data-testid="react-flow-mock">
          {/* Render edges */}
          <div data-testid="mock-edges-container">
            {props.edges.map((e: any) => (
              <div key={e.id} data-testid={`edge-${e.id}`}>
                <span data-testid={`edge-stroke-${e.id}`}>{e.style?.stroke}</span>
                <span data-testid={`edge-animated-${e.id}`}>{String(e.animated)}</span>
              </div>
            ))}
          </div>

          {/* Render nodes and manually execute the withSnapshotBadge wrapper! */}
          <div data-testid="mock-nodes-container">
            {props.nodes.map((n: any) => {
              const NodeTypeRender = props.nodeTypes[n.type];
              return (
                <div key={n.id} data-testid={`node-${n.id}`}>
                  <span data-testid={`node-style-opacity-${n.id}`}>{n.style?.opacity}</span>
                  <span data-testid={`node-style-filter-${n.id}`}>{n.style?.filter}</span>
                  <span data-testid={`node-style-boxShadow-${n.id}`}>{n.style?.boxShadow}</span>
                  
                  {/* Test the HOC Rendering */}
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
  const sampleNodes = [
    { id: 'chat-1', type: 'chat', data: { name: 'Chat' }, style: {} },
    { id: 'agent-1', type: 'agent', data: { name: 'Agent' }, style: {} },
    { id: 'task-1', type: 'task', data: { name: 'Task' }, style: {} },
    { id: 'crew-1', type: 'crew', data: { name: 'Crew' }, style: {} }
  ];

  const sampleEdges = [
    { id: 'edge-1', source: 'chat-1', target: 'crew-1', style: {} },
    { id: 'edge-2', source: 'crew-1', target: 'agent-1', style: {} },
    { id: 'edge-3', source: 'agent-1', target: 'task-1', style: {} } // For unreached edge logic coverage
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue('light'); // Mock theme selector
  });

  it('renders gracefully with missing or undefined node_statuses', () => {
    render(<SnapshotFlow nodes={sampleNodes} edges={sampleEdges} executionStatus="success" />);
    expect(screen.getByTestId('react-flow-mock')).toBeInTheDocument();
  });

  it('applies basic fallback logic when nodeStatuses are omitted but global status is error', () => {
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
        nodes={sampleNodes} 
        edges={sampleEdges} 
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
        nodes={sampleNodes} 
        edges={sampleEdges} 
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
        nodes={sampleNodes} 
        edges={sampleEdges} 
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
        nodes={sampleNodes} 
        edges={sampleEdges} 
        executionStatus="error" 
        nodeStatuses={granularStatuses} 
      />
    );

    // Edge 2 (crew-1 -> agent-1): crew-1 failed, edge should be neutral (#94a3b8)
    expect(screen.getByTestId('edge-stroke-edge-2')).not.toHaveTextContent('#22c55e');
    expect(screen.getByTestId('edge-animated-edge-2')).toHaveTextContent('false');
  });
});
