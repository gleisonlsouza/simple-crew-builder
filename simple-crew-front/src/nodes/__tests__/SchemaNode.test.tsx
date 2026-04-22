import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SchemaNode } from '../SchemaNode';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { ReactFlowProvider, type NodeProps, type Node } from '@xyflow/react';
import type { AppState } from '../../store/index';
import type { Mock } from 'vitest';
import type { SchemaNodeData } from '../../types/nodes.types';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Trash2: () => <div data-testid="icon-trash" />,
  Settings: () => <div data-testid="icon-settings" />,
  Brackets: () => <div data-testid="icon-brackets" />,
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

describe('SchemaNode', () => {
  const mockDeleteNode = vi.fn();
  const mockOpenSchemaModal = vi.fn();

  const defaultState = {
    deleteNode: mockDeleteNode,
    openSchemaModal: mockOpenSchemaModal,
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

  const defaultProps: NodeProps<Node<SchemaNodeData, 'schema'>> = {
    id: 'schema-1',
    data: { 
      name: 'Test Schema',
      fields: [
        { id: 'f-1', key: 'name', type: 'string', description: 'desc' },
        { id: 'f-2', key: 'age', type: 'integer', description: 'desc' }
      ]
    },
    type: 'schema',
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
    render(wrap(<SchemaNode {...defaultProps} />));
    expect(screen.getByText('Test Schema')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('string')).toBeInTheDocument();
    expect(screen.getByText('age')).toBeInTheDocument();
    expect(screen.getByText('integer')).toBeInTheDocument();
  });

  it('renders "No attributes defined" when empty', () => {
    const emptyProps = {
        ...defaultProps,
        data: { ...defaultProps.data, fields: [] }
    };
    render(wrap(<SchemaNode {...emptyProps} />));
    expect(screen.getByText('No attributes defined')).toBeInTheDocument();
  });

  it('calls openSchemaModal when clicked', async () => {
    const user = userEvent.setup();
    render(wrap(<SchemaNode {...defaultProps} />));
    
    const node = screen.getByTestId('node-schema');
    await user.click(node);
    
    expect(mockOpenSchemaModal).toHaveBeenCalledWith('schema-1');
  });

  it('calls deleteNode when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(wrap(<SchemaNode {...defaultProps} />));
    
    const deleteBtn = screen.getByTitle('Delete schema');
    await user.click(deleteBtn);
    
    expect(mockDeleteNode).toHaveBeenCalledWith('schema-1');
  });

  it('changes handle position based on layout', () => {
    const { container, rerender } = render(wrap(<SchemaNode {...defaultProps} />));
    const handleContainer = container.querySelector('.group\\/h-schema');
    expect(handleContainer).toHaveClass('left-1/2'); // Vertical Bottom

    // Horizontal layout
    currentState = { ...defaultState, canvasLayout: 'horizontal' };
    rerender(wrap(<SchemaNode {...defaultProps} data={{...defaultProps.data}} />));
    const handleContainerHoriz = container.querySelector('.group\\/h-schema');
    expect(handleContainerHoriz).toHaveClass('top-1/2');
  });
});
