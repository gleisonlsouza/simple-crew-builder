import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { McpNode } from '../McpNode';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { ReactFlowProvider, type NodeProps, type Node } from '@xyflow/react';
import type { AppState } from '../../store/index';
import type { Mock } from 'vitest';
import type { McpNodeData } from '../../types/nodes.types';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Package: () => <div data-testid="icon-package" />,
  Trash2: () => <div data-testid="icon-trash" />,
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

const wrap = (ui: React.ReactElement) => <ReactFlowProvider>{ui}</ReactFlowProvider>;

describe('McpNode', () => {
  const mockDeleteNode = vi.fn();
  const mockUpdateNodeData = vi.fn();
  const mockSetActiveNode = vi.fn();

  const mockMcpServers = [
    { id: 'mcp-1', name: 'File System', command: 'npx ...', isEnabled: true },
    { id: 'mcp-2', name: 'Browser', url: 'http://localhost:8000', isEnabled: true },
  ];

  const defaultState = {
    deleteNode: mockDeleteNode,
    updateNodeData: mockUpdateNodeData,
    setActiveNode: mockSetActiveNode,
    mcpServers: mockMcpServers,
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

  const defaultProps: NodeProps<Node<McpNodeData, 'mcp'>> = {
    id: 'mcp-node-1',
    data: { 
      serverId: 'mcp-1',
      name: 'File System'
    },
    type: 'mcp',
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

  it('renders correctly', () => {
    render(wrap(<McpNode {...defaultProps} />));
    expect(screen.getByText('MCP Server')).toBeInTheDocument();
    expect(screen.getByText('File System')).toBeInTheDocument();
  });

  it('updates serverId when selection changes', async () => {
    const user = userEvent.setup();
    render(wrap(<McpNode {...defaultProps} />));
    
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'mcp-2');
    
    expect(mockUpdateNodeData).toHaveBeenCalledWith('mcp-node-1', { 
      serverId: 'mcp-2', 
      name: 'Browser'
    });
  });

  it('calls deleteNode when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(wrap(<McpNode {...defaultProps} />));
    
    const deleteBtnIcon = screen.getByTestId('icon-trash');
    await user.click(deleteBtnIcon.parentElement!);
    
    expect(mockDeleteNode).toHaveBeenCalledWith('mcp-node-1');
  });

  it('shows status indicators correctly', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector({ 
        ...defaultState, 
        nodeStatuses: { 'mcp-node-1': 'running' } 
    }));
    render(wrap(<McpNode {...defaultProps} />));
    expect(screen.getAllByTestId('icon-loader')).toHaveLength(2); // One in top-right, one in status bar
    
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector({ 
        ...defaultState, 
        nodeStatuses: { 'mcp-node-1': 'success' } 
    }));
    const { rerender } = render(wrap(<McpNode {...defaultProps} />));
    rerender(wrap(<McpNode {...defaultProps} data={{...defaultProps.data}} />));
    expect(screen.getAllByTestId('icon-check-circle')).toHaveLength(2);
  });

  it('changes handle position based on layout', () => {
    const { container, rerender } = render(wrap(<McpNode {...defaultProps} />));
    const handleContainer = container.querySelector('.group\\/h-mcp');
    expect(handleContainer).toHaveClass('left-1/2'); // Vertical Top

    // Horizontal layout
    currentState = { ...defaultState, canvasLayout: 'horizontal' };
    rerender(wrap(<McpNode {...defaultProps} data={{...defaultProps.data}} />));
    const handleContainerHoriz = container.querySelector('.group\\/h-mcp');
    expect(handleContainerHoriz).toHaveClass('top-1/2');
  });

  it('calls setActiveNode on click', async () => {
    const user = userEvent.setup();
    render(wrap(<McpNode {...defaultProps} />));
    
    const nodeBody = screen.getByText('MCP Server').closest('div')?.parentElement;
    await user.click(nodeBody!);
    
    expect(mockSetActiveNode).toHaveBeenCalledWith('mcp-node-1');
  });
});
