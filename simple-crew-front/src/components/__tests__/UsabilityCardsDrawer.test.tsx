import { render, screen, fireEvent } from '@testing-library/react';
import { UsabilityCardsDrawer } from '../UsabilityCardsDrawer';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import type { Mock } from 'vitest';

// Mock the store
vi.mock('../../store/index', () => ({
  useStore: Object.assign(
    vi.fn(),
    {
      getState: vi.fn(),
      subscribe: vi.fn(),
    }
  ),
}));

// Mock React Flow
vi.mock('@xyflow/react', () => ({
  useReactFlow: vi.fn(() => ({
    fitView: vi.fn(),
  })),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  LayoutTemplate: () => <div data-testid="icon-template" />,
  Search: () => <div data-testid="icon-search" />,
  MessageCircle: () => <div data-testid="icon-chat" />,
  Plus: () => <div data-testid="icon-plus" />,
  Globe: () => <div data-testid="icon-globe" />,
}));

describe('UsabilityCardsDrawer', () => {
  const mockSetIsUsabilityDrawerOpen = vi.fn();
  const mockAddNodeWithAutoPosition = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector({
      isUsabilityDrawerOpen: true,
      setIsUsabilityDrawerOpen: mockSetIsUsabilityDrawerOpen,
      addNodeWithAutoPosition: mockAddNodeWithAutoPosition,
    }));
    (useStore.getState as Mock).mockReturnValue({
      addNodeWithAutoPosition: mockAddNodeWithAutoPosition,
    });
  });

  it('renders correctly when open', () => {
    render(<UsabilityCardsDrawer />);
    expect(screen.getByText('Usability Cards Gallery')).toBeInTheDocument();
    expect(screen.getByText('Chat Trigger')).toBeInTheDocument();
    expect(screen.getByText('Webhook Trigger')).toBeInTheDocument();
  });

  it('closes the drawer when X is clicked', () => {
    render(<UsabilityCardsDrawer />);
    const closeBtn = screen.getByTestId('btn-close-usability-drawer');
    fireEvent.click(closeBtn);
    expect(mockSetIsUsabilityDrawerOpen).toHaveBeenCalledWith(false);
  });

  it('adds a Chat Trigger node when clicked', () => {
    render(<UsabilityCardsDrawer />);
    const addBtn = screen.getByTestId('btn-add-chat-trigger');
    fireEvent.click(addBtn);
    
    expect(mockAddNodeWithAutoPosition).toHaveBeenCalledWith('chat', expect.any(Object));
    expect(mockSetIsUsabilityDrawerOpen).toHaveBeenCalledWith(false);
  });

  it('adds a Webhook Trigger node when clicked', () => {
    render(<UsabilityCardsDrawer />);
    const addBtn = screen.getByTestId('btn-add-webhook-trigger');
    fireEvent.click(addBtn);
    
    expect(mockAddNodeWithAutoPosition).toHaveBeenCalledWith('webhook', expect.any(Object));
    expect(mockSetIsUsabilityDrawerOpen).toHaveBeenCalledWith(false);
  });

  it('handles search input', () => {
    render(<UsabilityCardsDrawer />);
    const input = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(input, { target: { value: 'Something' } });
    expect(input).toHaveValue('Something');
  });
});
