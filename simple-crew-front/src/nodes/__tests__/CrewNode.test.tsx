import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CrewNode } from '../CrewNode';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { ReactFlowProvider, type NodeProps, type Node } from '@xyflow/react';
import type { AppState } from '../../store/index';
import type { Mock } from 'vitest';
import type { CrewNodeData } from '../../types/nodes.types';
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
  Users: () => <div data-testid="icon-users" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Loader2: () => <div data-testid="icon-loader" />,
  CheckCircle2: () => <div data-testid="icon-check-circle" />,
  AlertCircle: () => <div data-testid="icon-alert-circle" />,
  Clock: () => <div data-testid="icon-clock" />,
  Settings: () => <div data-testid="icon-settings" />,
  Link: () => <div data-testid="icon-link" />,
  ChevronDown: () => <div data-testid="icon-chevron-down" />,
  ChevronUp: () => <div data-testid="icon-chevron-up" />,
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

describe('CrewNode', () => {
  const mockDeleteNode = vi.fn();
  const mockToggleCollapse = vi.fn();
  const mockOnConnect = vi.fn();
  const mockSetActiveNode = vi.fn();

  const mockNodes = [
    { id: 'agent-1', type: 'agent', data: { name: 'Agent One' } },
    { id: 'agent-2', type: 'agent', data: { name: 'Agent Two' } },
    { id: 'task-1', type: 'task', data: { name: 'Task One' } },
  ];

  const mockEdges = [
    { source: 'crew-1', target: 'agent-1' },
    { source: 'crew-1', target: 'agent-2' },
  ];

  const defaultState = {
    deleteNode: mockDeleteNode,
    toggleCollapse: mockToggleCollapse,
    onConnect: mockOnConnect,
    setActiveNode: mockSetActiveNode,
    nodes: mockNodes,
    edges: mockEdges,
    nodeStatuses: {},
    nodeErrors: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as Mock).mockImplementation((selector: (state: any) => any) => {
      return selector(defaultState);
    });
  });

  const defaultProps: NodeProps<Node<CrewNodeData, 'crew'>> = {
    id: 'crew-1',
    data: { 
      name: 'Test Crew', 
      process: 'sequential',
      isCollapsed: false,
    },
    type: 'crew',
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

  it('renders correctly with name and process', () => {
    render(wrap(<CrewNode {...defaultProps} />));
    expect(screen.getByText('Test Crew')).toBeInTheDocument();
    expect(screen.getByTestId('crew-process')).toHaveTextContent('sequential');
  });

  it('renders default name when not provided', () => {
    const props = { ...defaultProps, data: { ...defaultProps.data, name: '' } };
    render(wrap(<CrewNode {...props} />));
    expect(screen.getByText('New Crew')).toBeInTheDocument();
  });

  it('shows child count (agent count)', () => {
      render(wrap(<CrewNode {...defaultProps} />));
      expect(screen.getByTestId('agent-count')).toHaveTextContent('2 Agents');
  });

  it('contains mandatory connection handles (Target and Source)', () => {
    render(wrap(<CrewNode {...defaultProps} />));
    
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
        selector({ ...defaultState, nodeStatuses: { 'crew-1': status } })
      );
      render(wrap(<CrewNode {...defaultProps} />));
      expect(screen.getByTestId(iconId)).toBeInTheDocument();
    });

    it('shows error icon when errors exist', () => {
        (useStore as unknown as Mock).mockImplementation((selector: any) => 
            selector({ ...defaultState, nodeErrors: { 'crew-1': ['Error message'] } })
        );
        render(wrap(<CrewNode {...defaultProps} />));
        expect(screen.getAllByTestId('icon-alert-circle').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByTitle('Error message')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls deleteNode when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(wrap(<CrewNode {...defaultProps} />));
      await user.click(screen.getByLabelText('Delete Crew'));
      expect(mockDeleteNode).toHaveBeenCalledWith('crew-1');
    });

    it('calls setActiveNode when config button is clicked', async () => {
      const user = userEvent.setup();
      render(wrap(<CrewNode {...defaultProps} />));
      await user.click(screen.getByLabelText('Configurar Crew'));
      expect(mockSetActiveNode).toHaveBeenCalledWith('crew-1');
    });

    it('calls setActiveNode on double click name', () => {
        render(wrap(<CrewNode {...defaultProps} />));
        fireEvent.doubleClick(screen.getByText('Test Crew'));
        expect(mockSetActiveNode).toHaveBeenCalledWith('crew-1');
    });

    it('calls toggleCollapse when collapse button is clicked', async () => {
        const user = userEvent.setup();
        render(wrap(<CrewNode {...defaultProps} />));
        await user.click(screen.getByLabelText('Collapse Crew'));
        expect(mockToggleCollapse).toHaveBeenCalledWith('crew-1');
    });

    it('hides content when collapsed', () => {
        const props = { ...defaultProps, data: { ...defaultProps.data, isCollapsed: true } };
        render(wrap(<CrewNode {...props} />));
        expect(screen.queryByTestId('crew-process')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Expand Crew')).toBeInTheDocument();
    });
  });

  describe('Connect Menu', () => {
      it('opens connect menu and lists agents', async () => {
          const user = userEvent.setup();
          render(wrap(<CrewNode {...defaultProps} />));
          
          await user.click(screen.getByTestId('btn-connect-crew'));
          expect(screen.getByText('Agent One')).toBeInTheDocument();
          expect(screen.getByText('Agent Two')).toBeInTheDocument();
          expect(screen.queryByText('Task One')).not.toBeInTheDocument();
      });

      it('calls onConnect when agent is selected', async () => {
          const user = userEvent.setup();
          render(wrap(<CrewNode {...defaultProps} />));
          
          await user.click(screen.getByTestId('btn-connect-crew'));
          await user.click(screen.getByText('Agent One'));
          
          expect(mockOnConnect).toHaveBeenCalledWith({
              source: 'crew-1',
              target: 'agent-1',
              sourceHandle: 'right-source',
              targetHandle: 'top-target'
          });
      });

      it('shows empty state when no agents available', async () => {
          (useStore as unknown as Mock).mockImplementation((selector: any) => 
            selector({ ...defaultState, nodes: [] })
          );
          const user = userEvent.setup();
          render(wrap(<CrewNode {...defaultProps} />));
          
          await user.click(screen.getByTestId('btn-connect-crew'));
          expect(screen.getByText('No agents available.')).toBeInTheDocument();
      });

      it('closes menu when clicking window', async () => {
          const user = userEvent.setup();
          render(wrap(<CrewNode {...defaultProps} />));
          
          await user.click(screen.getByTestId('btn-connect-crew'));
          expect(screen.getByText('Agent One')).toBeInTheDocument();
          
          fireEvent.click(window);
          expect(screen.queryByText('Agent One')).not.toBeInTheDocument();
      });
  });
});
