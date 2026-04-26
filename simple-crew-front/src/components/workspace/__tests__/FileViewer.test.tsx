import { render, screen, fireEvent } from '@testing-library/react';
import { FileViewer } from '../FileViewer';
import { vi, describe, it, expect } from 'vitest';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Download: ({ className }: any) => <div data-testid="icon-download" className={className} />,
  FileText: ({ className }: any) => <div data-testid="icon-file-text" className={className} />,
  RefreshCw: ({ className }: any) => <div data-testid="icon-refresh" className={className} />,
  File: ({ className }: any) => <div data-testid="icon-file" className={className} />,
}));

describe('FileViewer', () => {
  const mockOnDownload = vi.fn();

  const defaultProps = {
    selectedPath: null,
    content: null,
    isContentLoading: false,
    onDownload: mockOnDownload,
  };

  it('renders "No file selected" state when selectedPath is null', () => {
    render(<FileViewer {...defaultProps} />);
    
    expect(screen.getByText('No file selected')).toBeInTheDocument();
    expect(screen.getByTestId('icon-file')).toBeInTheDocument();
  });

  it('renders file path and content when provided', () => {
    const props = {
      ...defaultProps,
      selectedPath: 'folder/script.py',
      content: 'print("Hello World")',
    };
    
    render(<FileViewer {...props} />);
    
    expect(screen.getByText('folder/script.py')).toBeInTheDocument();
    expect(screen.getByText('print("Hello World")')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByTestId('icon-file-text')).toBeInTheDocument();
  });

  it('shows loading state when isContentLoading is true', () => {
    const props = {
      ...defaultProps,
      selectedPath: 'folder/script.py',
      isContentLoading: true,
    };
    
    render(<FileViewer {...props} />);
    
    expect(screen.getByTestId('icon-refresh')).toBeInTheDocument();
    // The spinner is inside a div with animate-spin
    expect(screen.getByTestId('icon-refresh')).toHaveClass('animate-spin');
  });

  it('calls onDownload when download button is clicked', () => {
    const props = {
      ...defaultProps,
      selectedPath: 'folder/script.py',
      content: 'something',
    };
    
    render(<FileViewer {...props} />);
    
    const downloadBtn = screen.getByText('Download');
    fireEvent.click(downloadBtn);
    
    expect(mockOnDownload).toHaveBeenCalled();
  });

  it('detects language based on file extension', () => {
    const props = {
      ...defaultProps,
      selectedPath: 'data.json',
      content: '{"key": "value"}',
    };
    
    render(<FileViewer {...props} />);
    
    const codeElement = screen.getByText('{"key": "value"}');
    expect(codeElement).toHaveClass('language-json');
  });
});
