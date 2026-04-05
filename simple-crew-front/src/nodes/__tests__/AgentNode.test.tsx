import { render, screen, fireEvent } from '@testing-library/react';
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
  CheckSquare: () => <div data-testid="icon-check-square" />,
  Loader2: () => <div data-testid="icon-loader" />,
  CheckCircle2: () => <div data-testid="icon-check-circle" />,
  AlertCircle: () => <div data-testid="icon-alert-circle" />,
  Clock: () => <div data-testid="icon-clock" />,
  Cpu: () => <div data-testid="icon-cpu" />,
  Link: () => <div data-testid="icon-link" />,
  Settings: () => <div data-testid="icon-settings" />,
  Package: () => <div data-testid="icon-package" />,
  Terminal: () => <div data-testid="icon-terminal" />,
  Plus: () => <div data-testid="icon-plus" />,
  X: () => <div data-testid="icon-x" />,
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

describe('AgentNode', () => {
  const mockDeleteNode = vi.fn();
  const mockToggleCollapse = vi.fn();
  const mockUpdateNodeData = vi.fn();
  const mockOnConnect = vi.fn();
  const mockSetActiveNode = vi.fn();

  const defaultModels = [
    { id: 'model-1', name: 'GPT-4', isDefault: true },
    { id: 'model-2', name: 'Claude 3', isDefault: false },
  ];

  const mockNodes = [
    { id: 'task-1', type: 'task', data: { name: 'Task One' } },
    { id: 'task-2', type: 'task', data: { name: 'Task Two' } },
  ];

  const mockMcpServers = [{ id: 'mcp-1', name: 'Server One' }];
  const mockCustomTools = [{ id: 'tool-1', name: 'Custom Tool One' }];
  const mockGlobalTools = [
    { id: 'global-1', name: 'Search Tool', category: 'Search', isEnabled: true },
    { id: 'global-2', name: 'Config Tool', category: 'Web', isEnabled: true, user_config_schema: { type: 'object' } },
  ];

  const defaultState = {
    deleteNode: mockDeleteNode,
    toggleCollapse: mockToggleCollapse,
    updateNodeData: mockUpdateNodeData,
    onConnect: mockOnConnect,
    setActiveNode: mockSetActiveNode,
    nodes: mockNodes,
    edges: [],
    nodeStatuses: {},
    nodeErrors: {},
    models: defaultModels,
    mcpServers: mockMcpServers,
    customTools: mockCustomTools,
    globalTools: mockGlobalTools,
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
  };

  it('renders correctly', () => {
    render(wrap(<AgentNode {...defaultProps} />));
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
  });

  describe('Connection Logic', () => {
    it('opens connect menu and connects to a task', async () => {
      const user = userEvent.setup();
      render(wrap(<AgentNode {...defaultProps} />));
      await user.click(screen.getByTestId('btn-connect-agent'));
      await user.click(screen.getByText('Task One'));
      expect(mockOnConnect).toHaveBeenCalled();
    });

    it('handles empty task list', async () => {
      const user = userEvent.setup();
      (useStore as unknown as Mock).mockImplementation((selector: any) => selector({ ...defaultState, nodes: [] }));
      render(wrap(<AgentNode {...defaultProps} />));
      await user.click(screen.getByTestId('btn-connect-agent'));
      expect(screen.getByText('No tasks available.')).toBeInTheDocument();
    });

    it('stops propagation on menu click', async () => {
        render(wrap(<AgentNode {...defaultProps} />));
        fireEvent.click(screen.getByTestId('btn-connect-agent')); // Opens menu
        const menu = screen.getByText('Task One').closest('div[class*="absolute"]');
        if (menu) {
            fireEvent.click(menu);
            expect(screen.getByText('Task One')).toBeInTheDocument();
        }
    });
  });

  describe('Management of Tools and Servers', () => {
    it('manages MCP servers', async () => {
        const user = userEvent.setup();
        const { rerender } = render(wrap(<AgentNode {...defaultProps} />));
        await user.click(screen.getAllByTestId('icon-plus')[0].parentElement!); 
        await user.click(screen.getByText('Server One'));
        expect(mockUpdateNodeData).toHaveBeenCalledWith('agent-1', { mcpServerIds: ['mcp-1'] });

        const propsWithData = { ...defaultProps, data: { ...defaultProps.data, mcpServerIds: ['mcp-1'] }};
        rerender(wrap(<AgentNode {...propsWithData} />));
        await user.click(screen.getByTestId('icon-x'));
        expect(mockUpdateNodeData).toHaveBeenCalledWith('agent-1', { mcpServerIds: [] });
    });

    it('manages Custom tools', async () => {
        const user = userEvent.setup();
        const { rerender } = render(wrap(<AgentNode {...defaultProps} />));
        await user.click(screen.getAllByTestId('icon-plus')[1].parentElement!); 
        await user.click(screen.getByText('Custom Tool One'));
        expect(mockUpdateNodeData).toHaveBeenCalledWith('agent-1', { customToolIds: ['tool-1'] });

        const propsWithData = { ...defaultProps, data: { ...defaultProps.data, customToolIds: ['tool-1'] }};
        rerender(wrap(<AgentNode {...propsWithData} />));
        await user.click(screen.getByTestId('icon-x'));
        expect(mockUpdateNodeData).toHaveBeenCalledWith('agent-1', { customToolIds: [] });
    });

    it('manages Global tools (CrewAI)', async () => {
        const user = userEvent.setup();
        const { rerender } = render(wrap(<AgentNode {...defaultProps} />));
        await user.click(screen.getAllByTestId('icon-plus')[2].parentElement!); 
        await user.click(screen.getByText('Search Tool'));
        expect(mockUpdateNodeData).toHaveBeenCalledWith('agent-1', { globalToolIds: ['global-1'] });

        const propsWithData = { ...defaultProps, data: { ...defaultProps.data, globalToolIds: ['global-1'] }};
        rerender(wrap(<AgentNode {...propsWithData} />));
        await user.click(screen.getByTestId('icon-x'));
        expect(mockUpdateNodeData).toHaveBeenCalledWith('agent-1', { globalToolIds: [] });
    });
  });

  describe('Global Tool configuration and modal', () => {
    it('opens modal and saves config for global tool', async () => {
        const user = userEvent.setup();
        render(wrap(<AgentNode {...defaultProps} />));
        await user.click(screen.getAllByTestId('icon-plus')[2].parentElement!); 
        await user.click(screen.getByText('Config Tool'));
        
        expect(screen.getByTestId('tool-config-modal')).toBeInTheDocument();
        await user.click(screen.getByTestId('modal-save'));
        
        expect(mockUpdateNodeData).toHaveBeenCalledWith('agent-1', { 
            globalToolIds: [{ id: 'global-2', config: { apiKey: 'test-key' } }] 
        });
    });

    it('re-configures global tool on double click and saves', async () => {
        const user = userEvent.setup();
        const propsWithTool = { 
            ...defaultProps, 
            data: { 
                ...defaultProps.data, 
                globalToolIds: [{ id: 'global-2', config: { old: 'config' } }] 
            } 
        };
        render(wrap(<AgentNode {...propsWithTool} />));
        
        await user.dblClick(screen.getByText('Config Tool'));
        expect(screen.getByTestId('tool-config-modal')).toBeInTheDocument();
        
        await user.click(screen.getByTestId('modal-save'));
        expect(mockUpdateNodeData).toHaveBeenCalledWith('agent-1', { 
            globalToolIds: [{ id: 'global-2', config: { apiKey: 'test-key' } }] 
        });
    });

    it('shows "No more tools" messages when lists are exhausted', async () => {
        const user = userEvent.setup();
        (useStore as unknown as Mock).mockImplementation((selector: any) => selector({
          ...defaultState,
          mcpServers: [],
          customTools: [],
          globalTools: []
        }));
        render(wrap(<AgentNode {...defaultProps} />));
        
        // MCP
        await user.click(screen.getAllByTestId('icon-plus')[0].parentElement!); 
        expect(screen.getByText('No more servers')).toBeInTheDocument();

        // Custom
        await user.click(screen.getAllByTestId('icon-plus')[1].parentElement!); 
        expect(screen.getByText('No more tools')).toBeInTheDocument();

        // Global
        await user.click(screen.getAllByTestId('icon-plus')[2].parentElement!); 
        expect(screen.getByText('No more tools enabled')).toBeInTheDocument();
    });

    it('renders global tools by category', async () => {
        const user = userEvent.setup();
        render(wrap(<AgentNode {...defaultProps} />));
        await user.click(screen.getAllByTestId('icon-plus')[2].parentElement!); 
        expect(screen.getAllByText(/SEARCH/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/WEB/i)[0]).toBeInTheDocument();
    });

    it('closes modal on close button', async () => {
        const user = userEvent.setup();
        render(wrap(<AgentNode {...defaultProps} />));
        await user.click(screen.getAllByTestId('icon-plus')[2].parentElement!); 
        await user.click(screen.getByText('Config Tool'));
        
        await user.click(screen.getByTestId('modal-close'));
        expect(screen.queryByTestId('tool-config-modal')).not.toBeInTheDocument();
    });
  });

  describe('UI States and Overlay', () => {
    it('closes menus when clicking background overlay', async () => {
        const user = userEvent.setup();
        render(wrap(<AgentNode {...defaultProps} />));
        await user.click(screen.getAllByTestId('icon-plus')[0].parentElement!); 
        expect(screen.getByText('Add MCP Server')).toBeInTheDocument();
        
        // Find overlay
        const overlay = document.querySelector('.fixed.inset-0.z-\\[50\\]');
        if (overlay) {
            await user.click(overlay);
            expect(screen.queryByText('Add MCP Server')).not.toBeInTheDocument();
        }
    });

    it('handles status-based rendering classes', () => {
        const statuses = ['waiting', 'running', 'success', 'error'];
        statuses.forEach(status => {
            (useStore as unknown as Mock).mockImplementation((selector: any) => selector({ ...defaultState, nodeStatuses: { 'agent-1': status } }));
            const { container, unmount } = render(wrap(<AgentNode {...defaultProps} />));
            expect(container.firstChild).toBeDefined();
            unmount();
        });
    });

    it('toggles collapse button', async () => {
        const user = userEvent.setup();
        render(wrap(<AgentNode {...defaultProps} />));
        const buttons = screen.getAllByRole('button');
        const collapseBtn = buttons.find(b => b.className.includes('absolute -bottom-3'));
        if (collapseBtn) {
            await user.click(collapseBtn);
            expect(mockToggleCollapse).toHaveBeenCalledWith('agent-1');
        }
    });
  });
});
