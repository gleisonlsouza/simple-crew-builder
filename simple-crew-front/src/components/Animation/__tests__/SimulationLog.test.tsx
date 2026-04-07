import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimulationLog } from '../SimulationLog';
import type { LogEntry } from '../types';

// Mock motion components
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, animate }: any) => (
      <div className={className} data-animate={JSON.stringify(animate)}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock icons
vi.mock('lucide-react', () => ({
  Terminal: ({ size }: any) => <span data-testid="icon-terminal" style={{ width: size, height: size }} />,
}));

describe('SimulationLog', () => {
  const mockLogs: LogEntry[] = [
    { id: '1', timestamp: '12:00:00', message: 'Mission started', type: 'info' },
    { id: '2', timestamp: '12:00:05', message: 'Agent Alpha ready', type: 'success', agentName: 'ALPHA' },
    { id: '3', timestamp: '12:00:10', message: 'Warning: Low battery', type: 'warning' },
    { id: '4', timestamp: '12:00:15', message: 'Thinking...', type: 'ai', agentName: 'BRAIN' },
  ];
  const mockOnToggle = vi.fn();

  it('renders correctly when expanded', () => {
    render(<SimulationLog logs={mockLogs} isCollapsed={false} onToggle={mockOnToggle} />);
    expect(screen.getByText(/Terminal output/i)).toBeInTheDocument();
    expect(screen.getByText('Mission started')).toBeInTheDocument();
    expect(screen.getByText('ALPHA')).toBeInTheDocument();
    expect(screen.getByText('Agent Alpha ready')).toBeInTheDocument();
    expect(screen.getByText('Warning: Low battery')).toBeInTheDocument();
    expect(screen.getByText('BRAIN')).toBeInTheDocument();
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
  });

  it('renders only icon when collapsed', () => {
    render(<SimulationLog logs={mockLogs} isCollapsed={true} onToggle={mockOnToggle} />);
    expect(screen.queryByText(/Terminal output/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Mission started')).not.toBeInTheDocument();
    expect(screen.getByTestId('btn-log-expand')).toBeInTheDocument();
  });

  it('calls onToggle when clicking the collapse button', () => {
    render(<SimulationLog logs={mockLogs} isCollapsed={false} onToggle={mockOnToggle} />);
    const btnCollapse = screen.getByTestId('btn-log-collapse');
    fireEvent.click(btnCollapse);
    expect(mockOnToggle).toHaveBeenCalled();
  });

  it('calls onToggle when clicking the expand button', () => {
    render(<SimulationLog logs={mockLogs} isCollapsed={true} onToggle={mockOnToggle} />);
    const btnExpand = screen.getByTestId('btn-log-expand');
    fireEvent.click(btnExpand);
    expect(mockOnToggle).toHaveBeenCalled();
  });

  it('displays empty state message when logs array is empty', () => {
    render(<SimulationLog logs={[]} isCollapsed={false} onToggle={mockOnToggle} />);
    expect(screen.getByText(/Aguardando início.../i)).toBeInTheDocument();
  });

  it('applies correct styling based on log type', () => {
    render(<SimulationLog logs={mockLogs} isCollapsed={false} onToggle={mockOnToggle} />);
    // Check for specific class names based on types
    const successLog = screen.getByText('Agent Alpha ready');
    expect(successLog.className).toContain('text-emerald-400');
    
    const warningLog = screen.getByText('Warning: Low battery');
    expect(warningLog.className).toContain('text-amber-400');
    
    const aiLog = screen.getByText('Thinking...');
    expect(aiLog.className).toContain('text-indigo-400');
  });
});
