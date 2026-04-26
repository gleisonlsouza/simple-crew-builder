import { render, screen, fireEvent } from '@testing-library/react';
import { TaskForm } from '../TaskForm';
import { vi, describe, it, expect } from 'vitest';
import type { TaskNodeData, AppNode } from '../../../types/nodes.types';
import React from 'react';

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
  default: ({ value, onChange, placeholder }: { value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement> | { target: { value: string } }) => void, placeholder?: string }) => (
    <textarea data-testid="highlighted-textarea" value={value} onChange={(e) => onChange(e as React.ChangeEvent<HTMLTextAreaElement>)} placeholder={placeholder} />
  )
}));

describe('TaskForm', () => {
  interface TaskFormTestProps {
    data: TaskNodeData;
    nodeId: string;
    updateNodeData: (id: string, data: Partial<TaskNodeData>) => void;
    nodes: AppNode[];
    loadingFields: Record<string, boolean>;
    onAiSuggest: (field: string) => void;
    onFieldKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }, field: string, updateFn: (val: string) => void) => void;
    isContextSelectorOpen: boolean;
    setIsContextSelectorOpen: (open: boolean) => void;
  }

  const mockProps: TaskFormTestProps = {
    data: {
      name: 'Test Task',
      description: 'Test Task Description',
      expected_output: 'Test Expected Output',
      agentId: 'agent-1',
      context: [],
      async_execution: false,
      human_input: false,
      output_file: 'result.md',
      create_directory: true
    } as unknown as TaskNodeData,
    nodeId: 'node-task-1',
    updateNodeData: vi.fn(),
    nodes: [
      { id: 'agent-1', type: 'agent', data: { name: 'Agent 1' } },
      { id: 'agent-2', type: 'agent', data: { name: 'Agent 2' } },
      { id: 'task-other', type: 'task', data: { name: 'Previous Task' } }
    ] as unknown as AppNode[],
    loadingFields: {},
    onAiSuggest: vi.fn(),
    onFieldKeyDown: vi.fn(),
    onFieldChange: vi.fn((e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement> | { target: { value: string } }, _field: string, updateFn: (val: string) => void) => updateFn(e.target.value)),
    isContextSelectorOpen: false,
    setIsContextSelectorOpen: vi.fn(),
  } as unknown as TaskFormTestProps;

  it('renders initial values correctly', () => {
    render(<TaskForm {...mockProps} />);
    
    expect(screen.getByText('Agent 1')).toBeInTheDocument();
    const textareas = screen.getAllByTestId('highlighted-textarea');
    expect(textareas[0]).toHaveValue('Test Task Description');
    expect(textareas[1]).toHaveValue('Test Expected Output');
  });

  it('triggers update on field change', () => {
    render(<TaskForm {...mockProps} />);
    
    const descTextarea = screen.getAllByTestId('highlighted-textarea')[0];
    fireEvent.change(descTextarea, { target: { value: 'New Description' } });
    
    expect(mockProps.onFieldChange).toBeCalled();
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-task-1', { description: 'New Description' });
  });

  it('opens agent selector and selects new agent', () => {
    render(<TaskForm {...mockProps} />);
    
    const agentButton = screen.getByText('Agent 1');
    fireEvent.click(agentButton);
    
    expect(screen.getByText('Available Agents')).toBeInTheDocument();
    const agent2Option = screen.getByText('Agent 2');
    fireEvent.click(agent2Option);
    
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-task-1', { agentId: 'agent-2' });
  });

  it('triggers context selector toggle', () => {
    render(<TaskForm {...mockProps} />);
    
    const addContextBtn = screen.getByText('Add Context');
    fireEvent.click(addContextBtn);
    
    expect(mockProps.setIsContextSelectorOpen).toHaveBeenCalled();
  });

  it('toggles execution settings', () => {
    render(<TaskForm {...mockProps} />);
    
    const asyncCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(asyncCheckbox);
    
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-task-1', { async_execution: true });
  });

  it('triggers AI suggest for description and expected output', () => {
    render(<TaskForm {...mockProps} />);
    
    const sparkles = screen.getAllByTestId('icon-sparkles');
    fireEvent.click(sparkles[0]); // Description sparkle
    expect(mockProps.onAiSuggest).toHaveBeenCalledWith('description');
    
    fireEvent.click(sparkles[1]); // Expected output sparkle
    expect(mockProps.onAiSuggest).toHaveBeenCalledWith('expected_output');
  });

  it('renders and adds context tasks when selector is open', () => {
    mockProps.isContextSelectorOpen = true;
    render(<TaskForm {...mockProps} />);
    
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
    render(<TaskForm {...propsWithContext} />);
    
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
    render(<TaskForm {...emptyProps} />);
    
    // Open agent selector
    fireEvent.click(screen.getByText('Select an agent...'));
    expect(screen.getByText('No agents found in workflow.')).toBeInTheDocument();
    
    // Context selector is already open via prop
    expect(screen.getByText('No more tasks available.')).toBeInTheDocument();
  });

  it('closes Agent selector on overlay click', () => {
    const { container } = render(<TaskForm {...mockProps} />);
    fireEvent.click(screen.getByText('Agent 1'));
    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay!);
    expect(screen.queryByText('Available Agents')).not.toBeInTheDocument();
  });

  it('closes Context selector on overlay click', () => {
    const propsOpen = { ...mockProps, isContextSelectorOpen: true };
    const { container } = render(<TaskForm {...propsOpen} />);
    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay!);
    expect(propsOpen.setIsContextSelectorOpen).toHaveBeenCalledWith(false);
  });

  it('updates output file path', () => {
    render(<TaskForm {...mockProps} />);
    const input = screen.getByPlaceholderText('e.g. results/summary.md');
    fireEvent.change(input, { target: { value: 'new_file.txt' } });
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-task-1', { output_file: 'new_file.txt' });
  });

  it('toggles output settings checkboxes', () => {
    render(<TaskForm {...mockProps} />);
    const checkboxes = screen.getAllByRole('checkbox');
    // Index 0: async, 1: human, 2: create_directory, 3: output_json, 4: output_pydantic
    fireEvent.click(checkboxes[2]); // create_directory is true initially
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-task-1', { create_directory: false });
    
    fireEvent.click(checkboxes[3]); // output_json is false initially
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-task-1', { output_json: true });
    
    fireEvent.click(checkboxes[4]); // output_pydantic is false
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-task-1', { output_pydantic: true });
  });
});
