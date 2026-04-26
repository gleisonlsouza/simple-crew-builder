import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ResizableChatPanel } from '../ResizableChatPanel';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import type { Mock } from 'vitest';

// Mock the store
vi.mock('../../store/index', () => ({
  useStore: vi.fn(),
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock ChatInput
vi.mock('../ChatInput', () => ({
  ChatInput: ({ onSendMessage, isLoading }: any) => (
    <div data-testid="mock-chat-input">
      <button onClick={() => onSendMessage('Test message')} disabled={isLoading}>
        Send
      </button>
    </div>
  ),
}));

// Mock ChatMessage
vi.mock('../ChatMessage', () => ({
  ChatMessage: ({ msg }: any) => <div data-testid={`message-${msg.id}`}>{msg.content}</div>
}));

// Mock ConfirmationModal
vi.mock('../ConfirmationModal', () => ({
  ConfirmationModal: ({ isOpen, onConfirm, onClose }: any) => isOpen ? (
    <div data-testid="mock-confirm-modal">
      <button onClick={onConfirm}>Confirm Clear</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ) : null,
}));

describe('ResizableChatPanel', () => {
  const mockSetIsChatVisible = vi.fn();
  const mockClearChat = vi.fn();
  const mockSetMessages = vi.fn();

  const defaultState = {
    isChatVisible: true,
    setIsChatVisible: mockSetIsChatVisible,
    messages: [
      { id: '1', role: 'assistant', content: 'Hello!' },
      { id: '2', role: 'user', content: 'Hi there' },
    ],
    setMessages: mockSetMessages,
    clearChat: mockClearChat,
    nodes: [],
    edges: [],
    startRealExecution: vi.fn(),
    updateNodeData: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isChatVisible is false', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector({
      ...defaultState,
      isChatVisible: false,
    }));

    const { container } = render(<ResizableChatPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders messages correctly', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector(defaultState));

    render(<ResizableChatPanel />);
    
    expect(screen.getByText('Interactive Chat')).toBeInTheDocument();
    expect(screen.getByTestId('message-1')).toHaveTextContent('Hello!');
    expect(screen.getByTestId('message-2')).toHaveTextContent('Hi there');
    expect(screen.getByTestId('mock-chat-input')).toBeInTheDocument();
  });

  it('toggles minimized state', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector(defaultState));

    render(<ResizableChatPanel />);
    
    // The minimize button is the second to last button in the header (before the close X)
    // Looking at the code order: Trash2, then minimize/expand, then X.
    const minimizeBtn = screen.getByTitle('Clear conversation').nextSibling as HTMLButtonElement;
    
    // Initial: Not minimized (message 1 is visible)
    expect(screen.getByTestId('message-1')).toBeInTheDocument();
    
    // Minimize
    fireEvent.click(minimizeBtn);
    expect(screen.queryByTestId('message-1')).not.toBeInTheDocument();
    
    // Expand
    fireEvent.click(minimizeBtn);
    expect(screen.getByTestId('message-1')).toBeInTheDocument();
  });

  it('handles clearing the chat with confirmation', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector(defaultState));

    render(<ResizableChatPanel />);
    
    const clearBtn = screen.getByTitle('Clear conversation');
    fireEvent.click(clearBtn);
    
    expect(screen.getByTestId('mock-confirm-modal')).toBeInTheDocument();
    
    const confirmBtn = screen.getByText('Confirm Clear');
    fireEvent.click(confirmBtn);
    
    expect(mockClearChat).toHaveBeenCalled();
  });

  it('closes the panel when X is clicked', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector(defaultState));

    render(<ResizableChatPanel />);
    
    // The close button is the last in the header
    const closeBtn = screen.getByTitle('Clear conversation').nextSibling?.nextSibling as HTMLButtonElement;
    fireEvent.click(closeBtn);
    
    expect(mockSetIsChatVisible).toHaveBeenCalledWith(false);
  });

  it('handles resizing functionality and auto-expands if minimized', async () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector(defaultState));

    const { container } = render(<ResizableChatPanel />);
    const resizer = container.querySelector('.cursor-ns-resize') as HTMLElement;
    
    // Minimize first
    const minimizeBtn = screen.getByTitle('Clear conversation').nextSibling as HTMLButtonElement;
    fireEvent.click(minimizeBtn);
    expect(screen.queryByTestId('message-1')).not.toBeInTheDocument();

    const originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true, writable: true });

    // Mouse down to start resizing
    fireEvent.mouseDown(resizer);
    
    // Mouse move - dragging up significantly
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientY: 600, bubbles: true }));
    });
    
    // Should have expanded
    expect(screen.getByTestId('message-1')).toBeInTheDocument();
    const panel = container.firstChild as HTMLElement;
    expect(panel.style.height).toBe('400px');

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'));
    });
    
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight });
  });

  it('auto-scrolls to bottom when messages update', async () => {
    const scrollMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollMock;

    const { rerender } = render(<ResizableChatPanel />);
    
    // Initial render call
    expect(scrollMock).toHaveBeenCalled();
    scrollMock.mockClear();

    // Rerender with more messages
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector({
      ...defaultState,
      messages: [...defaultState.messages, { id: '3', role: 'user', content: 'Next' }]
    }));
    
    rerender(<ResizableChatPanel />);
    expect(scrollMock).toHaveBeenCalled();
  });

  it('shows typing indicator when loading', async () => {
    // We need to trigger handleSendMessage to set isLoading to true
    // However, isLoading is local state. We can mock handleSendMessage or just test the prop if it existed.
    // Wait, isLoading is local state in ResizableChatPanel. 
    // I can trigger handleSendMessage which sets it to true before the async call.
    
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector({
      ...defaultState,
      nodes: [
        { id: 'chat-1', type: 'chat', data: { inputMapping: 'var' } },
        { id: 'crew-1', type: 'crew', data: { inputs: {} } }
      ],
      edges: [{ source: 'chat-1', target: 'crew-1' }],
      startRealExecution: () => new Promise(() => {}) // Never resolves to keep loading true
    }));

    render(<ResizableChatPanel />);
    const sendBtn = screen.getByText('Send');
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByTestId('chat-typing-indicator')).toBeInTheDocument();
    });
  });

  describe('handleSendMessage logic', () => {
    it('shows error if no Chat node is found', async () => {
      (useStore as unknown as Mock).mockImplementation((selector: any) => selector({
        ...defaultState,
        nodes: [], // No chat node
      }));

      render(<ResizableChatPanel />);
      const sendBtn = screen.getByText('Send');
      await act(async () => {
        fireEvent.click(sendBtn);
      });

      expect(mockSetMessages).toHaveBeenCalledWith(expect.any(Function));
      // Verify behavior by checking the state update if possible, 
      // but since we mock setMessages, we just check call.
    });

    it('shows error if input mapping is missing', async () => {
      (useStore as unknown as Mock).mockImplementation((selector: any) => selector({
        ...defaultState,
        nodes: [{ id: 'chat-1', type: 'chat', data: {} }], // Missing inputMapping
      }));

      render(<ResizableChatPanel />);
      const sendBtn = screen.getByText('Send');
      await act(async () => {
        fireEvent.click(sendBtn);
      });

      expect(mockSetMessages).toHaveBeenCalled();
    });

    it('shows error if node is disconnected', async () => {
        (useStore as unknown as Mock).mockImplementation((selector: any) => selector({
          ...defaultState,
          nodes: [{ id: 'chat-1', type: 'chat', data: { inputMapping: 'input' } }],
          edges: [], // No edge to crew
        }));
  
        render(<ResizableChatPanel />);
        const sendBtn = screen.getByText('Send');
        await act(async () => {
          fireEvent.click(sendBtn);
        });
  
        expect(mockSetMessages).toHaveBeenCalled();
      });

    it('successfully sends message and runs execution', async () => {
        const mockStartRealExecution = vi.fn().mockResolvedValue('Execution result');
        const mockUpdateNodeData = vi.fn();
        
        (useStore as unknown as Mock).mockImplementation((selector: any) => selector({
          ...defaultState,
          nodes: [
            { id: 'chat-1', type: 'chat', data: { inputMapping: 'input', includeHistory: true, systemMessage: 'System' } },
            { id: 'crew-1', type: 'crew', data: { inputs: {} } }
          ],
          edges: [{ source: 'chat-1', target: 'crew-1' }],
          startRealExecution: mockStartRealExecution,
          updateNodeData: mockUpdateNodeData,
        }));
  
        render(<ResizableChatPanel />);
        const sendBtn = screen.getByText('Send');
        
        await act(async () => {
          fireEvent.click(sendBtn);
        });
  
        expect(mockUpdateNodeData).toHaveBeenCalledWith('crew-1', expect.objectContaining({
            inputs: expect.objectContaining({
                input: expect.arrayContaining([
                    { role: 'system', content: 'System' },
                    { role: 'user', content: 'Test message' }
                ])
            })
        }));
        expect(mockStartRealExecution).toHaveBeenCalled();
        expect(mockSetMessages).toHaveBeenCalled();
      });

      it('handles execution errors gracefully', async () => {
        const mockStartRealExecution = vi.fn().mockRejectedValue(new Error('Fatal error'));
        
        (useStore as unknown as Mock).mockImplementation((selector: any) => selector({
          ...defaultState,
          nodes: [
            { id: 'chat-1', type: 'chat', data: { inputMapping: 'input' } },
            { id: 'crew-1', type: 'crew', data: {} }
          ],
          edges: [{ source: 'chat-1', target: 'crew-1' }],
          startRealExecution: mockStartRealExecution,
        }));
  
        render(<ResizableChatPanel />);
        const sendBtn = screen.getByText('Send');
        
        await act(async () => {
          fireEvent.click(sendBtn);
        });
  
        expect(mockStartRealExecution).toHaveBeenCalled();
        // Check if error message was added
        expect(mockSetMessages).toHaveBeenCalled();
      });
  });
});
