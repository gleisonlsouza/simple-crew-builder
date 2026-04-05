import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExecutionDetailModal } from '../ExecutionDetailModal';
import type { Execution } from '../../types/store.types';

// Neutralizar Portais e Mock do SnapshotFlow
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node, 
  };
});

vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../SnapshotFlow', () => ({
  SnapshotFlow: ({ nodes, edges, executionStatus }: any) => (
    <div data-testid="mock-snapshot-flow">
      Status: {executionStatus}
      Nodes: {nodes?.length}
      Edges: {edges?.length}
    </div>
  )
}));

// Mock icons
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x" />,
  Play: () => <span data-testid="icon-play" />,
  Clipboard: () => <span data-testid="icon-clipboard" />,
  Check: () => <span data-testid="icon-check" />,
  ExternalLink: () => <span data-testid="icon-external" />,
  Zap: () => <span data-testid="icon-zap" />,
  MessageSquare: () => <span data-testid="icon-message" />,
  Clock: () => <span data-testid="icon-clock" />,
  History: () => <span data-testid="icon-history" />,
  FileJson: () => <span data-testid="icon-json" />,
}));

describe('ExecutionDetailModal', () => {
  const mockExecution: Execution = {
    id: 'exec-1',
    project_id: 'proj-1',
    status: 'success',
    trigger_type: 'manual',
    input_data: { query: 'Hello world' },
    output_data: { result: 'Response from AI', node_statuses: { 'node-1': 'success' } },
    graph_snapshot: { nodes: [{ id: 'node-1' }], edges: [], version: '1' },
    duration: 1.25,
    timestamp: '2024-03-20T12:00:00Z',
  } as any;

  const mockOnClose = vi.fn();
  const mockOnReRun = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('renders correctly when open', () => {
    render(
      <ExecutionDetailModal 
        execution={mockExecution} 
        isOpen={true} 
        onClose={mockOnClose} 
        onReRun={mockOnReRun} 
      />
    );
    expect(screen.getByText('Execution Details')).toBeInTheDocument();
    expect(screen.getByText('success')).toBeInTheDocument();
    expect(screen.getByText('Duration: 1.25s')).toBeInTheDocument();
  });

  it('returns null when isOpen is false or execution is null', () => {
    const { container: c1 } = render(
      <ExecutionDetailModal 
        execution={mockExecution} 
        isOpen={false} 
        onClose={mockOnClose} 
        onReRun={mockOnReRun} 
      />
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <ExecutionDetailModal 
        execution={null} 
        isOpen={true} 
        onClose={mockOnClose} 
        onReRun={mockOnReRun} 
      />
    );
    expect(c2.firstChild).toBeNull();
  });

  it('switches tabs and renders content', () => {
    render(
      <ExecutionDetailModal 
        execution={mockExecution} 
        isOpen={true} 
        onClose={mockOnClose} 
        onReRun={mockOnReRun} 
      />
    );
    
    // Default Input Data tab
    expect(screen.getByText('Input Payload')).toBeInTheDocument();
    expect(screen.getByText(/Hello world/)).toBeInTheDocument();

    // Switch to Output Progress
    fireEvent.click(screen.getByText(/Output \/ Errors/i));
    expect(screen.getByText('Execution Result')).toBeInTheDocument();
    expect(screen.getByText(/Response from AI/)).toBeInTheDocument();

    // Switch to Graph Snapshot
    fireEvent.click(screen.getByText(/Graph Snapshot/i));
    expect(screen.getByTestId('mock-snapshot-flow')).toBeInTheDocument();
    expect(screen.getByText(/Status: success/)).toBeInTheDocument();
  });

  it('calls onReRun and onClose callbacks', () => {
    render(
      <ExecutionDetailModal 
        execution={mockExecution} 
        isOpen={true} 
        onClose={mockOnClose} 
        onReRun={mockOnReRun} 
      />
    );
    
    fireEvent.click(screen.getByText(/Re-run Snapshot/i));
    expect(mockOnReRun).toHaveBeenCalledWith(mockExecution);

    fireEvent.click(screen.getByTestId('icon-x').parentElement!);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles JSON clipboard copy', async () => {
    render(
      <ExecutionDetailModal 
        execution={mockExecution} 
        isOpen={true} 
        onClose={mockOnClose} 
        onReRun={mockOnReRun} 
      />
    );
    
    const copyBtn = screen.getByTestId('icon-clipboard').parentElement!;
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify(mockExecution.input_data, null, 2));
    
    expect(await screen.findByTestId('icon-check')).toBeInTheDocument();
  });

  it('renders correct trigger type icon and label', () => {
    const { rerender } = render(
      <ExecutionDetailModal 
        execution={mockExecution} 
        isOpen={true} 
        onClose={mockOnClose} 
        onReRun={mockOnReRun} 
      />
    );
    expect(screen.getByText('manual')).toBeInTheDocument();
    expect(screen.getByTestId('icon-message')).toBeInTheDocument();

    const webhookExec = { ...mockExecution, trigger_type: 'webhook' };
    rerender(
      <ExecutionDetailModal 
        execution={webhookExec} 
        isOpen={true} 
        onClose={mockOnClose} 
        onReRun={mockOnReRun} 
      />
    );
    expect(screen.getByText('webhook')).toBeInTheDocument();
    expect(screen.getByTestId('icon-zap')).toBeInTheDocument();
  });
});
