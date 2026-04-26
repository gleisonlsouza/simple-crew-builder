import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RobotIcon } from '../RobotIcon';

// Mock motion components
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, animate, style }: any) => (
      <div 
        className={className} 
        style={style}
        data-animate={JSON.stringify(animate)}
      >
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock WorkingParticles
vi.mock('../WorkingParticles', () => ({
  WorkingParticles: ({ color }: any) => <div data-testid="working-particles" style={{ backgroundColor: color }} />
}));

// Mock icons
vi.mock('lucide-react', () => ({
  Bot: ({ style }: any) => <span data-testid="icon-bot" style={style} />,
  Zap: () => <span data-testid="icon-zap" />,
  CheckCircle2: () => <span data-testid="icon-check" />,
}));

describe('RobotIcon', () => {
  const mockColor = '#ff0000';
  const mockOnClick = vi.fn();

  it('renders correctly in idle state', () => {
    render(<RobotIcon color={mockColor} state="idle" thought={null} />);
    const botIcon = screen.getByTestId('icon-bot');
    expect(botIcon).toBeInTheDocument();
    expect(botIcon).toHaveStyle({ color: mockColor });
    expect(screen.queryByTestId('working-particles')).not.toBeInTheDocument();
  });

  it('renders working state with particles and zap icon', () => {
    render(<RobotIcon color={mockColor} state="working" thought={null} />);
    expect(screen.getByTestId('working-particles')).toBeInTheDocument();
    expect(screen.getByTestId('icon-zap')).toBeInTheDocument();
  });

  it('renders completed state with check icon', () => {
    render(<RobotIcon color={mockColor} state="completed" thought={null} />);
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
  });

  it('renders thought bubble when provided', () => {
    const thought = 'Thinking...';
    render(<RobotIcon color={mockColor} state="idle" thought={thought} />);
    expect(screen.getByText(thought)).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    render(<RobotIcon color={mockColor} state="idle" thought={null} onClick={mockOnClick} />);
    fireEvent.click(screen.getByTestId('icon-bot').parentElement!.parentElement!);
    expect(mockOnClick).toHaveBeenCalled();
  });

  it('applies selected styles when isSelected is true', () => {
    const { container } = render(<RobotIcon color={mockColor} state="idle" thought={null} isSelected={true} />);
    // The main wrapper div is the parent of the motion.div
    const motionDiv = container.querySelector('.ring-2.ring-white\\/50');
    expect(motionDiv).toBeInTheDocument();
  });
});
