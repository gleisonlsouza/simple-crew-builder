import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportDropdown } from '../ExportDropdown';
import { useStore } from '../../store/index';

// Mock store
vi.mock('../../store/index', () => ({
  useStore: vi.fn(),
}));

// Mock icons
vi.mock('lucide-react', () => ({
  Download: () => <span data-testid="icon-download" />,
  Code: () => <span data-testid="icon-code" />,
  FileText: () => <span data-testid="icon-file" />,
  ChevronDown: () => <span data-testid="icon-chevron" />,
}));

describe('ExportDropdown', () => {
  const mockExportJson = vi.fn();
  const mockExportPython = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockImplementation((selector: any) => selector({
      exportProjectJson: mockExportJson,
    }));
    (useStore as any).getState = () => ({
      exportPythonProject: mockExportPython,
    });
  });

  it('renders and toggles menu open/close', () => {
    render(<ExportDropdown />);
    const btn = screen.getByText('Export');
    
    // Toggle open
    fireEvent.click(btn);
    expect(screen.getByText('JSON Config')).toBeInTheDocument();
    expect(screen.getByText('Python Project')).toBeInTheDocument();

    // Toggle close
    fireEvent.click(btn);
    expect(screen.queryByText('JSON Config')).not.toBeInTheDocument();
  });

  it('triggers JSON export and closes menu', () => {
    render(<ExportDropdown />);
    fireEvent.click(screen.getByText('Export'));
    
    fireEvent.click(screen.getByText('JSON Config'));
    expect(mockExportJson).toHaveBeenCalled();
    expect(screen.queryByText('JSON Config')).not.toBeInTheDocument();
  });

  it('triggers Python export and closes menu', () => {
    render(<ExportDropdown />);
    fireEvent.click(screen.getByText('Export'));
    
    fireEvent.click(screen.getByText('Python Project'));
    expect(mockExportPython).toHaveBeenCalled();
    expect(screen.queryByText('Python Project')).not.toBeInTheDocument();
  });

  it('renders "Coming Soon" for PDF Report', () => {
    render(<ExportDropdown />);
    fireEvent.click(screen.getByText('Export'));
    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    
    // O botão (avô do texto) deve ter a classe cursor-not-allowed
    const pdfBtn = screen.getByText('PDF Report').closest('button');
    expect(pdfBtn?.className).toContain('cursor-not-allowed');
  });

  it('closes menu when clicking outside', () => {
    render(<ExportDropdown />);
    fireEvent.click(screen.getByText('Export'));
    expect(screen.getByText('JSON Config')).toBeInTheDocument();

    // Simula clique fora (mousedown no body)
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('JSON Config')).not.toBeInTheDocument();
  });
});
