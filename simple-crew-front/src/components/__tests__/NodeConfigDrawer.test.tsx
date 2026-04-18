import { render, screen, fireEvent } from '@testing-library/react';
import { NodeConfigDrawer } from '../NodeConfigDrawer';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useNodeConfig } from '../../hooks/useNodeConfig';
import type { Mock } from 'vitest';

// 1. Mock useNodeConfig hook
vi.mock('../../hooks/useNodeConfig', () => ({
  useNodeConfig: vi.fn(),
}));

vi.mock('../node-config/VariableAutocomplete', () => ({
  VariableAutocomplete: ({ onSelect, isOpen }: any) => isOpen ? (
    <div data-testid="mock-variable-autocomplete">
      <span data-testid="autocomplete-title">Available Variables</span>
      <button onClick={() => onSelect('var_1')}>var_1</button>
    </div>
  ) : null
}));
vi.mock('../node-config/AgentForm', () => ({
  AgentForm: () => <div data-testid="mock-agent-form" />
}));
vi.mock('../node-config/TaskForm', () => ({
  TaskForm: () => <div data-testid="mock-task-form" />
}));
vi.mock('../node-config/CrewForm', () => ({
  CrewForm: () => <div data-testid="mock-crew-form" />
}));
vi.mock('../node-config/ChatForm', () => ({
  ChatForm: () => <div data-testid="mock-chat-form" />
}));
vi.mock('../node-config/WebhookForm', () => ({
  WebhookForm: () => <div data-testid="mock-webhook-form" />
}));
vi.mock('../ToolConfigurationModal', () => ({
  ToolConfigurationModal: () => <div data-testid="mock-tool-config-modal" />
}));
vi.mock('../node-config/LangGraphAgentForm', () => ({
  LangGraphAgentForm: () => <div data-testid="mock-langgraph-agent-form" />
}));
vi.mock('../node-config/LangGraphTaskForm', () => ({
  LangGraphTaskForm: () => <div data-testid="mock-langgraph-task-form" />
}));
vi.mock('../node-config/GraphForm', () => ({
  GraphForm: () => <div data-testid="mock-graph-form" />
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Plus: () => <div data-testid="icon-plus" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  AlertCircle: () => <div data-testid="icon-alert" />,
}));

describe('NodeConfigDrawer', () => {
  const mockSetActiveNode = vi.fn();
  const mockDeleteNode = vi.fn();
  const mockHandleBulkAiSuggest = vi.fn();
  const mockHandleSelectSuggestion = vi.fn();

  const defaultMockReturn = {
    activeNodeId: null,
    activeNode: null,
    nodes: [],
    setActiveNode: mockSetActiveNode,
    updateNodeData: vi.fn(),
    deleteNode: mockDeleteNode,
    models: [],
    mcpServers: [],
    customTools: [],
    globalTools: [],
    localName: '',
    nameError: false,
    suggestionState: { isOpen: false, filter: '', selectedIndex: 0, anchorRect: null },
    loadingFields: {},
    isToolConfigModalOpen: false,
    setIsToolConfigModalOpen: vi.fn(),
    toolToConfigure: null,
    setToolToConfigure: vi.fn(),
    setSuggestionState: vi.fn(),
    isAgent: false,
    isTask: false,
    isCrew: false,
    isChat: false,
    isWebhook: false,
    renderableAgents: [],
    renderableTasks: [],
    handleNameChange: vi.fn(),
    handleBulkAiSuggest: mockHandleBulkAiSuggest,
    handleSelectSuggestion: mockHandleSelectSuggestion,
    allProjectVariables: [],
    stateFields: [],
    stateNodes: [],
    variables: {},
    currentProjectFramework: 'crewai',
    nodeWarnings: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no node is active', () => {
    (useNodeConfig as Mock).mockReturnValue(defaultMockReturn);
    const { container } = render(<NodeConfigDrawer />);
    expect(container.firstChild).toBeNull();
  });

  const nodeTypes = [
    { type: 'agent', isAgent: true, testId: 'mock-agent-form' },
    { type: 'task', isTask: true, testId: 'mock-task-form' },
    { type: 'crew', isCrew: true, testId: 'mock-crew-form' },
    { type: 'chat', isChat: true, testId: 'mock-chat-form' },
    { type: 'webhook', isWebhook: true, testId: 'mock-webhook-form' },
  ];

  nodeTypes.forEach(({ type, isAgent, isTask, isCrew, isChat, isWebhook, testId }) => {
    it(`renders correct title and form for node type: ${type}`, () => {
      (useNodeConfig as Mock).mockReturnValue({
        ...defaultMockReturn,
        activeNodeId: 'node-1',
        activeNode: { id: 'node-1', type, data: {} },
        isAgent: !!isAgent,
        isTask: !!isTask,
        isCrew: !!isCrew,
        isChat: !!isChat,
        isWebhook: !!isWebhook,
      });

      render(<NodeConfigDrawer />);
      
      expect(screen.getByText(new RegExp(`${type} Configuration`, 'i'))).toBeInTheDocument();
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });
  });

  it('handles name validation error', () => {
    (useNodeConfig as Mock).mockReturnValue({
      ...defaultMockReturn,
      activeNodeId: 'node-1',
      activeNode: { id: 'node-1', type: 'agent', data: {} },
      isAgent: true,
      nameError: true,
    });

    render(<NodeConfigDrawer />);
    expect(screen.getByText(/This name is already in use/i)).toBeInTheDocument();
  });

  it('triggers bulk AI suggestion', () => {
    (useNodeConfig as Mock).mockReturnValue({
      ...defaultMockReturn,
      activeNodeId: 'node-1',
      activeNode: { id: 'node-1', type: 'agent', data: {} },
      isAgent: true,
    });

    render(<NodeConfigDrawer />);
    const sparkleBtn = screen.getByTestId('icon-sparkles').parentElement!;
    fireEvent.click(sparkleBtn);
    expect(mockHandleBulkAiSuggest).toHaveBeenCalled();
  });

  it('renders autocomplete suggestions and handles selection', () => {
    (useNodeConfig as Mock).mockReturnValue({
      ...defaultMockReturn,
      activeNodeId: 'node-1',
      activeNode: { id: 'node-1', type: 'agent', data: {} },
      isAgent: true,
      nodes: [
        { id: 'crew-1', type: 'crew', data: { inputs: { 'var_1': 'val' } } }
      ],
      suggestionState: { 
        isOpen: true, 
        filter: '', 
        selectedIndex: 0, 
        anchorRect: { top: 100, left: 100, bottom: 120, height: 20 } 
      },
    });

    render(<NodeConfigDrawer />);
    expect(screen.getByTestId('mock-variable-autocomplete')).toBeInTheDocument();
    expect(screen.getByTestId('autocomplete-title')).toHaveTextContent('Available Variables');
    
    // Suggestion button
    const suggestionBtn = screen.getByText('var_1');
    fireEvent.click(suggestionBtn);
    expect(mockHandleSelectSuggestion).toHaveBeenCalledWith('var_1');
  });

  it('renders node warnings', () => {
    (useNodeConfig as Mock).mockReturnValue({
      ...defaultMockReturn,
      activeNodeId: 'node-1',
      activeNode: { id: 'node-1', type: 'agent', data: {} },
      isAgent: true,
      nodeWarnings: ['Missing Tool', 'Weak Model'],
    });

    render(<NodeConfigDrawer />);
    expect(screen.getByText('Dependency Warnings')).toBeInTheDocument();
    expect(screen.getByText('Missing Tool')).toBeInTheDocument();
    expect(screen.getByText('Weak Model')).toBeInTheDocument();
  });
});
