import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentNode } from '../AgentNode';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { ReactFlowProvider, type NodeProps, type Node } from '@xyflow/react';
import type { AppState } from '../../store/index';
import type { Mock } from 'vitest';
import type { AgentNodeData } from '../../types/nodes.types';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  User: () => <div data-testid="icon-user" />,
  Trash2: () => <div data-testid="icon-trash" />,
  ChevronDown: () => <div data-testid="icon-chevron-down" />,
  ChevronUp: () => <div data-testid="icon-chevron-up" />,
  Loader2: () => <div data-testid="icon-loader" />,
  CheckCircle2: () => <div data-testid="icon-check-circle" />,
  AlertCircle: () => <div data-testid="icon-alert-circle" />,
  Clock: () => <div data-testid="icon-clock" />,
  Cpu: () => <div data-testid="icon-cpu" />,
  Settings: () => <div data-testid="icon-settings" />,
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

describe('AgentNode', () => {
  const mockDeleteNode = vi.fn();
  const mockToggleCollapse = vi.fn();
  const mockUpdateNodeData = vi.fn();
  const mockSetActiveNode = vi.fn();

  const defaultModels = [
    { id: 'model-1', name: 'GPT-4', isDefault: true },
    { id: 'model-2', name: 'Claude 3', isDefault: false },
  ];

  const defaultState = {
    deleteNode: mockDeleteNode,
    toggleCollapse: mockToggleCollapse,
    updateNodeData: mockUpdateNodeData,
    setActiveNode: mockSetActiveNode,
    nodes: [],
    edges: [],
    nodeStatuses: {},
    nodeErrors: {},
    models: defaultModels,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as Mock).mockImplementation((selector: (state: any) => any) => {
      return selector(defaultState);
    });
  });

  const defaultProps: NodeProps<Node<AgentNodeData, 'agent'>> = {
    id: 'agent-1',
    data: { 
      name: 'Test Agent', 
      role: 'Tester',
      goal: 'Complete the test',
      backstory: 'Testing expert',
      isCollapsed: false,
      modelId: 'model-1'
    },
    type: 'agent',
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
    render(wrap(<AgentNode {...defaultProps} />));
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('Complete the test')).toBeInTheDocument();
  });

  it('displays the correct model and allows changing it', async () => {
    const user = userEvent.setup();
    render(wrap(<AgentNode {...defaultProps} />));
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('model-1');
    
    await user.selectOptions(select, 'model-2');
    expect(mockUpdateNodeData).toHaveBeenCalledWith('agent-1', { modelId: 'model-2' });
  });

  it('calls deleteNode when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(wrap(<AgentNode {...defaultProps} />));
    
    const deleteBtn = screen.getByTitle('Delete node');
    await user.click(deleteBtn);
    
    expect(mockDeleteNode).toHaveBeenCalledWith('agent-1');
  });

  it('calls toggleCollapse when collapse button is clicked', async () => {
    const user = userEvent.setup();
    render(wrap(<AgentNode {...defaultProps} />));
    
    // The collapse button is the one with the Chevron icon
    const buttons = screen.getAllByRole('button');
    const actualCollapseBtn = buttons.find(b => b.className.includes('absolute -bottom-3'));
    
    if (actualCollapseBtn) {
        await user.click(actualCollapseBtn);
        expect(mockToggleCollapse).toHaveBeenCalledWith('agent-1');
    } else {
        throw new Error('Collapse button not found');
    }
  });

  it('shows status indicators correctly', () => {
     (useStore as unknown as Mock).mockImplementation((selector: any) => selector({ 
         ...defaultState, 
         nodeStatuses: { 'agent-1': 'running' } 
     }));
     render(wrap(<AgentNode {...defaultProps} />));
     expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
     
     (useStore as unknown as Mock).mockImplementation((selector: any) => selector({ 
         ...defaultState, 
         nodeStatuses: { 'agent-1': 'success' } 
     }));
     const { rerender } = render(wrap(<AgentNode {...defaultProps} />));
     rerender(wrap(<AgentNode {...defaultProps} />));
     expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument();
  });

  it('contains the expected handles for the vertical architecture', () => {
    const { container } = render(wrap(<AgentNode {...defaultProps} />));
    
    // Check for handles using their data attributes or class names
    const handles = container.querySelectorAll('.react-flow__handle');
    
    // We expect 6 handles: agent-in, schema-input (Top), out-task, out-tool, out-mcp, agent-out (Bottom)
    expect(handles.length).toBe(6);
    
    const handleIds = Array.from(handles).map(h => h.getAttribute('data-handleid'));
    expect(handleIds).toContain('agent-in');
    expect(handleIds).toContain('schema-input');
    expect(handleIds).toContain('out-task');
    expect(handleIds).toContain('out-tool');
    expect(handleIds).toContain('out-mcp');
    expect(handleIds).toContain('agent-out');
  });

  it('opens config drawer on settings button click', async () => {
    const user = userEvent.setup();
    render(wrap(<AgentNode {...defaultProps} />));
    
    const settingsBtn = screen.getByTitle('Config Agent');
    await user.click(settingsBtn);
    
    expect(mockSetActiveNode).toHaveBeenCalledWith('agent-1');
  });
});
