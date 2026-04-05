import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskNode } from '../TaskNode';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { ReactFlowProvider, type NodeProps, type Node, Handle, Position } from '@xyflow/react';
import type { AppState } from '../../store/index';
import type { Mock } from 'vitest';
import type { TaskNodeData } from '../../types/nodes.types';
import React from 'react';

// Mock Handle component
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    Handle: ({ type, id }: any) => <div data-testid={`handle-${type}`} data-handleid={id} className={`react-flow__handle-${type}`} />,
  };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CheckSquare: () => <div data-testid="icon-check-square" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Loader2: () => <div data-testid="icon-loader" />,
  CheckCircle2: () => <div data-testid="icon-check-circle" />,
  AlertCircle: () => <div data-testid="icon-alert-circle" />,
  Clock: () => <div data-testid="icon-clock" />,
  Settings: () => <div data-testid="icon-settings" />,
  Plus: () => <div data-testid="icon-plus" />,
  X: () => <div data-testid="icon-x" />,
  Terminal: () => <div data-testid="icon-terminal" />,
  ChevronDown: () => <div data-testid="icon-chevron-down" />,
  ChevronUp: () => <div data-testid="icon-chevron-up" />,
}));

// Mock ToolConfigurationModal
vi.mock('../../components/ToolConfigurationModal', () => ({
  ToolConfigurationModal: ({ onSave, onClose }: { onSave: (config: any) => void; onClose: () => void }) => (
    <div data-testid="tool-config-modal">
      <button data-testid="modal-save" onClick={() => onSave({ apiKey: 'test-key' })}>Save</button>
      <button data-testid="modal-close" onClick={onClose}>Close</button>
    </div>
  ),
}));

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
  const mockUpdateNodeData = vi.fn();
  const mockSetActiveNode = vi.fn();

  const mockCustomTools = [{ id: 'tool-1', name: 'Custom Tool One' }];
  const mockGlobalTools = [
    { id: 'global-1', name: 'Search Tool', category: 'Search', isEnabled: true },
    { id: 'global-2', name: 'Config Tool', category: 'Web', isEnabled: true, user_config_schema: { type: 'object' } },
  ];

  const defaultState = {
    deleteNode: mockDeleteNode,
    toggleCollapse: mockToggleCollapse,
    updateNodeData: mockUpdateNodeData,
    setActiveNode: mockSetActiveNode,
    nodeStatuses: {},
    nodeErrors: {},
    customTools: mockCustomTools,
    globalTools: mockGlobalTools,
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
  };

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

  it('contains mandatory connection handles (Target and Source)', () => {
    render(wrap(<TaskNode {...defaultProps} />));
    
    // Check for target handles
    const targets = screen.getAllByTestId('handle-target');
    expect(targets.length).toBeGreaterThanOrEqual(4);

    // Check for source handles
    const sources = screen.getAllByTestId('handle-source');
    expect(sources.length).toBeGreaterThanOrEqual(4);
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

    it('shows error icon and tooltip when errors exist', () => {
        (useStore as unknown as Mock).mockImplementation((selector: any) => 
            selector({ ...defaultState, nodeErrors: { 'task-1': ['Error message'] } })
        );
        render(wrap(<TaskNode {...defaultProps} />));
        const errorIcons = screen.getAllByTestId('icon-alert-circle');
        expect(errorIcons.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByTitle('Error message')).toBeInTheDocument();
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

    it('calls setActiveNode on double click title', async () => {
        render(wrap(<TaskNode {...defaultProps} />));
        fireEvent.doubleClick(screen.getByText('Test Task'));
        expect(mockSetActiveNode).toHaveBeenCalledWith('task-1');
    });

    it('calls toggleCollapse when collapse button is clicked', async () => {
        const user = userEvent.setup();
        render(wrap(<TaskNode {...defaultProps} />));
        const collapseBtn = screen.getByTestId('icon-chevron-up').parentElement!;
        await user.click(collapseBtn);
        expect(mockToggleCollapse).toHaveBeenCalledWith('task-1');
    });

    it('hides content when collapsed', () => {
        const props = { ...defaultProps, data: { ...defaultProps.data, isCollapsed: true } };
        render(wrap(<TaskNode {...props} />));
        expect(screen.queryByText('Test Description')).not.toBeInTheDocument();
        expect(screen.getByTestId('icon-chevron-down')).toBeInTheDocument();
    });
  });

  describe('Tool Management', () => {
    it('manages Global tools', async () => {
        const user = userEvent.setup();
        const { rerender } = render(wrap(<TaskNode {...defaultProps} />));
        
        // Open selector
        await user.click(screen.getAllByTestId('icon-plus')[0].parentElement!); 
        await user.click(screen.getByText('Search Tool'));
        expect(mockUpdateNodeData).toHaveBeenCalledWith('task-1', { globalToolIds: ['global-1'] });

        // Remove tool
        const propsWithTool = { ...defaultProps, data: { ...defaultProps.data, globalToolIds: ['global-1'] }};
        rerender(wrap(<TaskNode {...propsWithTool} />));
        await user.click(screen.getByTestId('icon-x'));
        expect(mockUpdateNodeData).toHaveBeenCalledWith('task-1', { globalToolIds: [] });
    });

    it('manages Custom tools', async () => {
        const user = userEvent.setup();
        const { rerender } = render(wrap(<TaskNode {...defaultProps} />));
        
        // Open selector
        await user.click(screen.getAllByTestId('icon-plus')[1].parentElement!); 
        await user.click(screen.getByText('Custom Tool One'));
        expect(mockUpdateNodeData).toHaveBeenCalledWith('task-1', { customToolIds: ['tool-1'] });

        // Remove tool
        const propsWithTool = { ...defaultProps, data: { ...defaultProps.data, customToolIds: ['tool-1'] }};
        rerender(wrap(<TaskNode {...propsWithTool} />));
        await user.click(screen.getByTestId('icon-x'));
        expect(mockUpdateNodeData).toHaveBeenCalledWith('task-1', { customToolIds: [] });
    });

    it('opens configuration modal for global tools with schema', async () => {
        const user = userEvent.setup();
        render(wrap(<TaskNode {...defaultProps} />));
        
        await user.click(screen.getAllByTestId('icon-plus')[0].parentElement!); 
        await user.click(screen.getByText('Config Tool'));
        
        expect(screen.getByTestId('tool-config-modal')).toBeInTheDocument();
        await user.click(screen.getByTestId('modal-save'));
        
        expect(mockUpdateNodeData).toHaveBeenCalledWith('task-1', { 
            globalToolIds: [{ id: 'global-2', config: { apiKey: 'test-key' } }] 
        });
    });

    it('re-configures global tool on double click', async () => {
        const user = userEvent.setup();
        const propsWithTool = { 
            ...defaultProps, 
            data: { 
                ...defaultProps.data, 
                globalToolIds: [{ id: 'global-2', config: { old: 'config' } }] 
            } 
        };
        render(wrap(<TaskNode {...propsWithTool} />));
        
        await user.dblClick(screen.getByText('Config Tool'));
        expect(screen.getByTestId('tool-config-modal')).toBeInTheDocument();
        
        await user.click(screen.getByTestId('modal-save'));
        expect(mockUpdateNodeData).toHaveBeenCalledWith('task-1', { 
            globalToolIds: [{ id: 'global-2', config: { apiKey: 'test-key' } }] 
        });
    });
  });

  it('closes menus when clicking window', async () => {
      render(wrap(<TaskNode {...defaultProps} />));
      const plusBtn = screen.getAllByTestId('icon-plus')[0].parentElement!;
      fireEvent.click(plusBtn);
      expect(screen.getByText('Add CrewAI Tool')).toBeInTheDocument();
      
      fireEvent.click(window);
      expect(screen.queryByText('Add CrewAI Tool')).not.toBeInTheDocument();
  });
});
