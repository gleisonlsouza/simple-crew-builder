import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZoomControls } from '../ZoomControls';

// Mock icons
vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus" />,
  Minus: () => <span data-testid="icon-minus" />,
  RefreshCw: () => <span data-testid="icon-reset" />,
}));

describe('ZoomControls', () => {
  const mockOnZoomIn = vi.fn();
  const mockOnZoomOut = vi.fn();
  const mockOnReset = vi.fn();

  const defaultProps = {
    onZoomIn: mockOnZoomIn,
    onZoomOut: mockOnZoomOut,
    onReset: mockOnReset,
  };

  it('renders zoom in, zoom out, and reset buttons', () => {
    render(<ZoomControls {...defaultProps} />);
    expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
    expect(screen.getByTitle('Reset View')).toBeInTheDocument();
  });

  it('triggers onZoomIn when zoom in button clicked', () => {
    render(<ZoomControls {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Zoom In'));
    expect(mockOnZoomIn).toHaveBeenCalled();
  });

  it('triggers onZoomOut when zoom out button clicked', () => {
    render(<ZoomControls {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Zoom Out'));
    expect(mockOnZoomOut).toHaveBeenCalled();
  });

  it('triggers onReset when reset button clicked', () => {
    render(<ZoomControls {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Reset View'));
    expect(mockOnReset).toHaveBeenCalled();
  });
});
