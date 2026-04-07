import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceExplorer } from '../WorkspaceExplorer';
import { useWorkspace } from '../../hooks/useWorkspace';

// Mock useWorkspace hook
vi.mock('../../hooks/useWorkspace', () => ({
    useWorkspace: vi.fn(),
}));

// Mock sub-components with prop exposure for testing
vi.mock('../workspace/FileTree', () => ({
  FileTree: ({ setSearchTerm, onUpload, onFolderZip }: { setSearchTerm: (t: string) => void, onUpload: (e: { target: { files: unknown[] } }) => void, onFolderZip: (p: string) => void }) => (
    <div data-testid="file-tree">
      <input data-testid="search-input" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} />
      <button data-testid="upload-trigger" onClick={() => onUpload({ target: { files: [] } })}>Upload</button>
      <button data-testid="zip-folder-trigger" onClick={() => onFolderZip('folder-to-zip')}>ZipFolder</button>
    </div>
  ),
}));
vi.mock('../workspace/FileViewer', () => ({
  FileViewer: ({ onDownload }: { onDownload: () => void }) => (
    <div data-testid="file-viewer">
        <button onClick={onDownload}>DownloadCurrent</button>
    </div>
  ),
}));
vi.mock('../ConfirmationModal', () => ({
  ConfirmationModal: ({ isOpen, onClose, onConfirm, title }: { isOpen: boolean, onClose: () => void, onConfirm: () => void; title: string }) => (
    isOpen ? (
        <div data-testid="modal">
            {title} 
            <button onClick={onConfirm}>ConfirmDelete</button>
            <button onClick={onClose}>CancelDelete</button>
        </div>
    ) : null
  ),
}));

describe('WorkspaceExplorer - Total Coverage', () => {
    const mockHookValues = {
        isExplorerOpen: true,
        setIsExplorerOpen: vi.fn(),
        currentWsId: 'ws-1',
        workspace: { id: 'ws-1', name: 'Test Workspace', path: '/test/path' },
        selectedPath: 'some-file.txt',
        content: 'content',
        isLoading: false,
        isContentLoading: false,
        isUploading: false,
        searchTerm: '',
        setSearchTerm: vi.fn(),
        isDeleteModalOpen: false,
        setIsDeleteModalOpen: vi.fn(),
        pathToExclude: 'file-to-delete.txt',
        contextMenu: null,
        fileInputRef: { current: null },
        folderInputRef: { current: null },
        loadFiles: vi.fn(),
        handleFileSelect: vi.fn(),
        handleDownload: vi.fn(),
        downloadFile: vi.fn(),
        handleUpload: vi.fn(),
        handleDelete: vi.fn(),
        handleContextMenu: vi.fn(),
        confirmDelete: vi.fn(),
        closeContextMenu: vi.fn(),
        copyRelativePath: vi.fn(),
        filteredDocs: [],
        downloadZip: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useWorkspace as unknown as Mock).mockReturnValue(mockHookValues);
    });

    it('returns null if isExplorerOpen is false', () => {
        (useWorkspace as unknown as Mock).mockReturnValue({ ...mockHookValues, isExplorerOpen: false });
        const { container } = render(<WorkspaceExplorer />);
        expect(container.firstChild).toBeNull();
    });

    it('renders workspace metadata and header actions', () => {
        render(<WorkspaceExplorer />);
        
        expect(screen.getByText('Test Workspace')).toBeDefined();
        expect(screen.getByText('/test/path')).toBeDefined();

        // Refresh action
        fireEvent.click(screen.getByTitle('Refresh Files'));
        expect(mockHookValues.loadFiles).toHaveBeenCalled();

        // Download ZIP action
        fireEvent.click(screen.getByTitle('Download Full Workspace ZIP'));
        expect(mockHookValues.downloadZip).toHaveBeenCalledWith('ws-1', '');
    });

    it('closes explorer via header button', () => {
        render(<WorkspaceExplorer />);
        const closeBtn = screen.getByTitle('Download Full Workspace ZIP').nextElementSibling?.nextElementSibling;
        if (closeBtn) fireEvent.click(closeBtn);
        expect(mockHookValues.setIsExplorerOpen).toHaveBeenCalledWith(false);
    });

    it('handles search input from FileTree', () => {
        render(<WorkspaceExplorer />);
        const input = screen.getByTestId('search-input');
        fireEvent.change(input, { target: { value: 'my text' } });
        expect(mockHookValues.setSearchTerm).toHaveBeenCalledWith('my text');
    });

    it('triggers upload from FileTree', () => {
        render(<WorkspaceExplorer />);
        fireEvent.click(screen.getByTestId('upload-trigger'));
        expect(mockHookValues.handleUpload).toHaveBeenCalled();
    });

    it('handles download from FileViewer', () => {
        render(<WorkspaceExplorer />);
        fireEvent.click(screen.getByText('DownloadCurrent'));
        expect(mockHookValues.handleDownload).toHaveBeenCalled();
    });

    it('handles context menu items and prevention', () => {
        const mockItem = { name: 'folder', path: 'folder', is_dir: true };
        const contextMenu = { x: 100, y: 100, item: mockItem };
        (useWorkspace as unknown as Mock).mockReturnValue({ ...mockHookValues, contextMenu });

        render(<WorkspaceExplorer />);
        
        fireEvent.click(screen.getByText('Download ZIP'));
        expect(mockHookValues.downloadZip).toHaveBeenCalledWith('ws-1', 'folder');
        expect(mockHookValues.closeContextMenu).toHaveBeenCalled();
    });

    it('renders file-specific context menu options', () => {
        const contextMenu = {
            x: 100, y: 100,
            item: { name: 'file.py', path: 'file.py', is_dir: false }
        };
        (useWorkspace as unknown as Mock).mockReturnValue({ ...mockHookValues, contextMenu });

        render(<WorkspaceExplorer />);
        
        fireEvent.click(screen.getByText('Download File'));
        expect(mockHookValues.downloadFile).toHaveBeenCalledWith('file.py');

        fireEvent.click(screen.getByText('Copy Relative Path'));
        expect(mockHookValues.copyRelativePath).toHaveBeenCalledWith('file.py');

        fireEvent.click(screen.getByText('Delete'));
        expect(mockHookValues.handleDelete).toHaveBeenCalledWith('file.py');
    });

    it('closes the ConfirmationModal via onClose', () => {
        (useWorkspace as unknown as Mock).mockReturnValue({ ...mockHookValues, isDeleteModalOpen: true });
        render(<WorkspaceExplorer />);
        
        fireEvent.click(screen.getByText('CancelDelete'));
        expect(mockHookValues.setIsDeleteModalOpen).toHaveBeenCalledWith(false);
    });

    it('confirms deletion in the modal', () => {
        (useWorkspace as unknown as Mock).mockReturnValue({ ...mockHookValues, isDeleteModalOpen: true });
        render(<WorkspaceExplorer />);
        
        fireEvent.click(screen.getByText('ConfirmDelete'));
        expect(mockHookValues.confirmDelete).toHaveBeenCalled();
    });

    it('triggers folder zip from FileTree', () => {
        render(<WorkspaceExplorer />);
        fireEvent.click(screen.getByTestId('zip-folder-trigger'));
        expect(mockHookValues.downloadZip).toHaveBeenCalledWith('ws-1', 'folder-to-zip');
    });

    it('closes explorer when backdrop is clicked', () => {
        render(<WorkspaceExplorer />);
        fireEvent.click(screen.getByTestId('explorer-backdrop'));
        expect(mockHookValues.setIsExplorerOpen).toHaveBeenCalledWith(false);
    });

    it('prevents context menu defaults and propagation on menu container', () => {
        const contextMenu = { x: 10, y: 10, item: { name: 'f', path: 'f', is_dir: false } };
        (useWorkspace as unknown as Mock).mockReturnValue({ ...mockHookValues, contextMenu });
        render(<WorkspaceExplorer />);
        
        const menu = screen.getByText('Copy Relative Path').parentElement!;
        const preventSpy = vi.fn();
        fireEvent.contextMenu(menu, { preventDefault: preventSpy });
    });
});
