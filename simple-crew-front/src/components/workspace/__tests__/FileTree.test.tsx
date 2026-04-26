import { render, screen, fireEvent } from '@testing-library/react';
import { FileTree } from '../FileTree';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { WorkspaceFile } from '../../../types/store.types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Folder: ({ className }: any) => <div data-testid="icon-folder" className={className} />,
  ChevronRight: ({ className }: any) => <div data-testid="icon-chevron-right" className={className} />,
  ChevronDown: ({ className }: any) => <div data-testid="icon-chevron-down" className={className} />,
  FileText: ({ className }: any) => <div data-testid="icon-file-text" className={className} />,
  Code: ({ className }: any) => <div data-testid="icon-code" className={className} />,
  Search: ({ className }: any) => <div data-testid="icon-search" className={className} />,
  RefreshCw: ({ className }: any) => <div data-testid="icon-refresh" className={className} />,
  Archive: ({ className }: any) => <div data-testid="icon-archive" className={className} />,
  Upload: ({ className }: any) => <div data-testid="icon-upload" className={className} />,
  Plus: ({ className }: any) => <div data-testid="icon-plus" className={className} />,
  Trash2: ({ className }: any) => <div data-testid="icon-trash" className={className} />,
}));

describe('FileTree', () => {
  const mockOnFileSelect = vi.fn();
  const mockOnFolderZip = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnContextMenu = vi.fn();
  const mockSetSearchTerm = vi.fn();
  const mockOnUpload = vi.fn();

  const mockFiles: WorkspaceFile[] = [
    {
      name: 'src',
      path: 'src',
      is_dir: true,
      children: [
        { name: 'main.py', path: 'src/main.py', is_dir: false },
        { name: 'utils.ts', path: 'src/utils.ts', is_dir: false },
      ]
    },
    { name: 'README.md', path: 'README.md', is_dir: false },
  ];

  const defaultProps = {
    files: mockFiles,
    onFileSelect: mockOnFileSelect,
    onFolderZip: mockOnFolderZip,
    onDelete: mockOnDelete,
    onContextMenu: mockOnContextMenu,
    selectedPath: null,
    searchTerm: '',
    setSearchTerm: mockSetSearchTerm,
    fileInputRef: { current: null } as any,
    folderInputRef: { current: null } as any,
    onUpload: mockOnUpload,
    isUploading: false,
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders root files and folders', () => {
    render(<FileTree {...defaultProps} />);
    
    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('README.md')).toBeInTheDocument();
    expect(screen.getByTestId('icon-folder')).toBeInTheDocument();
  });

  it('expands a folder when clicked and shows children', () => {
    render(<FileTree {...defaultProps} />);
    
    const folder = screen.getByText('src');
    fireEvent.click(folder);
    
    expect(screen.getByText('main.py')).toBeInTheDocument();
    expect(screen.getByText('utils.ts')).toBeInTheDocument();
    expect(screen.getByTestId('icon-chevron-down')).toBeInTheDocument();
  });

  it('calls onFileSelect when a file is clicked', () => {
    render(<FileTree {...defaultProps} />);
    
    const file = screen.getByText('README.md');
    fireEvent.click(file);
    
    expect(mockOnFileSelect).toHaveBeenCalledWith('README.md');
  });

  it('calls onFolderZip when folder ZIP button is clicked', () => {
    render(<FileTree {...defaultProps} />);
    
    // The button only appears on hover in CSS, but in RTL we can find it by title
    const zipBtn = screen.getByTitle('Download folder as ZIP');
    fireEvent.click(zipBtn);
    
    expect(mockOnFolderZip).toHaveBeenCalledWith('src');
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<FileTree {...defaultProps} />);
    
    const deleteBtns = screen.getAllByTitle(/Delete/);
    fireEvent.click(deleteBtns[1]); // README.md delete button
    
    expect(mockOnDelete).toHaveBeenCalledWith('README.md');
  });

  it('shows loading state correctly', () => {
    render(<FileTree {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText(/Loading Directory/i)).toBeInTheDocument();
    expect(screen.getByTestId('icon-refresh')).toBeInTheDocument();
  });

  it('shows empty workspace message when no files exist', () => {
    render(<FileTree {...defaultProps} files={[]} />);
    
    expect(screen.getByText('This workspace is empty.')).toBeInTheDocument();
  });

  it('handles search input change', () => {
    render(<FileTree {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Filter files...');
    fireEvent.change(input, { target: { value: 'test' } });
    
    expect(mockSetSearchTerm).toHaveBeenCalledWith('test');
  });
});
