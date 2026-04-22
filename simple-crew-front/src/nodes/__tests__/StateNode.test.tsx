import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StateNode } from '../StateNode';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { ReactFlowProvider, type NodeProps, type Node } from '@xyflow/react';
import type { AppState } from '../../store/index';
import type { Mock } from 'vitest';
import type { StateNodeData } from '../../types/nodes.types';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Trash2: () => <div data-testid="icon-trash" />,
  Settings: () => <div data-testid="icon-settings" />,
  Server: () => <div data-testid="icon-server" />,
  List: () => <div data-testid="icon-list" />,
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

describe('StateNode', () => {
  const mockDeleteNode = vi.fn();
  const mockOpenStateModal = vi.fn();

  const defaultState = {
    deleteNode: mockDeleteNode,
    openStateModal: mockOpenStateModal,
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

  const defaultProps: NodeProps<Node<StateNodeData, 'state'>> = {
    id: 'state-1',
    data: { 
      name: 'Test State',
      fields: [
        { id: 'f-1', key: 'user_id', type: 'string', description: 'desc' },
        { id: 'f-2', key: 'is_active', type: 'boolean', description: 'desc' }
      ]
    },
    type: 'state',
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

  it('renders correctly with fields', () => {
    render(wrap(<StateNode {...defaultProps} />));
    expect(screen.getByText('Test State')).toBeInTheDocument();
    expect(screen.getByText('user_id')).toBeInTheDocument();
    expect(screen.getByText('string')).toBeInTheDocument();
    expect(screen.getByText('is_active')).toBeInTheDocument();
    expect(screen.getByText('boolean')).toBeInTheDocument();
  });

  it('renders "No fields defined" when empty', () => {
    const emptyProps = {
        ...defaultProps,
        data: { ...defaultProps.data, fields: [] }
    };
    render(wrap(<StateNode {...emptyProps} />));
    expect(screen.getByText('No fields defined')).toBeInTheDocument();
  });

  it('calls openStateModal when clicked', async () => {
    const user = userEvent.setup();
    render(wrap(<StateNode {...defaultProps} />));
    
    const node = screen.getByTestId('node-state');
    await user.click(node);
    
    expect(mockOpenStateModal).toHaveBeenCalledWith('state-1');
  });

  it('calls deleteNode when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(wrap(<StateNode {...defaultProps} />));
    
    const deleteBtn = screen.getByTitle('Delete state');
    await user.click(deleteBtn);
    
    expect(mockDeleteNode).toHaveBeenCalledWith('state-1');
  });

  it('contains target handles for each field', () => {
    const { container } = render(wrap(<StateNode {...defaultProps} />));
    const handles = container.querySelectorAll('.react-flow__handle-left');
    expect(handles.length).toBe(2);
    expect(handles[0].getAttribute('data-handleid')).toBe('field-in-user_id');
    expect(handles[1].getAttribute('data-handleid')).toBe('field-in-is_active');
  });

  it('changes source handle position based on layout', () => {
    const { container, rerender } = render(wrap(<StateNode {...defaultProps} />));
    const handleContainer = container.querySelector('.group\\/h-state');
    expect(handleContainer).toHaveClass('left-1/2'); // Vertical Bottom

    // Horizontal layout
    currentState = { ...defaultState, canvasLayout: 'horizontal' };
    rerender(wrap(<StateNode {...defaultProps} data={{...defaultProps.data}} />));
    const handleContainerHoriz = container.querySelector('.group\\/h-state');
    expect(handleContainerHoriz).toHaveClass('top-1/2');
  });
});
