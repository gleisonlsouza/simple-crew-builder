import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterNodeModal } from '../RouterNodeModal';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../../store/index';
import type { Mock } from 'vitest';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  Save: () => <div data-testid="icon-save" />,
  Plus: () => <div data-testid="icon-plus" />,
  Trash2: () => <div data-testid="icon-trash" />,
  GitBranch: () => <div data-testid="icon-git-branch" />,
  AlertCircle: () => <div data-testid="icon-alert-circle" />,
  ChevronRight: () => <div data-testid="icon-chevron-right" />,
  ListTree: () => <div data-testid="icon-list-tree" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  Pencil: () => <div data-testid="icon-pencil" />,
  Check: () => <div data-testid="icon-check" />,
}));

// Mock the store
vi.mock('../../../store/index', () => ({
  useStore: vi.fn(),
}));

// Mock JsonVisualMapper
vi.mock('../../node-config/JsonVisualMapper', () => ({
  JsonTree: ({ label }: any) => <div data-testid="json-tree">Tree for {label}</div>,
}));

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  useDroppable: () => ({ isOver: false, setNodeRef: vi.fn() }),
}));

describe('RouterNodeModal', () => {
  const mockUpdateNodeData = vi.fn();
  const mockCloseRouterModal = vi.fn();

  const mockNodes = [
    {
      id: 'router-1',
      type: 'router',
      data: {
        name: 'Initial Router',
        conditions: [
          { id: 'c1', label: 'Route 1', field: 'status', operator: 'is_equal', value: 'OK' }
        ],
        defaultRouteLabel: 'Otherwise'
      }
    },
    {
      id: 'agent-1',
      type: 'agent',
      data: { name: 'Test Agent' }
    },
    {
        id: 'schema-1',
        type: 'schema',
        data: { name: 'TestSchema', fields: [{ key: 'status', type: 'string' }] }
    },
    {
        id: 'state-1',
        type: 'state',
        data: { fields: [{ key: 'status', type: 'TestSchema' }] }
    }
  ];

  const mockEdges = [
    { id: 'e1', source: 'agent-1', target: 'router-1' },
    { id: 'e2', source: 'schema-1', target: 'agent-1' }
  ];

  const defaultState = {
    isRouterModalOpen: true,
    activeRouterNodeId: 'router-1',
    nodes: mockNodes,
    edges: mockEdges,
    updateNodeData: mockUpdateNodeData,
    closeRouterModal: mockCloseRouterModal,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as Mock).mockImplementation((selector: (state: any) => any) => {
      return selector(defaultState);
    });
  });

  it('renders correctly when open', () => {
    render(<RouterNodeModal />);
    expect(screen.getByText('Router Configuration')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Initial Router')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Route 1')).toBeInTheDocument();
  });

  it('calls closeRouterModal when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<RouterNodeModal />);
    
    const closeBtn = screen.getByTestId('icon-x').parentElement;
    await user.click(closeBtn!);
    
    expect(mockCloseRouterModal).toHaveBeenCalled();
  });

  it('adds a new condition', async () => {
    const user = userEvent.setup();
    render(<RouterNodeModal />);
    
    const addBtn = screen.getByText('Add Rule');
    await user.click(addBtn);
    
    expect(screen.getByDisplayValue('Path 2')).toBeInTheDocument();
  });

  it('removes a condition', async () => {
    const user = userEvent.setup();
    render(<RouterNodeModal />);
    
    const trashBtn = screen.getByTestId('icon-trash').parentElement;
    await user.click(trashBtn!);
    
    expect(screen.queryByDisplayValue('Route 1')).not.toBeInTheDocument();
  });

  it('updates local state and saves correctly', async () => {
    const user = userEvent.setup();
    render(<RouterNodeModal />);
    
    const nameInput = screen.getByDisplayValue('Initial Router');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Router Name');
    
    const saveBtn = screen.getByText('Apply Routing Logic');
    await user.click(saveBtn);
    
    expect(mockUpdateNodeData).toHaveBeenCalledWith('router-1', expect.objectContaining({
      name: 'New Router Name'
    }));
    expect(mockCloseRouterModal).toHaveBeenCalled();
  });

  it('toggles between auto and manual source mode', async () => {
    const user = userEvent.setup();
    render(<RouterNodeModal />);
    
    // Default is auto (if discovery works)
    expect(screen.getByText('Auto-Discover')).toHaveClass('bg-indigo-600');
    
    const manualBtn = screen.getByText('Manual Paste');
    await user.click(manualBtn);
    
    expect(manualBtn).toHaveClass('bg-indigo-600');
    expect(screen.getByPlaceholderText('{ "result": "OK" }')).toBeInTheDocument();
  });

  it('renders nothing when not open', () => {
    (useStore as unknown as Mock).mockImplementation((selector: (state: any) => any) => {
        return selector({ ...defaultState, isRouterModalOpen: false });
    });
    const { container } = render(<RouterNodeModal />);
    expect(container).toBeEmptyDOMElement();
  });
});
