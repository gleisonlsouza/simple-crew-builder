import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SortableItem } from '../SortableItem';
import { useSortable } from '@dnd-kit/sortable';

// Mock dnd-kit sortable
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: vi.fn(),
}));

// Mock dnd-kit utilities
vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn((t) => t ? 'translate3d(0,0,0)' : ''),
    },
  },
}));

// Mock icons
vi.mock('lucide-react', () => ({
  GripVertical: () => <span data-testid="icon-grip" />,
}));

describe('SortableItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders name and handle correctly', () => {
    vi.mocked(useSortable).mockReturnValue({
      attributes: { 'aria-label': 'drag-handle' },
      listeners: { onMouseDown: vi.fn() },
      setNodeRef: vi.fn(),
      transform: null,
      transition: 'transform 200ms ease',
      isDragging: false,
    } as any);

    render(<SortableItem id="item-1" name="Test Item" />);
    expect(screen.getByText('Test Item')).toBeInTheDocument();
    expect(screen.getByTestId('icon-grip')).toBeInTheDocument();
    expect(screen.getByLabelText('drag-handle')).toBeInTheDocument();
  });

  it('applies dragging styles when isDragging is true', () => {
    vi.mocked(useSortable).mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: { x: 0, y: 10, scaleX: 1, scaleY: 1 },
      transition: 'none',
      isDragging: true,
    } as any);

    render(<SortableItem id="item-1" name="Dragging Item" />);
    // O container deve ter a classe de opacidade reduzida e o anel de destaque
    const container = screen.getByText('Dragging Item').parentElement!;
    expect(container.className).toContain('opacity-90');
    expect(container.className).toContain('ring-2');
  });
});
