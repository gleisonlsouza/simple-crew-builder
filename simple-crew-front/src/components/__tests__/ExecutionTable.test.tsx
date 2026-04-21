import { render, screen, fireEvent } from '@testing-library/react';
import { ExecutionTable } from '../ExecutionTable';
import { vi, describe, it, expect } from 'vitest';
import type { Execution } from '../../types/store.types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CheckCircle2: () => <div data-testid="icon-success" />,
  XCircle: () => <div data-testid="icon-error" />,
  Clock: () => <div data-testid="icon-running" />,
  Zap: () => <div data-testid="icon-webhook" />,
  MessageSquare: () => <div data-testid="icon-chat" />,
  Eye: () => <div data-testid="icon-view" />,
  Play: () => <div data-testid="icon-rerun" />,
  ChevronLeft: () => <div data-testid="icon-prev" />,
  ChevronRight: () => <div data-testid="icon-next" />,
}));

describe('ExecutionTable', () => {
  const mockOnViewDetails = vi.fn();
  const mockOnReRun = vi.fn();

  const mockExecutions: Execution[] = [
    {
      id: 'exec-1',
      project_id: 'proj-1',
      status: 'success',
      trigger_type: 'chat',
      input_data: {},
      output_data: 'Result 1',
      graph_snapshot: { nodes: [], edges: [], version: '1.0', canvasLayout: 'vertical' },
      timestamp: '2024-01-01T10:00:00Z',
      duration: 1500,
    },
    {
      id: 'exec-2',
      project_id: 'proj-1',
      status: 'error',
      trigger_type: 'webhook',
      input_data: {},
      output_data: 'Error message',
      graph_snapshot: { nodes: [], edges: [], version: '1.0', canvasLayout: 'vertical' },
      timestamp: '2024-01-01T11:00:00Z',
      duration: 2000,
    },
    {
        id: 'exec-3',
        project_id: 'proj-1',
        status: 'running' as any,
        trigger_type: 'chat',
        input_data: {},
        graph_snapshot: { nodes: [], edges: [], version: '1.0', canvasLayout: 'vertical' },
        timestamp: '2024-01-01T12:00:00Z',
      }
  ];

  it('renders table headers correctly', () => {
    render(
      <ExecutionTable 
        data={mockExecutions} 
        onViewDetails={mockOnViewDetails} 
        onReRun={mockOnReRun} 
      />
    );

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Trigger')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders execution data correctly', () => {
    render(
      <ExecutionTable 
        data={mockExecutions} 
        onViewDetails={mockOnViewDetails} 
        onReRun={mockOnReRun} 
      />
    );

    // Check statuses
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getAllByTestId('icon-success').length).toBeGreaterThan(0);
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getAllByTestId('icon-error').length).toBeGreaterThan(0);
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getAllByTestId('icon-running').length).toBeGreaterThan(0);

    // Check trigger types
    expect(screen.getAllByText(/chat/i).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('icon-chat').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/webhook/i).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('icon-webhook').length).toBeGreaterThan(0);

    // Check durations
    expect(screen.getByText('1.50s')).toBeInTheDocument();
    expect(screen.getByText('2.00s')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // For exec-3 without duration
  });

  it('calls onViewDetails when a row is clicked', () => {
    render(
      <ExecutionTable 
        data={mockExecutions} 
        onViewDetails={mockOnViewDetails} 
        onReRun={mockOnReRun} 
      />
    );

    const firstRow = screen.getByText('Success').closest('tr');
    if (firstRow) fireEvent.click(firstRow);

    expect(mockOnViewDetails).toHaveBeenCalledWith(mockExecutions[0]);
  });

  it('calls onViewDetails when the view details button is clicked', () => {
    render(
      <ExecutionTable 
        data={mockExecutions} 
        onViewDetails={mockOnViewDetails} 
        onReRun={mockOnReRun} 
      />
    );

    const viewButtons = screen.getAllByTitle('View Details');
    fireEvent.click(viewButtons[0]);

    expect(mockOnViewDetails).toHaveBeenCalledWith(mockExecutions[0]);
  });

  it('calls onReRun when the re-run button is clicked', () => {
    render(
      <ExecutionTable 
        data={mockExecutions} 
        onViewDetails={mockOnViewDetails} 
        onReRun={mockOnReRun} 
      />
    );

    const rerunButtons = screen.getAllByTitle('Re-run Snapshot');
    fireEvent.click(rerunButtons[0]);

    expect(mockOnReRun).toHaveBeenCalledWith(mockExecutions[0]);
  });

  it('renders "No executions found" when data is empty', () => {
    render(
      <ExecutionTable 
        data={[]} 
        onViewDetails={mockOnViewDetails} 
        onReRun={mockOnReRun} 
      />
    );

    expect(screen.getByText('No executions found for this project.')).toBeInTheDocument();
  });
});
