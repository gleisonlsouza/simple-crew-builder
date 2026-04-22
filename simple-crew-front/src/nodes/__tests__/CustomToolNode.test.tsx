import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomToolNode } from '../CustomToolNode';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { ReactFlowProvider, type NodeProps, type Node } from '@xyflow/react';
import type { AppState } from '../../store/index';
import type { Mock } from 'vitest';
import type { CustomToolNodeData } from '../../types/nodes.types';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Terminal: () => <div data-testid="icon-terminal" />,
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

describe('CustomToolNode', () => {
  const mockDeleteNode = vi.fn();
  const mockUpdateNodeData = vi.fn();
  const mockSetActiveNode = vi.fn();

  const mockCustomTools = [
    { id: 'ct-1', name: 'PyScript', description: 'Run python code', isEnabled: true },
    { id: 'ct-2', name: 'BashScript', description: 'Run bash code', isEnabled: true },
  ];

  const defaultState = {
    deleteNode: mockDeleteNode,
    updateNodeData: mockUpdateNodeData,
    setActiveNode: mockSetActiveNode,
    customTools: mockCustomTools,
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

  const defaultProps: NodeProps<Node<CustomToolNodeData, 'customTool'>> = {
    id: 'ct-node-1',
    data: { 
      toolId: 'ct-1',
      name: 'PyScript'
    },
    type: 'customTool',
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
    render(wrap(<CustomToolNode {...defaultProps} />));
    expect(screen.getByText('Custom Tool')).toBeInTheDocument();
    expect(screen.getByText('PyScript')).toBeInTheDocument();
    expect(screen.getByText('Run python code')).toBeInTheDocument();
  });

  it('updates toolId when selection changes', async () => {
    const user = userEvent.setup();
    render(wrap(<CustomToolNode {...defaultProps} />));
    
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'ct-2');
    
    expect(mockUpdateNodeData).toHaveBeenCalledWith('ct-node-1', { 
      toolId: 'ct-2', 
      name: 'BashScript'
    });
  });

  it('calls deleteNode when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(wrap(<CustomToolNode {...defaultProps} />));
    
    const deleteBtnIcon = screen.getByTestId('icon-trash');
    await user.click(deleteBtnIcon.parentElement!);
    
    expect(mockDeleteNode).toHaveBeenCalledWith('ct-node-1');
  });

  it('shows status indicators correctly', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector({ 
        ...defaultState, 
        nodeStatuses: { 'ct-node-1': 'running' } 
    }));
    render(wrap(<CustomToolNode {...defaultProps} />));
    expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
    
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector({ 
        ...defaultState, 
        nodeStatuses: { 'ct-node-1': 'success' } 
    }));
    const { rerender } = render(wrap(<CustomToolNode {...defaultProps} />));
    rerender(wrap(<CustomToolNode {...defaultProps} data={{...defaultProps.data}} />));
    expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument();
  });

  it('changes handle position based on layout', () => {
    const { container, rerender } = render(wrap(<CustomToolNode {...defaultProps} />));
    const handleContainer = container.querySelector('.group\\/h-tool');
    expect(handleContainer).toHaveClass('left-1/2'); // Vertical Top

    // Horizontal layout
    currentState = { ...defaultState, canvasLayout: 'horizontal' };
    rerender(wrap(<CustomToolNode {...defaultProps} data={{...defaultProps.data}} />));
    const handleContainerHoriz = container.querySelector('.group\\/h-tool');
    expect(handleContainerHoriz).toHaveClass('top-1/2');
  });

  it('calls setActiveNode on click', async () => {
    const user = userEvent.setup();
    render(wrap(<CustomToolNode {...defaultProps} />));
    
    const nodeBody = screen.getByText('Custom Tool').closest('div')?.parentElement;
    await user.click(nodeBody!);
    
    expect(mockSetActiveNode).toHaveBeenCalledWith('ct-node-1');
  });
});
