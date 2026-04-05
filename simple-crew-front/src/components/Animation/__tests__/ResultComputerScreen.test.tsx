import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultComputerScreen } from '../ResultComputerScreen';

// Mock motion components to render normally in JSDOM
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, onClick, style }: any) => (
      <div 
        className={className} 
        onClick={onClick} 
        style={style}
      >
        {children}
      </div>
    ),
    span: ({ children, className }: any) => (
      <span className={className}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('ResultComputerScreen', () => {
  const mockOnClose = vi.fn();
  const mockResult = 'SUCCESS: Mission accomplished';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<ResultComputerScreen isOpen={false} onClose={mockOnClose} result={mockResult} />);
    expect(screen.queryByText(/Mission_Output_Viewer.exe/i)).not.toBeInTheDocument();
  });

  it('renders correctly when isOpen is true', () => {
    render(<ResultComputerScreen isOpen={true} onClose={mockOnClose} result={mockResult} />);
    expect(screen.getByText(/Mission_Output_Viewer.exe/i)).toBeInTheDocument();
    expect(screen.getByText(mockResult)).toBeInTheDocument();
    expect(screen.getByText(/CREWAI OPERATING SYSTEM/i)).toBeInTheDocument();
  });

  it('displays default message when result is empty', () => {
    render(<ResultComputerScreen isOpen={true} onClose={mockOnClose} result="" />);
    expect(screen.getByText(/NO DATA RECEIVED/i)).toBeInTheDocument();
  });

  it('calls onClose when clicking the close button', () => {
    render(<ResultComputerScreen isOpen={true} onClose={mockOnClose} result={mockResult} />);
    // There are multiple X/Close elements, find the one with onClick to mockOnClose
    const closeBtn = screen.getByTestId('icon-x').parentElement;
    fireEvent.click(closeBtn!);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking the backdrop', () => {
    const { container } = render(<ResultComputerScreen isOpen={true} onClose={mockOnClose} result={mockResult} />);
    // The backdrop is the first child of the motion motion.div that has onClick={onClose}
    const backdrop = container.querySelector('.absolute.inset-0');
    fireEvent.click(backdrop!);
    expect(mockOnClose).toHaveBeenCalled();
  });
});

// Mock lucide icons
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x" />,
  Terminal: () => <span data-testid="icon-terminal" />,
  Monitor: () => <span data-testid="icon-monitor" />,
  Download: () => <span data-testid="icon-download" />,
  Copy: () => <span data-testid="icon-copy" />,
}));
