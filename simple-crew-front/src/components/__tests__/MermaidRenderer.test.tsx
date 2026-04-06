import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MermaidRenderer from '../MermaidRenderer';
import { useMermaidRender } from '../../hooks/useMermaidRender';
import { useMermaidExport } from '../../hooks/useMermaidExport';

// Mock hooks
vi.mock('../../hooks/useMermaidRender', () => ({
  useMermaidRender: vi.fn(),
}));

vi.mock('../../hooks/useMermaidExport', () => ({
  useMermaidExport: vi.fn(),
}));

// Mock icons
vi.mock('lucide-react', () => ({
  Maximize2: () => <span data-testid="icon-maximize" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
  FileImage: () => <span data-testid="icon-image" />,
  FileText: () => <span data-testid="icon-pdf" />,
  X: () => <span data-testid="icon-close" />,
  Plus: () => <span data-testid="icon-plus" />,
  Minus: () => <span data-testid="icon-minus" />,
  RefreshCw: () => <span data-testid="icon-reset" />,
}));

// Mock react-zoom-pan-pinch
vi.mock('react-zoom-pan-pinch', () => ({
  TransformWrapper: ({ children }: any) => (
    <div data-testid="zoom-wrapper">
      {children({
        zoomIn: vi.fn(),
        zoomOut: vi.fn(),
        resetTransform: vi.fn(),
      })}
    </div>
  ),
  TransformComponent: ({ children }: any) => <div>{children}</div>,
}));

describe('MermaidRenderer', () => {
  const mockChart = 'graph TD; A-->B;';
  const mockDownloadPNG = vi.fn();
  const mockDownloadPDF = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useMermaidRender as any).mockReturnValue({
      svg: '<svg id="mermaid-svg"></svg>',
      error: null,
    });
    (useMermaidExport as any).mockReturnValue({
      downloadPNG: mockDownloadPNG,
      downloadPDF: mockDownloadPDF,
    });
  });

  it('renders successfully with SVG', () => {
    render(<MermaidRenderer chart={mockChart} />);
    expect(screen.getByTestId('icon-maximize')).toBeInTheDocument();
    const svgDiv = document.querySelector('#mermaid-svg');
    expect(svgDiv).toBeDefined();
  });

  it('renders error message and original code on failure', () => {
    (useMermaidRender as any).mockReturnValue({
      svg: '',
      error: 'Syntax Error in Mermaid code',
    });
    render(<MermaidRenderer chart={mockChart} />);
    expect(screen.getByText(/Erro na renderização do Mermaid/i)).toBeInTheDocument();
    expect(screen.getByText('Syntax Error in Mermaid code')).toBeInTheDocument();
    expect(screen.getByText(mockChart)).toBeInTheDocument();
  });

  it('opens full screen modal and renders zoom controls', () => {
    render(<MermaidRenderer chart={mockChart} />);
    const maximizeBtn = screen.getByTestId('icon-maximize').parentElement!;
    fireEvent.click(maximizeBtn);

    expect(screen.getByText('Diagram Preview')).toBeInTheDocument();
    expect(screen.getByTestId('zoom-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('icon-plus')).toBeInTheDocument(); // Zoom control
    expect(screen.getByText('PNG')).toBeInTheDocument(); // Export button
  });

  it('closes modal when clicking backdrop or close button', () => {
    render(<MermaidRenderer chart={mockChart} />);
    fireEvent.click(screen.getByTestId('icon-maximize').parentElement!);
    expect(screen.getByText('Diagram Preview')).toBeInTheDocument();

    // Close button
    fireEvent.click(screen.getByTestId('icon-close').parentElement!);
    expect(screen.queryByText('Diagram Preview')).not.toBeInTheDocument();
  });
});
