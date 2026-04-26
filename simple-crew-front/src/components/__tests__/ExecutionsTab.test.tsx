import { render, screen, fireEvent } from '@testing-library/react';
import ExecutionsTab from '../ExecutionsTab';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { useNavigate } from 'react-router-dom';
import type { Mock } from 'vitest';

// Mock the store
vi.mock('../../store/index', () => ({
  useStore: vi.fn(),
}));

// Mock useNavigate
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

// Mock child components
vi.mock('../ExecutionTable', () => ({
  ExecutionTable: ({ data, onViewDetails, onReRun }: any) => (
    <div data-testid="mock-execution-table">
      {data.map((ex: any) => (
        <div key={ex.id} data-testid={`row-${ex.id}`}>
          <button onClick={() => onViewDetails(ex)}>View {ex.id}</button>
          <button onClick={() => onReRun(ex)}>Re-run {ex.id}</button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../ExecutionDetailModal', () => ({
  ExecutionDetailModal: ({ isOpen, onClose, execution }: any) => isOpen ? (
    <div data-testid="mock-detail-modal">
      <span>Details for {execution?.id}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ) : null,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  History: () => <div data-testid="icon-history" />,
  RefreshCcw: () => <div data-testid="icon-refresh" />,
  Search: () => <div data-testid="icon-search" />,
  Filter: () => <div data-testid="icon-filter" />,
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('ExecutionsTab', () => {
  const mockFetchExecutions = vi.fn();
  const mockHydrateFromSnapshot = vi.fn();
  const mockNavigate = vi.fn();

  const mockExecutions = [
    { id: 'exec-1', status: 'success', trigger_type: 'chat', project_id: 'p1', graph_snapshot: {} },
    { id: 'exec-2', status: 'error', trigger_type: 'webhook', project_id: 'p1', graph_snapshot: {} },
  ];

  const defaultState = {
    currentProjectId: 'proj-123',
    executions: mockExecutions,
    isLoadingExecutions: false,
    fetchExecutions: mockFetchExecutions,
    hydrateFromSnapshot: mockHydrateFromSnapshot,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as Mock).mockReturnValue(mockNavigate);
  });

  it('renders landing state when no project ID is present', () => {
    (useStore as unknown as Mock).mockReturnValue({
      ...defaultState,
      currentProjectId: null,
    });

    render(<ExecutionsTab />);
    expect(screen.getByText('No project selected')).toBeInTheDocument();
  });

  it('fetches executions on mount when project ID is present', () => {
    (useStore as unknown as Mock).mockReturnValue(defaultState);

    render(<ExecutionsTab />);
    expect(mockFetchExecutions).toHaveBeenCalledWith('proj-123');
  });

  it('renders the execution table with executions', () => {
    (useStore as unknown as Mock).mockReturnValue(defaultState);

    render(<ExecutionsTab />);
    expect(screen.getByTestId('mock-execution-table')).toBeInTheDocument();
    expect(screen.getByTestId('row-exec-1')).toBeInTheDocument();
    expect(screen.getByTestId('row-exec-2')).toBeInTheDocument();
  });

  it('filters executions based on search term', () => {
    (useStore as unknown as Mock).mockReturnValue(defaultState);

    render(<ExecutionsTab />);
    
    const searchInput = screen.getByPlaceholderText(/Filter by status or trigger/i);
    
    // Filter by 'success'
    fireEvent.change(searchInput, { target: { value: 'success' } });
    expect(screen.getByTestId('row-exec-1')).toBeInTheDocument();
    expect(screen.queryByTestId('row-exec-2')).not.toBeInTheDocument();
    
    // Filter by 'webhook'
    fireEvent.change(searchInput, { target: { value: 'webhook' } });
    expect(screen.queryByTestId('row-exec-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('row-exec-2')).toBeInTheDocument();
  });

  it('refreshes executions when refresh button is clicked', () => {
    (useStore as unknown as Mock).mockReturnValue(defaultState);

    render(<ExecutionsTab />);
    
    const refreshBtn = screen.getByTitle('Refresh List');
    fireEvent.click(refreshBtn);
    
    expect(mockFetchExecutions).toHaveBeenCalledTimes(2); // 1 on mount, 1 on click
  });

  it('opens detail modal when view button is clicked', () => {
    (useStore as unknown as Mock).mockReturnValue(defaultState);

    render(<ExecutionsTab />);
    
    const viewBtn = screen.getByText('View exec-1');
    fireEvent.click(viewBtn);
    
    expect(screen.getByTestId('mock-detail-modal')).toBeInTheDocument();
    expect(screen.getByText('Details for exec-1')).toBeInTheDocument();
    
    const closeBtn = screen.getByText('Close');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('mock-detail-modal')).not.toBeInTheDocument();
  });

  it('handles re-run action correctly', () => {
    (useStore as unknown as Mock).mockReturnValue(defaultState);

    render(<ExecutionsTab />);
    
    const rerunBtn = screen.getByText('Re-run exec-1');
    fireEvent.click(rerunBtn);
    
    expect(mockHydrateFromSnapshot).toHaveBeenCalledWith('p1', {});
    expect(mockNavigate).toHaveBeenCalledWith('/workflow/p1');
  });
});
