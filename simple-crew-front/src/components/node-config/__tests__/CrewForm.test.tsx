import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CrewForm } from '../CrewForm';
import type { CrewNodeData, ProcessType } from '../../../types/nodes.types';

// Mock icons
vi.mock('lucide-react', () => ({
  Trash2: () => <span data-testid="icon-trash" />,
  Plus: () => <span data-testid="icon-plus" />,
  Settings: () => <span data-testid="icon-settings" />,
  Users: () => <span data-testid="icon-users" />,
  Cpu: () => <span data-testid="icon-cpu" />,
  Zap: () => <span data-testid="icon-zap" />,
  Shield: () => <span data-testid="icon-shield" />,
  MessageSquare: () => <span data-testid="icon-message" />,
  ListTodo: () => <span data-testid="icon-todo" />,
}));

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  closestCenter: vi.fn(),
  useSensors: vi.fn(() => []),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  verticalListSortingStrategy: {},
  sortableKeyboardCoordinates: vi.fn(),
}));

// Mock SortableItem
vi.mock('../SortableItem', () => ({
  SortableItem: ({ name }: any) => <div data-testid="sortable-item">{name}</div>
}));

describe('CrewForm', () => {
  const mockUpdateNodeData = vi.fn();
  const mockHandleNameChange = vi.fn();
  const mockData: CrewNodeData = {
    name: 'Test Crew',
    process: 'sequential' as ProcessType,
    inputs: { 'var1': 'val1' },
    memory: false,
    cache: false,
    verbose: false,
    share_crew: false,
    max_rpm: 100,
    planning: false,
  };

  const defaultProps = {
    data: mockData,
    nodeId: 'node-1',
    updateNodeData: mockUpdateNodeData,
    localName: 'Test Crew',
    handleNameChange: mockHandleNameChange,
    nameError: false,
    renderableAgents: [],
    renderableTasks: [],
    handleAgentDragEnd: vi.fn(),
    handleTaskDragEnd: vi.fn(),
    sensors: [] as any,
    models: [
      { id: 'm1', name: 'GPT-4', model_type: 'LLM', provider: 'openai' },
      { id: 'm2', name: 'Claude 3', model_type: 'LLM', provider: 'anthropic' }
    ] as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders and switches between all tabs', () => {
    render(<CrewForm {...defaultProps} />);
    expect(screen.getByTestId('tab-basic')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('tab-orch'));
    expect(screen.getByText(/Agent Priority/i)).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('tab-settings'));
    expect(screen.getByText(/Memory/i)).toBeInTheDocument();
  });

  it('handles process change and hierarchical logic via rerender', () => {
    const { rerender } = render(<CrewForm {...defaultProps} />);
    
    // Default sequential
    expect(screen.getByText(/Tasks are executed in the order/i)).toBeInTheDocument();

    // Switch to hierarchical
    const processSelect = screen.getByRole('combobox');
    fireEvent.change(processSelect, { target: { value: 'hierarchical' } });
    expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', { process: 'hierarchical' });

    // Rerender with new process
    rerender(<CrewForm {...defaultProps} data={{ ...mockData, process: 'hierarchical' }} />);
    expect(screen.getByText(/Requires a Manager LLM/i)).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('tab-llm'));
    const managerSelect = screen.getByTestId('select-manager-llm');
    fireEvent.change(managerSelect, { target: { value: 'm1' } });
    expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', { manager_llm_id: 'm1' });
  });

  it('handles execution variables full CRUD', () => {
    render(<CrewForm {...defaultProps} />);
    
    fireEvent.click(screen.getByText(/Add Variable/i));
    expect(mockUpdateNodeData).toHaveBeenCalled();

    const keyInput = screen.getByDisplayValue('var1');
    fireEvent.change(keyInput, { target: { value: 'modified_key' } });
    expect(mockUpdateNodeData).toHaveBeenCalled();
    
    const valInput = screen.getByDisplayValue('val1');
    fireEvent.change(valInput, { target: { value: 'modified_val' } });
    expect(mockUpdateNodeData).toHaveBeenCalled();

    const trashIcons = screen.getAllByTestId('icon-trash');
    fireEvent.click(trashIcons[0].parentElement!);
    expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', { inputs: {} });
  });

  it('toggles all settings in SETTINGS tab', () => {
    render(<CrewForm {...defaultProps} />);
    fireEvent.click(screen.getByTestId('tab-settings'));
    
    fireEvent.click(screen.getByText('Cache').parentElement!);
    expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', { cache: true });

    const rpmInput = screen.getByPlaceholderText(/Unlimited/i);
    fireEvent.change(rpmInput, { target: { value: '500' } });
    expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', { max_rpm: 500 });
  });

  it('handles LLM and Planning configuration', () => {
    const { rerender } = render(<CrewForm {...defaultProps} />);
    fireEvent.click(screen.getByTestId('tab-llm'));
    
    fireEvent.click(screen.getByTestId('toggle-planning'));
    expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', { planning: true });

    rerender(<CrewForm {...defaultProps} data={{ ...mockData, planning: true }} />);
    fireEvent.click(screen.getByTestId('tab-llm'));
    
    const planningSelect = screen.getByTestId('select-planning-llm');
    fireEvent.change(planningSelect, { target: { value: 'm2' } });
    expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', { planning_llm_id: 'm2' });
  });

  it('handles name validation error state', () => {
    render(<CrewForm {...defaultProps} nameError={true} />);
    const nameInput = screen.getByPlaceholderText(/Marketing Research Crew/i);
    expect(nameInput.className).toContain('border-red-500');
  });

  it('displays empty placeholders for internal input keys', () => {
    const tempData: CrewNodeData = { 
      ...mockData, 
      inputs: { 'input_target_id': 'unique_value_99' } 
    };
    render(<CrewForm {...defaultProps} data={tempData} />);
    
    const inputs = screen.getAllByRole('textbox');
    // First input is the Name filter, then Key, then Value.
    // In our specific case with 1 input, index 1 is Key, index 2 is Value.
    const keyInput = inputs.find(i => (i as HTMLInputElement).value === '');
    const valInput = inputs.find(i => (i as HTMLInputElement).value === 'unique_value_99');
    
    expect(keyInput).toBeDefined();
    expect(valInput).toBeDefined();
  });
});
