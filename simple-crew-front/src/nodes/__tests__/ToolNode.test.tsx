import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolNode } from '../ToolNode';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { ReactFlowProvider, type NodeProps, type Node } from '@xyflow/react';
import type { AppState } from '../../store/index';
import type { Mock } from 'vitest';
import type { ToolNodeData } from '../../types/nodes.types';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Settings: () => <div data-testid="icon-settings" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Settings2: () => <div data-testid="icon-settings-2" />,
  Loader2: () => <div data-testid="icon-loader" />,
  CheckCircle2: () => <div data-testid="icon-check-circle" />,
  AlertCircle: () => <div data-testid="icon-alert-circle" />,
  Clock: () => <div data-testid="icon-clock" />,
}));

// Mock the store
vi.mock('../../store/index', () => ({
  useStore: vi.fn(),
}));

// Mock zustand/shallow
vi.mock('zustand/shallow', () => ({
  useShallow: (fn: (state: AppState) => unknown) => fn,
}));

// Mock ToolConfigurationModal
vi.mock('../../components/ToolConfigurationModal', () => ({
  ToolConfigurationModal: ({ isOpen, onClose, onSave, tool }: any) => isOpen ? (
    <div data-testid="tool-config-modal">
      <span>Configuring {tool.name}</span>
      <button onClick={() => onSave({ key: 'value' })}>Save</button>
      <button onClick={onClose}>Close</button>
    </div>
  ) : null,
}));

const wrap = (ui: React.ReactElement) => <ReactFlowProvider>{ui}</ReactFlowProvider>;

describe('ToolNode', () => {
  const mockDeleteNode = vi.fn();
  const mockUpdateNodeData = vi.fn();
  const mockSetActiveNode = vi.fn();

  const mockGlobalTools = [
    { id: 'tool-1', name: 'Search', description: 'Search the web', isEnabled: true },
    { 
      id: 'tool-2', 
      name: 'Calculator', 
      description: 'Perform math', 
      isEnabled: true,
      user_config_schema: { fields: { operation: { type: 'string' } } }
    },
  ];

  const defaultState = {
    deleteNode: mockDeleteNode,
    updateNodeData: mockUpdateNodeData,
    setActiveNode: mockSetActiveNode,
    globalTools: mockGlobalTools,
    canvasLayout: 'vertical',
    nodeStatuses: {},
    nodeErrors: {},
  };

  let currentState = { ...defaultState };

  beforeEach(() => {
    vi.clearAllMocks();
    currentState = { ...defaultState };
    (useStore as unknown as Mock).mockImplementation((selector: (state: any) => any) => {
      return selector(currentState);
    });
  });

  const defaultProps: NodeProps<Node<ToolNodeData, 'tool'>> = {
    id: 'tool-node-1',
    data: { 
      toolId: 'tool-1',
      name: 'Search',
      config: {}
    },
    type: 'tool',
    selected: false,
    zIndex: 0,
    isConnectable: true,
    dragging: false,
    dragHandle: '',
    selectable: true,
    deletable: true,
    draggable: true,
    parentId: undefined,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  } as any;

  it('verifies the store mock works', () => {
    const layout = useStore(state => state.canvasLayout);
    expect(layout).toBe('vertical');
    
    currentState = { ...defaultState, canvasLayout: 'horizontal' };
    const newLayout = useStore(state => state.canvasLayout);
    expect(newLayout).toBe('horizontal');
  });

  it('renders correctly', () => {
    render(wrap(<ToolNode {...defaultProps} />));
    expect(screen.getByText('Global Tool')).toBeInTheDocument();
    expect(screen.getByText('Search the web')).toBeInTheDocument();
  });

  it('calls deleteNode when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(wrap(<ToolNode {...defaultProps} />));
    
    const deleteBtn = screen.getByTestId('icon-trash').parentElement;
    await user.click(deleteBtn!);
    
    expect(mockDeleteNode).toHaveBeenCalledWith('tool-node-1');
  });

  it('updates toolId when selection changes', async () => {
    const user = userEvent.setup();
    render(wrap(<ToolNode {...defaultProps} />));
    
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'tool-2');
    
    expect(mockUpdateNodeData).toHaveBeenCalledWith('tool-node-1', { 
      toolId: 'tool-2', 
      name: 'Calculator', 
      config: undefined 
    });
  });

  it('opens config modal when tool requires configuration', async () => {
    const user = userEvent.setup();
    const propsWithConfigTool = {
        ...defaultProps,
        data: { ...defaultProps.data, toolId: 'tool-2' }
    };
    render(wrap(<ToolNode {...propsWithConfigTool} />));
    
    const configBtn = screen.getByTitle('Configure Parameters');
    await user.click(configBtn);
    
    expect(screen.getByTestId('tool-config-modal')).toBeInTheDocument();
    expect(screen.getByText('Configuring Calculator')).toBeInTheDocument();
  });

  it('saves configuration from modal', async () => {
    const user = userEvent.setup();
    const propsWithConfigTool = {
        ...defaultProps,
        data: { ...defaultProps.data, toolId: 'tool-2' }
    };
    render(wrap(<ToolNode {...propsWithConfigTool} />));
    
    await user.click(screen.getByTitle('Configure Parameters'));
    await user.click(screen.getByText('Save'));
    
    expect(mockUpdateNodeData).toHaveBeenCalledWith('tool-node-1', { config: { key: 'value' } });
  });

  it('shows status indicators correctly', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector({ 
        ...defaultState, 
        nodeStatuses: { 'tool-node-1': 'running' } 
    }));
    render(wrap(<ToolNode {...defaultProps} />));
    expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
    
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector({ 
        ...defaultState, 
        nodeStatuses: { 'tool-node-1': 'success' } 
    }));
    const { rerender } = render(wrap(<ToolNode {...defaultProps} />));
    rerender(wrap(<ToolNode {...defaultProps} />));
    expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument();
  });

  it('changes handle position based on layout', () => {
    // Vertical layout (default)
    const { container, rerender } = render(wrap(<ToolNode {...defaultProps} />));
    const handle = container.querySelector('.react-flow__handle');
    expect(handle).toHaveClass('react-flow__handle-top');

    // Horizontal layout
    currentState = { ...defaultState, canvasLayout: 'horizontal' };
    rerender(wrap(<ToolNode {...defaultProps} data={{ ...defaultProps.data }} />));
    const handleContainer = container.querySelector('.group\\/h-tool');
    expect(handleContainer).toHaveClass('top-1/2');
  });

  it('calls setActiveNode on click', async () => {
      const user = userEvent.setup();
      render(wrap(<ToolNode {...defaultProps} />));
      
      const nodeBody = screen.getByText('Global Tool').closest('div')?.parentElement;
      await user.click(nodeBody!);
      
      expect(mockSetActiveNode).toHaveBeenCalledWith('tool-node-1');
  });
});
