import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskNode } from '../TaskNode';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { ReactFlowProvider, type NodeProps, type Node } from '@xyflow/react';
import type { AppState } from '../../store/index';
import type { Mock } from 'vitest';
import type { TaskNodeData } from '../../types/nodes.types';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CheckSquare: () => <div data-testid="icon-check-square" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Loader2: () => <div data-testid="icon-loader" />,
  CheckCircle2: () => <div data-testid="icon-check-circle" />,
  AlertCircle: () => <div data-testid="icon-alert-circle" />,
  Clock: () => <div data-testid="icon-clock" />,
  Settings: () => <div data-testid="icon-settings" />,
  ChevronDown: () => <div data-testid="icon-chevron-down" />,
  ChevronUp: () => <div data-testid="icon-chevron-up" />,
  Wrench: () => <div data-testid="icon-wrench" />,
  Server: () => <div data-testid="icon-server" />,
}));

// Mock Handle component
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    Handle: ({ type, id }: any) => <div data-testid={`handle-${type}`} data-handleid={id} className={`react-flow__handle-${type}`} />,
    useUpdateNodeInternals: () => vi.fn(),
  };
});

// Mock the store
vi.mock('../../store/index', () => ({
  useStore: vi.fn(),
}));

// Mock zustand/shallow
vi.mock('zustand/shallow', () => ({
  useShallow: (fn: (state: AppState) => unknown) => fn,
}));

// Helper to wrap component with ReactFlowProvider
const wrap = (ui: React.ReactElement) => <ReactFlowProvider>{ui}</ReactFlowProvider>;

describe('TaskNode', () => {
  const mockDeleteNode = vi.fn();
  const mockToggleCollapse = vi.fn();
  const mockSetActiveNode = vi.fn();

  const defaultState = {
    deleteNode: mockDeleteNode,
    toggleCollapse: mockToggleCollapse,
    setActiveNode: mockSetActiveNode,
    nodeStatuses: {},
    nodeErrors: {},
    edges: [],
    currentProjectFramework: 'crewai',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as Mock).mockImplementation((selector: (state: any) => any) => {
      return selector(defaultState);
    });
  });

  const defaultProps: NodeProps<Node<TaskNodeData, 'task'>> = {
    id: 'task-1',
    data: { 
      name: 'Test Task', 
      description: 'Test Description',
      expected_output: 'Expected Output',
      isCollapsed: false,
    },
    type: 'task',
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

  it('renders correctly with title and description', () => {
    render(wrap(<TaskNode {...defaultProps} />));
    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('renders default title and description when not provided', () => {
    const props = { ...defaultProps, data: { ...defaultProps.data, name: '', description: '' } };
    render(wrap(<TaskNode {...props} />));
    expect(screen.getByText('New Task')).toBeInTheDocument();
    expect(screen.getByText('No description defined')).toBeInTheDocument();
  });

  it('contains target handle at the top with standardized ID', () => {
    const { container } = render(wrap(<TaskNode {...defaultProps} />));
    const handle = container.querySelector('.react-flow__handle-target');
    expect(handle).toBeInTheDocument();
    expect(handle).toHaveAttribute('data-handleid', 'left-target');
  });

  it('contains the expected source handles for CrewAI', () => {
    const { container } = render(wrap(<TaskNode {...defaultProps} />));
    const handles = container.querySelectorAll('.react-flow__handle-source');
    
    // out-tool, out-custom-tool
    expect(handles.length).toBe(2);
    
    const handleIds = Array.from(handles).map(h => h.getAttribute('data-handleid'));
    expect(handleIds).toContain('out-tool');
    expect(handleIds).toContain('out-custom-tool');
  });

  describe('Status Visuals', () => {
    it.each([
      ['waiting', 'icon-clock'],
      ['running', 'icon-loader'],
      ['success', 'icon-check-circle'],
      ['error', 'icon-alert-circle'],
    ])('shows correct icon for status %s', (status, iconId) => {
      (useStore as unknown as Mock).mockImplementation((selector: any) => 
        selector({ ...defaultState, nodeStatuses: { 'task-1': status } })
      );
      render(wrap(<TaskNode {...defaultProps} />));
      expect(screen.getByTestId(iconId)).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls deleteNode when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(wrap(<TaskNode {...defaultProps} />));
      await user.click(screen.getByLabelText('Delete Task'));
      expect(mockDeleteNode).toHaveBeenCalledWith('task-1');
    });

    it('calls setActiveNode when config button is clicked', async () => {
      const user = userEvent.setup();
      render(wrap(<TaskNode {...defaultProps} />));
      await user.click(screen.getByLabelText('Config Task'));
      expect(mockSetActiveNode).toHaveBeenCalledWith('task-1');
    });

    it('calls toggleCollapse when collapse button is clicked', async () => {
        const user = userEvent.setup();
        render(wrap(<TaskNode {...defaultProps} />));
        const buttons = screen.getAllByRole('button');
        const collapseBtn = buttons.find(b => b.className.includes('absolute -bottom-3'));
        if (collapseBtn) {
            await user.click(collapseBtn);
            expect(mockToggleCollapse).toHaveBeenCalledWith('task-1', ['out-tool', 'out-custom-tool']);
        } else {
            throw new Error('Collapse button not found');
        }
    });

    it('remains description visible when collapsed (CrewAI preference)', () => {
        const props = { ...defaultProps, data: { ...defaultProps.data, isCollapsed: true } };
        render(wrap(<TaskNode {...props} />));
        expect(screen.getByText('Test Description')).toBeInTheDocument();
    });
  });
});
