import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AgentForm } from '../AgentForm';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { AgentNodeData, AppNode } from '../../../types/nodes.types';
import type { ModelConfig, ToolConfig, CustomTool, MCPServer } from '../../../types/config.types';

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
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(),
}));
vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: {},
}));

// Mock HighlightedTextField
vi.mock('../../HighlightedTextField', () => ({
  default: ({ value, onChange, type, placeholder }: { value: string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }) => void, type: 'input' | 'textarea', placeholder?: string }) => (
    type === 'input' 
      ? <input data-testid="highlighted-input" value={value} onChange={(e) => onChange(e as React.ChangeEvent<HTMLInputElement>)} placeholder={placeholder} />
      : <textarea data-testid="highlighted-textarea" value={value} onChange={(e) => onChange(e as React.ChangeEvent<HTMLTextAreaElement>)} placeholder={placeholder} />
  )
}));

// Mock SortableItem
vi.mock('../SortableItem', () => ({
  SortableItem: ({ name }: { name: string }) => <div data-testid="sortable-item">{name}</div>
}));

describe('AgentForm', () => {
  interface AgentFormTestProps {
    data: AgentNodeData;
    nodeId: string;
    updateNodeData: ReturnType<typeof vi.fn>;
    models: ModelConfig[];
    mcpServers: MCPServer[];
    globalTools: ToolConfig[];
    customTools: CustomTool[];
    loadingFields: Record<string, boolean>;
    onAiSuggest: ReturnType<typeof vi.fn>;
    onFieldKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }, field: string, updateFn: (val: string) => void) => void;
    isMcpSelectorOpen: boolean;
    setIsMcpSelectorOpen: ReturnType<typeof vi.fn>;
    isGlobalToolSelectorOpen: boolean;
    setIsGlobalToolSelectorOpen: ReturnType<typeof vi.fn>;
    isCustomToolSelectorOpen: boolean;
    setIsCustomToolSelectorOpen: ReturnType<typeof vi.fn>;
    setToolToConfigure: ReturnType<typeof vi.fn>;
    setIsToolConfigModalOpen: ReturnType<typeof vi.fn>;
    renderableTasks: AppNode[];
    handleTaskDragEnd: ReturnType<typeof vi.fn>;
    sensors: unknown[];
  }

  let mockProps: AgentFormTestProps;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockProps = {
      data: {
        name: 'Test Agent',
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
      } as unknown as AgentNodeData,
      nodeId: 'node-1',
      updateNodeData: vi.fn(),
      models: [{ id: 'model-1', name: 'Model 1', isDefault: true }] as unknown as ModelConfig[],
      mcpServers: [{ id: 'mcp-1', name: 'MCP Server 1' }, { id: 'mcp-2', name: 'MCP Server 2' }] as unknown as MCPServer[],
      globalTools: [{ id: 'tool-1', name: 'Global Tool 1', category: 'Search', isEnabled: true }] as unknown as ToolConfig[],
      customTools: [{ id: 'ctoon-1', name: 'Custom Tool 1' }, { id: 'ctoon-2', name: 'Custom Tool 2' }] as unknown as CustomTool[],
      loadingFields: {},
      onAiSuggest: vi.fn(),
      onFieldKeyDown: vi.fn(),
      onFieldChange: vi.fn((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }, _field: string, updateFn: (val: string) => void) => updateFn(e.target.value)),
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

  afterEach(() => {
    cleanup();
  });

  it('renders initial values correctly', () => {
    // @ts-expect-error - Sensors type is too complex for simple mock
    render(<AgentForm {...mockProps} />);
    
    const inputs = screen.getAllByTestId('highlighted-input');
    const textareas = screen.getAllByTestId('highlighted-textarea');
    
    expect(inputs[0]).toHaveValue('Test Role');
    expect(textareas[0]).toHaveValue('Test Goal');
    expect(textareas[1]).toHaveValue('Test Backstory');
  });

  it('triggers updates on field change', () => {
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    
    const roleInput = screen.getAllByTestId('highlighted-input')[0];
    fireEvent.change(roleInput, { target: { value: 'New Role' } });
    
    expect(mockProps.onFieldChange).toHaveBeenCalled();
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { role: 'New Role' });

    const textareas = screen.getAllByTestId('highlighted-textarea');
    fireEvent.change(textareas[0], { target: { value: 'New Goal' } });
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { goal: 'New Goal' });

    fireEvent.change(textareas[1], { target: { value: 'New Backstory' } });
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { backstory: 'New Backstory' });
  });

  it('switches tabs and handles LLM settings', () => {
    // @ts-expect-error - Sensors
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
    // @ts-expect-error - Sensors
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
    // @ts-expect-error - Sensors
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
    // @ts-expect-error - Sensors
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
    // @ts-expect-error - Sensors
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
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    
    // Switch to Tools tab
    fireEvent.click(screen.getByText(/Tools/i));
    
    expect(screen.getByText(/Global Tool 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Search/i)).toBeInTheDocument();
  });

  it('renders MCP selector content when open', () => {
    mockProps.isMcpSelectorOpen = true;
    mockProps.data.mcpServerIds = []; 
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    
    fireEvent.click(screen.getByText(/Tools/i));
    
    expect(screen.getByText(/MCP Server 1/i)).toBeInTheDocument();
    expect(screen.getByText(/MCP Server 2/i)).toBeInTheDocument();
  });

  it('renders Custom Tool selector content when open', () => {
    mockProps.isCustomToolSelectorOpen = true;
    mockProps.data.customToolIds = [];
    // @ts-expect-error - Sensors
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
    mockProps.globalTools.push(toolWithSchema as unknown as ToolConfig);
    mockProps.isGlobalToolSelectorOpen = true;
    
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    fireEvent.click(screen.getByText(/Tools/i));
    
    const configToolBtn = screen.getByText(/Configurable Tool/i);
    fireEvent.click(configToolBtn);
    
    expect(mockProps.setToolToConfigure).toHaveBeenCalledWith(toolWithSchema);
    expect(mockProps.setIsToolConfigModalOpen).toHaveBeenCalledWith(true);
    expect(mockProps.setIsGlobalToolSelectorOpen).toHaveBeenCalledWith(false);
  });

  it('handles tool selection WITHOUT config schema', () => {
    const simpleTool = { id: 'tool-3', name: 'Simple Tool', category: 'Search', isEnabled: true };
    mockProps.globalTools.push(simpleTool as unknown as ToolConfig);
    mockProps.isGlobalToolSelectorOpen = true;
    mockProps.data.globalToolIds = ['tool-1'];
    
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    fireEvent.click(screen.getByText(/Tools/i));
    
    const simpleToolBtn = screen.getByText(/Simple Tool/i);
    fireEvent.click(simpleToolBtn);
    
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', expect.objectContaining({
      globalToolIds: ['tool-1', 'tool-3']
    }));
    expect(mockProps.setIsGlobalToolSelectorOpen).toHaveBeenCalledWith(false);
  });

  it('handles task reordering via DnD', () => {
    mockProps.renderableTasks = [
      { id: 't1', type: 'task', data: { name: 'Task 1' } as unknown as AppNode['data'] },
      { id: 't2', type: 'task', data: { name: 'Task 2' } as unknown as AppNode['data'] }
    ] as unknown as AppNode[];
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    fireEvent.click(screen.getByText('Exec'));
    
    expect(screen.getAllByTestId('sortable-item')).toHaveLength(2);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('handles MCP server selection', () => {
    mockProps.isMcpSelectorOpen = true;
    mockProps.data.mcpServerIds = ['mcp-1'];
    // @ts-expect-error - Sensors
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
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    
    fireEvent.click(screen.getByText('Tools'));
    
    fireEvent.click(screen.getByText('Custom Tool 2'));
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', expect.objectContaining({
      customToolIds: ['ctoon-1', 'ctoon-2']
    }));
    expect(mockProps.setIsCustomToolSelectorOpen).toHaveBeenCalledWith(false);
  });

  it('toggles tool expansion in templates tab', () => {
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    fireEvent.click(screen.getByText('Templates'));
    
    const promptTplBtn = screen.getByText('Prompt Template');
    fireEvent.click(promptTplBtn);
    
    const textarea = screen.getByPlaceholderText(/Enter custom prompt template/i);
    expect(textarea).toBeInTheDocument();
    
    fireEvent.click(promptTplBtn); // Collapse
    expect(textarea).not.toBeInTheDocument();
  });

  it('handles Tool disabling and enabling toggle backwards', () => {
    mockProps.data.disabledToolIds = ['tool-1'];
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    fireEvent.click(screen.getByText('Tools'));
    
    // Toggle Tool that is ALREADY disabled to enable it
    const toggleBtn = screen.getAllByTestId('icon-toggle-left')[0];
    fireEvent.click(toggleBtn);
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { disabledToolIds: [] });
  });

  it('triggers AI suggest for role sparkle', () => {
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    const sparkles = screen.getAllByTestId('icon-sparkles');
    fireEvent.click(sparkles[0]); // Role sparkle
    expect(mockProps.onAiSuggest).toHaveBeenCalledWith('role');
  });

  it('handles overlay clicks for selectors', () => {
    mockProps.isGlobalToolSelectorOpen = true;
    mockProps.isMcpSelectorOpen = true;
    mockProps.isCustomToolSelectorOpen = true;
    
    // @ts-expect-error - Sensors
    const { container } = render(<AgentForm {...mockProps} />);
    fireEvent.click(screen.getByText('Tools'));
    
    const overlays = container.querySelectorAll('.fixed.inset-0');
    expect(overlays.length).toBeGreaterThan(0);
    
    overlays.forEach(overlay => fireEvent.click(overlay));
    
    expect(mockProps.setIsGlobalToolSelectorOpen).toHaveBeenCalledWith(false);
    expect(mockProps.setIsMcpSelectorOpen).toHaveBeenCalledWith(false);
    expect(mockProps.setIsCustomToolSelectorOpen).toHaveBeenCalledWith(false);
  });

  it('handles the plus buttons to open selectors', () => {
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    fireEvent.click(screen.getByText('Tools'));
    
    const addBtns = screen.getAllByTestId('icon-plus');
    fireEvent.click(addBtns[1]); // MCP Plus
    expect(mockProps.setIsMcpSelectorOpen).toHaveBeenCalledWith(true);
    
    fireEvent.click(addBtns[2]); // Custom Plus
    expect(mockProps.setIsCustomToolSelectorOpen).toHaveBeenCalledWith(true);
  });

  it('handles removal of MCP servers and Custom Tools', () => {
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    fireEvent.click(screen.getByText('Tools'));
    
    const removeBtns = screen.getAllByTestId('icon-x');
    fireEvent.click(removeBtns[1]); // Remove MCP Server 1
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { mcpServerIds: [] });
    
    fireEvent.click(removeBtns[2]); // Remove Custom Tool 1
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { customToolIds: [] });
  });

  it('applies shimmer animation when AI suggest is loading', () => {
    mockProps.loadingFields = { role: true, goal: true, backstory: true };
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    
    const sparkleButtons = screen.getAllByTitle('Generate with AI');
    expect(sparkleButtons[0]).toHaveClass('animate-sparkle-shimmer');
    expect(sparkleButtons[1]).toHaveClass('animate-sparkle-shimmer');
    expect(sparkleButtons[2]).toHaveClass('animate-sparkle-shimmer');
  });

  it('handles undefined or partial data safely', () => {
    // @ts-expect-error - Testing partial data
    mockProps.data = { name: 'Partial Agent' }; 
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    
    // Inputs should show empty strings instead of undefined
    const roleInput = screen.getAllByTestId('highlighted-input')[0];
    expect(roleInput).toHaveValue('');
    
    fireEvent.click(screen.getByText('LLM'));
    expect(screen.getAllByDisplayValue(/Default/)[0]).toBeInTheDocument();
  });

  it('handles scenario with no default model', () => {
    mockProps.models = [{ id: 'm1', name: 'Model 1', isDefault: false } as unknown as ModelConfig];
    mockProps.data.modelId = undefined;
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    fireEvent.click(screen.getByText('LLM'));
    
    expect(screen.getByText('Default (Not set)')).toBeInTheDocument();
  });

  it('handles temperature clearing (empty string -> undefined)', () => {
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    fireEvent.click(screen.getByText('LLM'));
    
    const tempInput = screen.getByPlaceholderText('0.7');
    fireEvent.change(tempInput, { target: { value: '' } });
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { temperature: undefined });
  });

  it('handles tool IDs as objects for legacy support', () => {
    // @ts-expect-error - Testing legacy object format
    mockProps.data.globalToolIds = [{ id: 'tool-1' }];
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    fireEvent.click(screen.getByText('Tools'));
    
    expect(screen.getByText('Global Tool 1')).toBeInTheDocument();
  });

  it('skips rendering for non-existent tool/server/custom IDs (ghost IDs)', () => {
    mockProps.data.globalToolIds = ['ghost-tool'];
    mockProps.data.mcpServerIds = ['ghost-mcp'];
    mockProps.data.customToolIds = ['ghost-custom'];
    
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    fireEvent.click(screen.getByText('Tools'));
    
    // Should not crash and should not render items that don't exist in props lists
    expect(screen.queryByText('ghost-tool')).not.toBeInTheDocument();
  });

  it('handles clearing of other numeric fields like max_iter', async () => {
    const dataWithMaxIter = { ...mockProps.data, max_iter: 10 };
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} data={dataWithMaxIter} />);
    fireEvent.click(screen.getByText('Exec'));
    
    // Selection by label is now possible due to htmlFor/id
    const input = screen.getByLabelText(/MAX ITER/i);
    
    fireEvent.change(input, { target: { value: '' } });
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', { max_iter: undefined });
  });

  it('uses fallback "Task" name in reordering list', () => {
    mockProps.renderableTasks = [
      { id: 't1', type: 'task', data: { name: '' } as any }
    ] as any;
    // @ts-expect-error - Sensors
    render(<AgentForm {...mockProps} />);
    fireEvent.click(screen.getByText('Exec'));
    
    expect(screen.getByText('Task')).toBeInTheDocument();
  });
});
