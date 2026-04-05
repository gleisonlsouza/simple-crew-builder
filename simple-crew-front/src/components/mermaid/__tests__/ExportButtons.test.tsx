import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportButtons } from '../ExportButtons';

// Mock icons
vi.mock('lucide-react', () => ({
  FileImage: () => <span data-testid="icon-image" />,
  FileText: () => <span data-testid="icon-pdf" />,
  X: () => <span data-testid="icon-close" />,
}));

describe('ExportButtons', () => {
  const mockOnDownloadPNG = vi.fn();
  const mockOnDownloadPDF = vi.fn();
  const mockOnClose = vi.fn();
  const mockRef = { current: document.createElement('div') };

  const defaultProps = {
    onDownloadPNG: mockOnDownloadPNG,
    onDownloadPDF: mockOnDownloadPDF,
    onClose: mockOnClose,
    diagramRef: mockRef,
  };

  it('renders PNG and PDF export buttons', () => {
    render(<ExportButtons {...defaultProps} />);
    expect(screen.getByText('PNG')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByTestId('icon-close')).toBeInTheDocument();
  });

  it('triggers onDownloadPNG with diagramRef', () => {
    render(<ExportButtons {...defaultProps} />);
    fireEvent.click(screen.getByText('PNG'));
    expect(mockOnDownloadPNG).toHaveBeenCalledWith(mockRef);
  });

  it('triggers onDownloadPDF with diagramRef', () => {
    render(<ExportButtons {...defaultProps} />);
    fireEvent.click(screen.getByText('PDF'));
    expect(mockOnDownloadPDF).toHaveBeenCalledWith(mockRef);
  });

  it('triggers onClose when close button clicked', () => {
    render(<ExportButtons {...defaultProps} />);
    fireEvent.click(screen.getByTestId('icon-close').parentElement!);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
