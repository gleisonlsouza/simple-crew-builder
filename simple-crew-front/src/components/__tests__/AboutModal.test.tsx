import { render, screen, fireEvent } from '@testing-library/react';
import { AboutModal } from '../AboutModal';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock PatchNotesModal to avoid its complex logic
vi.mock('../PatchNotesModal', () => ({
  PatchNotesModal: ({ isOpen, onClose }: any) => isOpen ? (
    <div data-testid="mock-patch-notes">
      <button onClick={onClose}>Close Patch Notes</button>
    </div>
  ) : null,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  Github: () => <div data-testid="icon-github" />,
  Linkedin: () => <div data-testid="icon-linkedin" />,
  Heart: () => <div data-testid="icon-heart" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  ExternalLink: () => <div data-testid="icon-external" />,
}));

// Mock logo
vi.mock('../assets/logo.PNG', () => ({
  default: 'mock-logo-path'
}));

describe('AboutModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<AboutModal isOpen={false} onClose={mockOnClose} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders static content correctly', () => {
    render(<AboutModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Simple Crew')).toBeInTheDocument();
    expect(screen.getByText('Builder')).toBeInTheDocument();
    expect(screen.getByText('Beta v0.0.7')).toBeInTheDocument();
    expect(screen.getByText('Gleison Souza')).toBeInTheDocument();
    expect(screen.getByText(/"Create multi-agents easily and intuitively. Let your imagination run wild."/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<AboutModal isOpen={true} onClose={mockOnClose} />);
    
    const closeButton = screen.getAllByRole('button')[0]; // The X button is first
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('opens and closes Patch Notes modal', () => {
    render(<AboutModal isOpen={true} onClose={mockOnClose} />);
    
    const versionBadge = screen.getByTestId('badge-version-about');
    fireEvent.click(versionBadge);
    
    expect(screen.getByTestId('mock-patch-notes')).toBeInTheDocument();
    
    const closePatchNotes = screen.getByText('Close Patch Notes');
    fireEvent.click(closePatchNotes);
    
    expect(screen.queryByTestId('mock-patch-notes')).not.toBeInTheDocument();
  });

  it('contains links to social media', () => {
    render(<AboutModal isOpen={true} onClose={mockOnClose} />);
    
    const linkedinLink = screen.getByTitle('LinkedIn Profile');
    const githubLink = screen.getByTitle('GitHub Repository');
    
    expect(linkedinLink).toHaveAttribute('href', 'https://www.linkedin.com/in/gleisonlsouza/');
    expect(githubLink).toHaveAttribute('href', 'https://github.com/gleisonlsouza/simple-crew-builder');
  });
});
