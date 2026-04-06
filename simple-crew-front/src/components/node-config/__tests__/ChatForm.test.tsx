import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatForm } from '../ChatForm';
import type { ChatNodeData } from '../../../types/nodes.types';

// Mock icons
vi.mock('lucide-react', () => ({
  MessageCircle: () => <span data-testid="icon-chat" />,
}));

// Mock HighlightedTextField - Usando o caminho absoluto do projeto para evitar erro de resolução
vi.mock('../../HighlightedTextField', () => ({
  __esModule: true,
  default: (props: any) => (
    <textarea 
      data-testid="mock-text-field"
      value={props.value}
      onChange={(e) => props.onChange({ target: { value: e.target.value } })}
      placeholder={props.placeholder}
    />
  )
}));

describe('ChatForm', () => {
  const mockUpdateNodeData = vi.fn();
  const mockOnFieldChange = vi.fn((e: any, _field: string, updateFn: (val: string) => void) => {
    updateFn(e.target.value);
  });
  const mockOnFieldKeyDown = vi.fn();
  const mockSetIsChatMappingSelectorOpen = vi.fn();

  const mockData: ChatNodeData = {
    name: 'Chat',
    description: 'Test Chat',
    inputMapping: 'initial_input',
    includeHistory: false,
    systemMessage: 'Be helpful.',
  };

  const defaultProps = {
    data: mockData,
    nodeId: 'node-1',
    updateNodeData: mockUpdateNodeData,
    isChatConnected: true,
    connectedCrewInputs: ['input1', 'input2'],
    isChatMappingSelectorOpen: false,
    setIsChatMappingSelectorOpen: mockSetIsChatMappingSelectorOpen,
    onFieldKeyDown: mockOnFieldKeyDown,
    onFieldChange: mockOnFieldChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial fields correctly', () => {
    render(<ChatForm {...defaultProps} />);
    expect(screen.getByText(/DESCRIPTION/i)).toBeInTheDocument();
  });

  it('handles field changes for description and system message', () => {
    render(<ChatForm {...defaultProps} />);
    
    // Procura por todos os textareas mockados
    const textFields = screen.getAllByTestId('mock-text-field');
    expect(textFields.length).toBeGreaterThanOrEqual(2);
    
    // Description field
    fireEvent.change(textFields[0], { target: { value: 'New Description' } });
    expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', expect.objectContaining({ description: 'New Description' }));
    
    // System Message field
    fireEvent.change(textFields[1], { target: { value: 'New System Message' } });
    expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', expect.objectContaining({ systemMessage: 'New System Message' }));
  });

  it('toggles "Include History" correctly', () => {
    render(<ChatForm {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', expect.objectContaining({ includeHistory: true }));
  });

  it('opens mapping selector when button is clicked', () => {
    render(<ChatForm {...defaultProps} />);
    const mappingBtn = screen.getByText('initial_input').parentElement!;
    fireEvent.click(mappingBtn);
    expect(mockSetIsChatMappingSelectorOpen).toHaveBeenCalledWith(true);
  });

  it('displays "Connect to a Crew Node first" when isChatConnected is false', () => {
    render(<ChatForm {...defaultProps} isChatConnected={false} />);
    expect(screen.getByText(/Connect to a Crew Node first/i)).toBeInTheDocument();
  });

  it('renders input variables in the selector and handles selection', () => {
    render(<ChatForm {...defaultProps} isChatMappingSelectorOpen={true} />);
    expect(screen.getByText('input1')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('input2'));
    expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', expect.objectContaining({ inputMapping: 'input2' }));
    expect(mockSetIsChatMappingSelectorOpen).toHaveBeenCalledWith(false);
  });
});
