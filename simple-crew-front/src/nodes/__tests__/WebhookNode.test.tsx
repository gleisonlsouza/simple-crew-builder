import { render, screen, fireEvent } from '@testing-library/react';
import { WebhookNode } from '../WebhookNode';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { ReactFlowProvider } from '@xyflow/react';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Globe: () => <div data-testid="icon-globe" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Settings: () => <div data-testid="icon-settings" />,
  AlertCircle: () => <div data-testid="icon-alert" />,
  Clock: () => <div data-testid="icon-clock" />,
  Loader2: () => <div data-testid="icon-loader" />,
  CheckCircle2: () => <div data-testid="icon-check" />,
}));

// Mock the store
vi.mock('../../store/index', () => ({
  useStore: vi.fn(),
}));

// Mock zustand/shallow
vi.mock('zustand/shallow', () => ({
  useShallow: (fn: any) => fn,
}));

// Helper to wrap component with ReactFlowProvider
const wrap = (ui: React.ReactElement) => <ReactFlowProvider>{ui}</ReactFlowProvider>;

describe('WebhookNode', () => {
  const mockUpdateNodeData = vi.fn();
  const mockDeleteNode = vi.fn();
  const mockSetActiveNode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup store mock for both calls in WebhookNode
    (useStore as any).mockImplementation((selector: any) => {
      const state = {
        deleteNode: mockDeleteNode,
        setActiveNode: mockSetActiveNode,
        updateNodeData: mockUpdateNodeData,
        nodeStatuses: {},
        nodeErrors: {},
      };
      return selector(state);
    });
  });

  const defaultProps = {
    id: 'webhook-1',
    data: { name: 'Test Webhook', path: 'test-path', isActive: true, waitForResult: false },
    type: 'webhook' as const,
    selected: false,
    zIndex: 0,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    dragHandle: '',
  } as any;

  it('renders correctly with toggles', () => {
    render(wrap(<WebhookNode {...defaultProps} />));
    
    expect(screen.getByText('Test Webhook')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Wait')).toBeInTheDocument();
    
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked(); // Active
    expect(checkboxes[1]).not.toBeChecked(); // Wait
  });

  it('calls updateNodeData when toggles are clicked', () => {
    render(wrap(<WebhookNode {...defaultProps} />));
    
    const checkboxes = screen.getAllByRole('checkbox');
    
    // Toggle Active
    fireEvent.click(checkboxes[0]);
    expect(mockUpdateNodeData).toHaveBeenCalledWith('webhook-1', { isActive: false });
    
    // Toggle Wait
    fireEvent.click(checkboxes[1]);
    expect(mockUpdateNodeData).toHaveBeenCalledWith('webhook-1', { waitForResult: true });
  });

  it('displays the path in the footer', () => {
    render(wrap(<WebhookNode {...defaultProps} />));
    expect(screen.getByText(/• \/test-path/)).toBeInTheDocument();
  });
});
