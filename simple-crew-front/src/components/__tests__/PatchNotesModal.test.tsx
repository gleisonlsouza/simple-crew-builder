import { render, screen, fireEvent } from '@testing-library/react';
import { PatchNotesModal } from '../PatchNotesModal';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useFetchLatestRelease } from '../../hooks/useFetchLatestRelease';
import type { Mock } from 'vitest';

// Mock the hook
vi.mock('../../hooks/useFetchLatestRelease', () => ({
  useFetchLatestRelease: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  RefreshCw: () => <div data-testid="icon-refresh" />,
  AlertCircle: () => <div data-testid="icon-alert" />,
  ExternalLink: () => <div data-testid="icon-external" />,
  Calendar: () => <div data-testid="icon-calendar" />,
}));

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

describe('PatchNotesModal', () => {
  const mockOnClose = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    (useFetchLatestRelease as Mock).mockReturnValue({
      release: null,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = render(<PatchNotesModal isOpen={false} onClose={mockOnClose} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders loading state', () => {
    (useFetchLatestRelease as Mock).mockReturnValue({
      release: null,
      loading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<PatchNotesModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Fetching latest updates...')).toBeInTheDocument();
  });

  it('renders error state and handles retry', () => {
    (useFetchLatestRelease as Mock).mockReturnValue({
      release: null,
      loading: false,
      error: 'Failed to fetch',
      refetch: mockRefetch,
    });

    render(<PatchNotesModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Failed to load releases')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();

    const retryBtn = screen.getByText('Try Again');
    fireEvent.click(retryBtn);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders release content correctly', () => {
    const mockRelease = {
      tag_name: 'v1.0.0',
      published_at: '2024-01-01T00:00:00Z',
      body: '# New Features\n- Feature 1\n- Feature 2',
      html_url: 'https://github.com/test/release',
    };

    (useFetchLatestRelease as Mock).mockReturnValue({
      release: mockRelease,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<PatchNotesModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText("What's New")).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText(/Feature 1/)).toBeInTheDocument();
    expect(screen.getByText(/Feature 2/)).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    (useFetchLatestRelease as Mock).mockReturnValue({
      release: null,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { container } = render(<PatchNotesModal isOpen={true} onClose={mockOnClose} />);
    
    // The backdrop is the first child of the fixed container in the component
    // <div className="fixed ..."><div className="absolute inset-0 bg-slate-950/40 ..." onClick={onClose} />...</div>
    const backdrop = container.querySelector('.bg-slate-950\\/40');
    if (backdrop) {
      fireEvent.click(backdrop);
    } else {
      // Fallback if the class selector fails due to escaping
      const divs = container.querySelectorAll('div');
      const possibleBackdrop = Array.from(divs).find(d => d.className.includes('bg-slate-950/40'));
      if (possibleBackdrop) fireEvent.click(possibleBackdrop);
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    (useFetchLatestRelease as Mock).mockReturnValue({
      release: null,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<PatchNotesModal isOpen={true} onClose={mockOnClose} />);
    
    const closeButtons = screen.getAllByRole('button');
    // Header close button (X) and Footer Close button
    fireEvent.click(closeButtons[0]); // Header X

    expect(mockOnClose).toHaveBeenCalled();
  });
});
