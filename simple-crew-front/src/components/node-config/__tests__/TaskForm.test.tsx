import { render, screen, fireEvent } from '@testing-library/react';
import { TaskForm } from '../TaskForm';
import { vi, describe, it, expect } from 'vitest';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  Plus: () => <div data-testid="icon-plus" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  User: () => <div data-testid="icon-user" />,
  Settings: () => <div data-testid="icon-settings" />,
  FileOutput: () => <div data-testid="icon-fileoutput" />,
}));

vi.mock('../../HighlightedTextField', () => ({
  HighlightedTextField: ({ value, onChange, placeholder }: any) => (
    <textarea data-testid="highlighted-textarea" value={value} onChange={onChange} placeholder={placeholder} />
  )
}));

describe('TaskForm', () => {
  const mockProps = {
    data: {
      description: 'Test Task Description',
      expected_output: 'Test Expected Output',
      agentId: 'agent-1',
      context: [],
      async_execution: false,
      human_input: false,
      output_file: 'result.md',
      create_directory: true
    },
    nodeId: 'node-task-1',
    updateNodeData: vi.fn(),
    nodes: [
      { id: 'agent-1', type: 'agent', data: { name: 'Agent 1' } },
      { id: 'agent-2', type: 'agent', data: { name: 'Agent 2' } },
      { id: 'task-other', type: 'task', data: { name: 'Previous Task' } }
    ],
    loadingFields: {},
    onAiSuggest: vi.fn(),
    onFieldKeyDown: vi.fn(),
    onFieldChange: vi.fn((e, _field, updateFn) => updateFn(e.target.value)),
    isContextSelectorOpen: false,
    setIsContextSelectorOpen: vi.fn(),
  };

  it('renders initial values correctly', () => {
    render(<TaskForm {...(mockProps as any)} />);
    
    expect(screen.getByText('Agent 1')).toBeInTheDocument();
    const textareas = screen.getAllByTestId('highlighted-textarea');
    expect(textareas[0]).toHaveValue('Test Task Description');
    expect(textareas[1]).toHaveValue('Test Expected Output');
  });

  it('triggers update on field change', () => {
    render(<TaskForm {...(mockProps as any)} />);
    
    const descTextarea = screen.getAllByTestId('highlighted-textarea')[0];
    fireEvent.change(descTextarea, { target: { value: 'New Description' } });
    
    expect(mockProps.onFieldChange).toBeCalled();
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-task-1', { description: 'New Description' });
  });

  it('opens agent selector and selects new agent', () => {
    render(<TaskForm {...(mockProps as any)} />);
    
    const agentButton = screen.getByText('Agent 1');
    fireEvent.click(agentButton);
    
    expect(screen.getByText('Available Agents')).toBeInTheDocument();
    const agent2Option = screen.getByText('Agent 2');
    fireEvent.click(agent2Option);
    
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-task-1', { agentId: 'agent-2' });
  });

  it('triggers context selector toggle', () => {
    render(<TaskForm {...(mockProps as any)} />);
    
    const addContextBtn = screen.getByText('Add Context');
    fireEvent.click(addContextBtn);
    
    expect(mockProps.setIsContextSelectorOpen).toHaveBeenCalled();
  });

  it('toggles execution settings', () => {
    render(<TaskForm {...(mockProps as any)} />);
    
    const asyncCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(asyncCheckbox);
    
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-task-1', { async_execution: true });
  });

  it('triggers AI suggest for description and expected output', () => {
    render(<TaskForm {...(mockProps as any)} />);
    
    const sparkles = screen.getAllByTestId('icon-sparkles');
    fireEvent.click(sparkles[0]); // Description sparkle
    expect(mockProps.onAiSuggest).toHaveBeenCalledWith('description');
    
    fireEvent.click(sparkles[1]); // Expected output sparkle
    expect(mockProps.onAiSuggest).toHaveBeenCalledWith('expected_output');
  });

  it('renders and adds context tasks when selector is open', () => {
    mockProps.isContextSelectorOpen = true;
    render(<TaskForm {...(mockProps as any)} />);
    
    expect(screen.getByText(/Select Tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/Previous Task/i)).toBeInTheDocument();
    
    fireEvent.click(screen.getByText(/Previous Task/i));
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-task-1', { context: ['task-other'] });
  });

  it('removes task from context', () => {
    const propsWithContext = {
      ...mockProps,
      data: { ...mockProps.data, context: ['task-other'] }
    };
    render(<TaskForm {...(propsWithContext as any)} />);
    
    expect(screen.getByText(/Previous Task/i)).toBeInTheDocument();
    const removeBtn = screen.getByTestId('icon-x');
    fireEvent.click(removeBtn);
    
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-task-1', { context: [] });
  });

  it('shows empty states when no agents or tasks are available', () => {
    const emptyProps = {
      ...mockProps,
      nodes: [], // No agents or tasks
      isContextSelectorOpen: true
    };
    render(<TaskForm {...(emptyProps as any)} />);
    
    // Open agent selector
    fireEvent.click(screen.getByText('Select an agent...'));
    expect(screen.getByText('No agents found in workflow.')).toBeInTheDocument();
    
    // Context selector is already open via prop
    expect(screen.getByText('No more tasks available.')).toBeInTheDocument();
  });
});
