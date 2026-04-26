import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatInput } from '../ChatInput';
import { useStore } from '../../store/index';
import type { AppState } from '../../types/store.types';
import type { Mock } from 'vitest';

// Mock the store
vi.mock('../../store/index', () => ({
  useStore: vi.fn(),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Send: () => <div data-testid="send-icon" />,
  Square: () => <div data-testid="square-icon" />,
}));

describe('ChatInput Component', () => {
  const mockOnSendMessage = vi.fn();
  const mockStopExecution = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as Mock).mockImplementation((selector: (state: Partial<AppState>) => unknown) => {
      const state = {
        stopExecution: mockStopExecution,
      };
      return selector(state);
    });
  });

  it('renders correctly with initial state', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    expect(screen.getByPlaceholderText(/Type your message.../i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.queryByTitle(/Stop Execution/i)).not.toBeInTheDocument();
  });

  it('calls onSendMessage and clears input when Enter is pressed', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    const textarea = screen.getByPlaceholderText(/Type your message.../i);
    fireEvent.change(textarea, { target: { value: 'Hello Crew!' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Hello Crew!');
    expect(textarea).toHaveValue('');
  });

  it('disables input and shows Stop button when isLoading is true', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} isLoading={true} />);
    
    const textarea = screen.getByPlaceholderText(/Type your message.../i);
    expect(textarea).toBeDisabled();
    
    const stopButton = screen.getByTitle(/Stop Execution/i);
    expect(stopButton).toBeInTheDocument();
  });

  it('calls stopExecution when Stop button is clicked', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} isLoading={true} />);
    
    const stopButton = screen.getByTitle(/Stop Execution/i);
    fireEvent.click(stopButton);
    
    expect(mockStopExecution).toHaveBeenCalledTimes(1);
  });

  it('does not send message if text is empty', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    const sendButton = screen.getByRole('button');
    fireEvent.click(sendButton);
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('auto-focuses input when isLoading changes to false', () => {
    vi.useFakeTimers();
    const { rerender } = render(<ChatInput onSendMessage={mockOnSendMessage} isLoading={true} />);
    
    // Change to false
    rerender(<ChatInput onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    const textarea = screen.getByPlaceholderText(/Type your message.../i);
    
    // Fast-forward timers
    vi.runAllTimers();
    
    expect(textarea).toHaveFocus();
    vi.useRealTimers();
  });

  it('enables overflow-y when content exceeds maxHeight', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} isLoading={false} />);
    const textarea = screen.getByPlaceholderText(/Type your message.../i) as HTMLTextAreaElement;
    
    // Mock scrollHeight
    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 200 });
    
    fireEvent.change(textarea, { target: { value: 'Very long text...' } });
    
    expect(textarea.style.overflowY).toBe('auto');
  });
});
