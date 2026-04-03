import { render, screen, fireEvent } from '@testing-library/react';
import { AgentForm } from '../AgentForm';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  Plus: () => <div data-testid="icon-plus" />,
  Cpu: () => <div data-testid="icon-cpu" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  Settings: () => <div data-testid="icon-settings" />,
  Code: () => <div data-testid="icon-code" />,
  FileText: () => <div data-testid="icon-filetext" />,
  Calendar: () => <div data-testid="icon-calendar" />,
  ToggleLeft: () => <div data-testid="icon-toggle-left" />,
  ToggleRight: () => <div data-testid="icon-toggle-right" />,
  ChevronDown: () => <div data-testid="icon-chevron-down" />,
  ChevronUp: () => <div data-testid="icon-chevron-up" />,
}));

// Mock @dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(),
}));
vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  verticalListSortingStrategy: {},
}));

// Mock HighlightedTextField
vi.mock('../../HighlightedTextField', () => ({
  HighlightedTextField: ({ value, onChange, type, placeholder }: any) => (
    type === 'input' 
      ? <input data-testid="highlighted-input" value={value} onChange={onChange} placeholder={placeholder} />
      : <textarea data-testid="highlighted-textarea" value={value} onChange={onChange} placeholder={placeholder} />
  )
}));

// Mock SortableItem
vi.mock('../SortableItem', () => ({
  SortableItem: ({ name }: any) => <div data-testid="sortable-item">{name}</div>
}));

describe('AgentForm', () => {
  let mockProps: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockProps = {
      data: {
        role: 'Test Role',
        goal: 'Test Goal',
        backstory: 'Test Backstory',
        modelId: 'model-1',
        temperature: 0.7,
        disabledToolIds: [],
        verbose: false,
        globalToolIds: ['tool-1'],
        mcpServerIds: ['mcp-1'],
        customToolIds: ['ctoon-1']
      },
      nodeId: 'node-1',
      updateNodeData: vi.fn(),
      models: [{ id: 'model-1', name: 'Model 1', isDefault: true }],
      mcpServers: [{ id: 'mcp-1', name: 'MCP Server 1' }, { id: 'mcp-2', name: 'MCP Server 2' }],
      globalTools: [{ id: 'tool-1', name: 'Global Tool 1', category: 'Search', isEnabled: true }],
      customTools: [{ id: 'ctoon-1', name: 'Custom Tool 1' }, { id: 'ctoon-2', name: 'Custom Tool 2' }],
      loadingFields: {},
      onAiSuggest: vi.fn(),
      onFieldKeyDown: vi.fn(),
      onFieldChange: vi.fn((e, _field, updateFn) => updateFn(e.target.value)),
      isMcpSelectorOpen: false,
      setIsMcpSelectorOpen: vi.fn(),
      isGlobalToolSelectorOpen: false,
      setIsGlobalToolSelectorOpen: vi.fn(),
      isCustomToolSelectorOpen: false,
      setIsCustomToolSelectorOpen: vi.fn(),
      setToolToConfigure: vi.fn(),
      setIsToolConfigModalOpen: vi.fn(),
      renderableTasks: [],
      handleTaskDragEnd: vi.fn(),
      sensors: []
    };
  });

  it('renders initial values correctly', () => {
    render(<AgentForm {...mockProps} />);
    
    const inputs = screen.getAllByTestId('highlighted-input');
    const textareas = screen.getAllByTestId('highlighted-textarea');
    
    expect(inputs[0]).toHaveValue('Test Role');
    expect(textareas[0]).toHaveValue('Test Goal');
    expect(textareas[1]).toHaveValue('Test Backstory');
  });

  it('triggers updates on field change', () => {
    render(<AgentForm {...mockProps} />);
    
    const roleInput = screen.getAllByTestId('highlighted-input')[0];
    fireEvent.change(roleInput, { target: { value: 'New Role' } });
    
    expect(mockProps.onFieldChange).toHaveBeenCalled();
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { role: 'New Role' });
  });

  it('switches tabs and handles LLM settings', () => {
    render(<AgentForm {...mockProps} />);
    
    fireEvent.click(screen.getByText('LLM'));
    
    expect(screen.getByText('Main Model')).toBeInTheDocument();
    
    // Model Select
    const modelSelect = screen.getByDisplayValue('Model 1');
    fireEvent.change(modelSelect, { target: { value: '' } });
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { modelId: undefined });

    // Temperature
    const tempInput = screen.getByPlaceholderText('0.7');
    fireEvent.change(tempInput, { target: { value: '0.9' } });
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { temperature: 0.9 });

    // Function Calling LLM
    const funcSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(funcSelect, { target: { value: 'model-1' } });
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { function_calling_llm_id: 'model-1' });
  });

  it('handles Tools tab interactions (Add/Remove/Toggle)', () => {
    render(<AgentForm {...mockProps} />);
    
    fireEvent.click(screen.getByText('Tools'));
    
    // Check initial tools are rendered
    expect(screen.getByText('Global Tool 1')).toBeInTheDocument();
    expect(screen.getByText('MCP Server 1')).toBeInTheDocument();
    expect(screen.getByText('Custom Tool 1')).toBeInTheDocument();

    // Toggle Tool (Enable/Disable)
    const toggleBtn = screen.getAllByTestId('icon-toggle-right')[0];
    fireEvent.click(toggleBtn);
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { disabledToolIds: ['tool-1'] });

    // Remove Tool
    const removeBtns = screen.getAllByTestId('icon-x');
    fireEvent.click(removeBtns[0]); // Remove Global Tool 1
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { globalToolIds: [] });

    // Open Selector
    const addBtns = screen.getAllByTestId('icon-plus');
    fireEvent.click(addBtns[0]); // Global tools plus
    expect(mockProps.setIsGlobalToolSelectorOpen).toHaveBeenCalledWith(true);
  });

  it('handles Execution tab interactions', () => {
    render(<AgentForm {...mockProps} />);
    
    fireEvent.click(screen.getByText('Exec'));
    
    // Toggles
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Verbose
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { verbose: true });

    // Numbers
    const numericInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(numericInputs[0], { target: { value: '10' } });
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { max_iter: 10 });

    // Select
    const codeExecSelect = screen.getByDisplayValue('Safe (Virtual)');
    fireEvent.change(codeExecSelect, { target: { value: 'unsafe' } });
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { code_execution_mode: 'unsafe' });
  });

  it('handles Templates tab interactions', () => {
    render(<AgentForm {...mockProps} />);
    
    fireEvent.click(screen.getByText('Templates'));
    
    // Date Format
    const dateInput = screen.getByPlaceholderText('%Y-%m-%d');
    fireEvent.change(dateInput, { target: { value: '%H:%M' } });
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { date_format: '%H:%M' });

    // Expand template
    const systemTplBtn = screen.getByText('System Template');
    fireEvent.click(systemTplBtn);
    
    const textarea = screen.getByPlaceholderText(/Enter custom system template/i);
    expect(textarea).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: 'Custom System Prompt' } });
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { system_template: 'Custom System Prompt' });
  });

  it('triggers AI suggest when goal and backstory sparkles are clicked', () => {
    render(<AgentForm {...mockProps} />);
    
    const sparkles = screen.getAllByTestId('icon-sparkles');
    fireEvent.click(sparkles[1]); // Goal sparkle
    expect(mockProps.onAiSuggest).toHaveBeenCalledWith('goal');
    
    fireEvent.click(sparkles[2]); // Backstory sparkle
    expect(mockProps.onAiSuggest).toHaveBeenCalledWith('backstory');
  });

  it('renders global tool selector content when open', () => {
    mockProps.isGlobalToolSelectorOpen = true;
    mockProps.data.globalToolIds = [];
    render(<AgentForm {...mockProps} />);
    
    // Switch to Tools tab
    fireEvent.click(screen.getByText(/Tools/i));
    
    expect(screen.getByText(/Global Tool 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Search/i)).toBeInTheDocument();
  });

  it('renders MCP selector content when open', () => {
    mockProps.isMcpSelectorOpen = true;
    mockProps.data.mcpServerIds = []; 
    render(<AgentForm {...mockProps} />);
    
    fireEvent.click(screen.getByText(/Tools/i));
    
    expect(screen.getByText(/MCP Server 1/i)).toBeInTheDocument();
    expect(screen.getByText(/MCP Server 2/i)).toBeInTheDocument();
  });

  it('renders Custom Tool selector content when open', () => {
    mockProps.isCustomToolSelectorOpen = true;
    mockProps.data.customToolIds = [];
    render(<AgentForm {...mockProps} />);
    
    fireEvent.click(screen.getByText(/Tools/i));
    
    expect(screen.getByText(/Custom Tool 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Custom Tool 2/i)).toBeInTheDocument();
  });

  it('handles tool selection with config schema', () => {
    const toolWithSchema = { 
      id: 'tool-2', 
      name: 'Configurable Tool', 
      category: 'Search', 
      isEnabled: true, 
      user_config_schema: { type: 'object' } 
    };
    mockProps.globalTools.push(toolWithSchema);
    mockProps.isGlobalToolSelectorOpen = true;
    
    render(<AgentForm {...mockProps} />);
    fireEvent.click(screen.getByText(/Tools/i));
    
    const configToolBtn = screen.getByText(/Configurable Tool/i);
    fireEvent.click(configToolBtn);
    
    expect(mockProps.setToolToConfigure).toHaveBeenCalledWith(toolWithSchema);
    expect(mockProps.setIsToolConfigModalOpen).toHaveBeenCalledWith(true);
    expect(mockProps.setIsGlobalToolSelectorOpen).toHaveBeenCalledWith(false);
  });

  it('handles task reordering via DnD', () => {
    mockProps.renderableTasks = [
      { id: 't1', type: 'task', data: { name: 'Task 1' } },
      { id: 't2', type: 'task', data: { name: 'Task 2' } }
    ];
    render(<AgentForm {...mockProps} />);
    fireEvent.click(screen.getByText('Exec'));
    
    expect(screen.getAllByTestId('sortable-item')).toHaveLength(2);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('handles MCP server selection', () => {
    mockProps.isMcpSelectorOpen = true;
    mockProps.data.mcpServerIds = ['mcp-1'];
    render(<AgentForm {...mockProps} />);
    
    fireEvent.click(screen.getByText('Tools'));
    
    fireEvent.click(screen.getByText('MCP Server 2'));
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', expect.objectContaining({
      mcpServerIds: ['mcp-1', 'mcp-2']
    }));
    expect(mockProps.setIsMcpSelectorOpen).toHaveBeenCalledWith(false);
  });

  it('handles custom tool selection', () => {
    mockProps.isCustomToolSelectorOpen = true;
    mockProps.data.customToolIds = ['ctoon-1'];
    render(<AgentForm {...mockProps} />);
    
    fireEvent.click(screen.getByText('Tools'));
    
    fireEvent.click(screen.getByText('Custom Tool 2'));
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', expect.objectContaining({
      customToolIds: ['ctoon-1', 'ctoon-2']
    }));
    expect(mockProps.setIsCustomToolSelectorOpen).toHaveBeenCalledWith(false);
  });

  it('toggles tool expansion in templates tab', () => {
    render(<AgentForm {...mockProps} />);
    fireEvent.click(screen.getByText('Templates'));
    
    const promptTplBtn = screen.getByText('Prompt Template');
    fireEvent.click(promptTplBtn);
    
    const textarea = screen.getByPlaceholderText(/Enter custom prompt template/i);
    expect(textarea).toBeInTheDocument();
    
    fireEvent.click(promptTplBtn); // Collapse
    expect(textarea).not.toBeInTheDocument();
  });
});
