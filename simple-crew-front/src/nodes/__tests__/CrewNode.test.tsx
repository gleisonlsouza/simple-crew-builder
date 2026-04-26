import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CrewNode } from '../CrewNode';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { ReactFlowProvider, type NodeProps, type Node } from '@xyflow/react';
import type { AppState } from '../../store/index';
import type { Mock } from 'vitest';
import type { CrewNodeData } from '../../types/nodes.types';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Users: () => <div data-testid="icon-users" />,
  Trash2: () => <div data-testid="icon-trash" />,
  ChevronDown: () => <div data-testid="icon-chevron-down" />,
  ChevronUp: () => <div data-testid="icon-chevron-up" />,
  Loader2: () => <div data-testid="icon-loader" />,
  CheckCircle2: () => <div data-testid="icon-check-circle" />,
  Link: () => <div data-testid="icon-link" />,
  Settings: () => <div data-testid="icon-settings" />,
  Clock: () => <div data-testid="icon-clock" />,
  AlertCircle: () => <div data-testid="icon-alert-circle" />,
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

describe('CrewNode', () => {
  const mockDeleteNode = vi.fn();
  const mockToggleCollapse = vi.fn();
  const mockOnConnect = vi.fn();
  const mockSetActiveNode = vi.fn();

  const mockNodes = [
    { id: 'agent-1', type: 'agent', data: { name: 'Agent One' } },
  ];

  const defaultState = {
    deleteNode: mockDeleteNode,
    toggleCollapse: mockToggleCollapse,
    onConnect: mockOnConnect,
    setActiveNode: mockSetActiveNode,
    nodes: mockNodes,
    edges: [],
    nodeStatuses: {},
    nodeErrors: {},
    currentProjectFramework: 'crewai',
    layout: 'vertical',
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
      verbose: true,
      memory: false,
      cache: false,
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
  } as any;

  it('renders correctly', () => {
    render(wrap(<CrewNode {...defaultProps} />));
    expect(screen.getByText('Test Crew')).toBeInTheDocument();
  });

  it('displays the correct process type', () => {
    render(wrap(<CrewNode {...defaultProps} />));
    expect(screen.getByTestId('crew-process')).toHaveTextContent('sequential');
  });

  it('contains target handles on top and source handle on right-source', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => 
        selector({ 
            ...defaultState, 
            currentProjectFramework: 'langgraph' 
        })
    );
    const { container } = render(wrap(<CrewNode {...defaultProps} />));
    
    const targets = container.querySelectorAll('.react-flow__handle-target');
    const source = container.querySelector('.react-flow__handle-source');
    
    expect(targets.length).toBe(2);
    expect(source).toBeInTheDocument();
    
    const targetIds = Array.from(targets).map(t => t.getAttribute('data-handleid'));
    expect(targetIds).toContain('trigger-in');
    expect(targetIds).toContain('state-in');
    
    // Source handle is now at the right-source
    expect(source).toHaveAttribute('data-handleid', 'right-source');
  });

  it('opens connection menu and connects to an agent', async () => {
    const user = userEvent.setup();
    render(wrap(<CrewNode {...defaultProps} />));
    
    const connectBtn = screen.getByTestId('btn-connect-crew');
    await user.click(connectBtn);
    
    const agentOption = screen.getByText('Agent One');
    await user.click(agentOption);
    
    expect(mockOnConnect).toHaveBeenCalledWith({
      source: 'crew-1',
      target: 'agent-1',
      sourceHandle: 'right-source',
      targetHandle: 'trigger-in'
    });
  });

  it('toggles collapse state', async () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => 
        selector({ 
            ...defaultState, 
            currentProjectFramework: 'custom' 
        })
    );
    const user = userEvent.setup();
    render(wrap(<CrewNode {...defaultProps} />));
    
    const collapseBtn = screen.getByLabelText('Collapse Crew');
    await user.click(collapseBtn);
    
    expect(mockToggleCollapse).toHaveBeenCalledWith('crew-1');
  });

  it('shows agent count from edges', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => 
        selector({ 
            ...defaultState, 
            edges: [{ source: 'crew-1', target: 'agent-1' }] 
        })
    );
    render(wrap(<CrewNode {...defaultProps} />));
    expect(screen.getByTestId('agent-count')).toHaveTextContent('1 Agent');
  });

  it('renders status indicators', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => 
        selector({ 
            ...defaultState, 
            nodeStatuses: { 'crew-1': 'running' } 
        })
    );
    render(wrap(<CrewNode {...defaultProps} />));
    expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
  });
});
