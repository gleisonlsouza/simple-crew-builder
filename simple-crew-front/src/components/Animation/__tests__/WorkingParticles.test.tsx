import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { WorkingParticles } from '../WorkingParticles';

// Mock motion components
vi.mock('motion/react', () => ({
  motion: {
    div: ({ className, style, animate }: any) => (
      <div 
        className={className} 
        style={style} 
        data-animate={JSON.stringify(animate)}
        data-testid="particle"
      />
    ),
  },
}));

describe('WorkingParticles', () => {
  const mockColor = '#ff0000';

  it('renders all 6 particles with the correct color', () => {
    render(<WorkingParticles color={mockColor} />);
    const particles = screen.getAllByTestId('particle');
    expect(particles).toHaveLength(6);
    
    // Check if at least one particle has the correct background color and shadow
    const firstParticle = particles[0];
    expect(firstParticle.style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect(firstParticle.style.boxShadow).toContain(mockColor);
  });

  it('sets up random initial positions and transitions', () => {
    const { container } = render(<WorkingParticles color={mockColor} />);
    const particles = container.querySelectorAll('[data-animate]');
    
    particles.forEach(particle => {
      const animate = JSON.parse(particle.getAttribute('data-animate') || '{}');
      // Values for x, y should be present in the animate prop based on random values
      expect(animate.x).toBeDefined();
      expect(animate.y).toBeDefined();
      expect(animate.opacity).toEqual([0, 1, 0]);
      expect(animate.scale).toEqual([0, 1, 0]);
    });
  });
});

import { screen } from '@testing-library/react';
