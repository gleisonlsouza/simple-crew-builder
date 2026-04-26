import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Station } from '../Station';
import type { Station as StationType } from '../types';

// Mock motion components
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, animate }: any) => (
      <div className={className} data-animate={JSON.stringify(animate)}>{children}</div>
    ),
  },
}));

// Mock icons
vi.mock('lucide-react', () => ({
  CheckCircle2: () => <span data-testid="icon-check" />,
}));

describe('Station', () => {
  const mockStation: StationType = { 
    id: 's1', 
    name: 'Research Lab', 
    x: 50, 
    y: 50, 
    icon: <span data-testid="mock-icon" />, 
    status: 'pending' 
  };

  it('renders station name and base icon', () => {
    render(<Station station={mockStation} />);
    expect(screen.getByText('Research Lab')).toBeInTheDocument();
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('icon-check')).not.toBeInTheDocument();
  });

  it('renders done status with check icon', () => {
    render(<Station station={{ ...mockStation, status: 'done' }} />);
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-icon')).not.toBeInTheDocument();
    expect(screen.getByText('Research Lab')).toHaveClass('text-emerald-500');
  });

  it('renders active status with animation data', () => {
    const { container } = render(<Station station={{ ...mockStation, status: 'active' }} />);
    const motionDiv = container.querySelector('[data-animate]');
    const animateData = JSON.parse(motionDiv?.getAttribute('data-animate') || '{}');
    expect(animateData.scale).toEqual([1, 1.1, 1]);
    expect(screen.getByText('Research Lab')).toHaveClass('text-indigo-400');
  });

  it('renders resting status with amber styling', () => {
    render(<Station station={{ ...mockStation, status: 'rest' }} />);
    expect(screen.getByText('Research Lab')).toHaveClass('text-amber-600');
  });

  it('applies correct position styles', () => {
    const { container } = render(<Station station={mockStation} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.left).toBe('50%');
    expect(wrapper.style.top).toBe('50%');
  });
});
