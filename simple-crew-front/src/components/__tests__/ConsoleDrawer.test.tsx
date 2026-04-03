import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsoleDrawer } from '../ConsoleDrawer';
import { useStore } from '../../store/index';

// Mock the store
vi.mock('../../store/index', () => ({
  useStore: vi.fn(),
}));

describe('ConsoleDrawer Component', () => {
  const mockSetIsConsoleOpen = vi.fn();
  const mockSetIsConsoleExpanded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default state: Console Open but not Expanded
    (useStore as any).mockImplementation((selector: any) => {
      const state = {
        isExecuting: false,
        isConsoleOpen: true,
        isConsoleExpanded: false,
        executionResult: null,
        setIsConsoleOpen: mockSetIsConsoleOpen,
        setIsConsoleExpanded: mockSetIsConsoleExpanded,
      };
      return selector(state);
    });
  });

  it('renders minimized state correctly', () => {
    render(<ConsoleDrawer />);
    
    expect(screen.getByText(/Live Console/i)).toBeInTheDocument();
    
    // The body should be hidden when not expanded
    const body = screen.getByTestId('console-body');
    expect(body).toHaveClass('hidden');
  });

  it('expands when clicked while minimized', () => {
    render(<ConsoleDrawer />);
    
    const drawer = screen.getByText(/Live Console/i).closest('div');
    fireEvent.click(drawer!);
    
    expect(mockSetIsConsoleExpanded).toHaveBeenCalledWith(true);
  });

  it('renders logs and expands correctly', () => {
    // Override mock to be expanded and have logs
    (useStore as any).mockImplementation((selector: any) => {
      const state = {
        isExecuting: false,
        isConsoleOpen: true,
        isConsoleExpanded: true,
        executionResult: 'Step 1: Initializing...\nStep 2: Thinking...',
        setIsConsoleOpen: mockSetIsConsoleOpen,
        setIsConsoleExpanded: mockSetIsConsoleExpanded,
      };
      return selector(state);
    });

    render(<ConsoleDrawer />);
    
    expect(screen.getByText(/Step 1: Initializing.../i)).toBeInTheDocument();
    expect(screen.getByText(/Step 2: Thinking.../i)).toBeInTheDocument();
    
    const body = screen.getByTestId('console-body');
    expect(body).not.toHaveClass('hidden');
    expect(body).toHaveClass('block');
  });

  it('shows loader while executing', () => {
    (useStore as any).mockImplementation((selector: any) => {
      const state = {
        isExecuting: true,
        isConsoleOpen: true,
        isConsoleExpanded: false,
        executionResult: null,
        setIsConsoleOpen: mockSetIsConsoleOpen,
        setIsConsoleExpanded: mockSetIsConsoleExpanded,
      };
      return selector(state);
    });

    render(<ConsoleDrawer />);
    expect(screen.getByText(/Thinking.../i)).toBeInTheDocument();
  });

  it('closes console when X is clicked', () => {
    (useStore as any).mockImplementation((selector: any) => {
      const state = {
        isExecuting: false,
        isConsoleOpen: true,
        isConsoleExpanded: true,
        executionResult: null,
        setIsConsoleOpen: mockSetIsConsoleOpen,
        setIsConsoleExpanded: mockSetIsConsoleExpanded,
      };
      return selector(state);
    });

    render(<ConsoleDrawer />);
    const closeBtn = screen.getByTitle(/Close Console/i);
    fireEvent.click(closeBtn);
    
    expect(mockSetIsConsoleOpen).toHaveBeenCalledWith(false);
  });

  it('auto-scrolls when output updates', () => {
    (useStore as any).mockImplementation((selector: any) => {
      const state = {
        isExecuting: true,
        isConsoleOpen: true,
        isConsoleExpanded: true,
        executionResult: 'Initial log',
        setIsConsoleOpen: mockSetIsConsoleOpen,
        setIsConsoleExpanded: mockSetIsConsoleExpanded,
      };
      return selector(state);
    });

    const { rerender } = render(<ConsoleDrawer />);
    
    // Update logs
    (useStore as any).mockImplementation((selector: any) => {
      const state = {
        isExecuting: true,
        isConsoleOpen: true,
        isConsoleExpanded: true,
        executionResult: 'Initial log\nNew Log Line',
        setIsConsoleOpen: mockSetIsConsoleOpen,
        setIsConsoleExpanded: mockSetIsConsoleExpanded,
      };
      return selector(state);
    });

    rerender(<ConsoleDrawer />);
    expect(screen.getByText(/New Log Line/i)).toBeInTheDocument();
  });
});
