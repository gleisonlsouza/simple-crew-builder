import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterNode } from '../RouterNode';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { ReactFlowProvider, type NodeProps, type Node } from '@xyflow/react';
import type { AppState } from '../../store/index';
import type { Mock } from 'vitest';
import type { RouterNodeData } from '../../types/nodes.types';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  GitBranch: () => <div data-testid="icon-git-branch" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Settings: () => <div data-testid="icon-settings" />,
  ListChecks: () => <div data-testid="icon-list-checks" />,
  Check: () => <div data-testid="icon-check" />,
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

describe('RouterNode', () => {
  const mockDeleteNode = vi.fn();
  const mockOpenRouterModal = vi.fn();
  const mockFocusNodeTree = vi.fn();

  const defaultState = {
    deleteNode: mockDeleteNode,
    openRouterModal: mockOpenRouterModal,
    focusNodeTree: mockFocusNodeTree,
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

  const defaultProps: NodeProps<Node<RouterNodeData, 'router'>> = {
    id: 'router-1',
    data: { 
      name: 'Test Router',
      conditions: [
        { id: 'cond-1', label: 'Success Path', condition: 'status == "success"' },
        { id: 'cond-2', label: 'Failure Path', condition: 'status == "failure"' }
      ],
      defaultRouteLabel: 'Fallback',
      executedRoute: undefined
    },
    type: 'router',
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
    render(wrap(<RouterNode {...defaultProps} />));
    expect(screen.getByText('Test Router')).toBeInTheDocument();
    expect(screen.getByText('Success Path')).toBeInTheDocument();
    expect(screen.getByText('Failure Path')).toBeInTheDocument();
    expect(screen.getByText('Fallback')).toBeInTheDocument();
  });

  it('calls focusNodeTree when clicked', async () => {
    const user = userEvent.setup();
    render(wrap(<RouterNode {...defaultProps} />));
    
    const node = screen.getByTestId('node-router');
    await user.click(node);
    
    expect(mockFocusNodeTree).toHaveBeenCalledWith('router-1');
  });

  it('calls openRouterModal on settings button click', async () => {
    const user = userEvent.setup();
    render(wrap(<RouterNode {...defaultProps} />));
    
    const settingsBtn = screen.getByTitle('Configure Logic');
    await user.click(settingsBtn);
    
    expect(mockOpenRouterModal).toHaveBeenCalledWith('router-1');
  });

  it('calls openRouterModal on double click header', async () => {
    const user = userEvent.setup();
    render(wrap(<RouterNode {...defaultProps} />));
    
    const header = screen.getByText('Test Router');
    await user.dblClick(header);
    
    expect(mockOpenRouterModal).toHaveBeenCalledWith('router-1');
  });

  it('calls deleteNode when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(wrap(<RouterNode {...defaultProps} />));
    
    const deleteBtn = screen.getByTitle('Delete router');
    await user.click(deleteBtn);
    
    expect(mockDeleteNode).toHaveBeenCalledWith('router-1');
  });

  it('shows executed route correctly', () => {
    const propsWithExecuted = {
        ...defaultProps,
        data: { ...defaultProps.data, executedRoute: 'route-cond-1' }
    };
    render(wrap(<RouterNode {...propsWithExecuted} />));
    
    // Check for the check icon in the success path
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
    
    // Check for classes - though testing Tailwind classes is brittle, we can check if it exists
    const successRoute = screen.getByText('Success Path').closest('div');
    expect(successRoute?.parentElement).toHaveClass('bg-green-500/20');
  });

  it('changes handle position based on layout', () => {
    const { container, rerender } = render(wrap(<RouterNode {...defaultProps} />));
    const inHandleContainer = container.querySelector('.group\\/h-router-in');
    expect(inHandleContainer).toHaveClass('left-1/2'); // Vertical default

    // Horizontal layout
    currentState = { ...defaultState, canvasLayout: 'horizontal' };
    rerender(wrap(<RouterNode {...defaultProps} data={{...defaultProps.data}} />));
    const inHandleContainerHoriz = container.querySelector('.group\\/h-router-in');
    expect(inHandleContainerHoriz).toHaveClass('top-1/2');
  });
});
