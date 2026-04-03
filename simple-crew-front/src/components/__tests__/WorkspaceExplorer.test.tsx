import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceExplorer } from '../WorkspaceExplorer';
import { useWorkspace } from '../../hooks/useWorkspace';

// Mock useWorkspace hook
vi.mock('../../hooks/useWorkspace', () => ({
    useWorkspace: vi.fn(),
}));

// Mock sub-components to focus on WorkspaceExplorer logic
vi.mock('../workspace/FileTree', () => ({
  FileTree: () => <div data-testid="file-tree">FileTree Mock</div>,
}));
vi.mock('../workspace/FileViewer', () => ({
  FileViewer: () => <div data-testid="file-viewer">FileViewer Mock</div>,
}));
vi.mock('../ConfirmationModal', () => ({
  ConfirmationModal: ({ onConfirm, title }: any) => (
    <div data-testid="modal">
        {title} 
        <button onClick={onConfirm}>ConfirmDelete</button>
    </div>
  ),
}));

describe('WorkspaceExplorer - Deep Coverage', () => {
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
        (useWorkspace as any).mockReturnValue(mockHookValues);
    });

    it('renders workspace metadata and header actions (lines 56-85)', () => {
        render(<WorkspaceExplorer />);
        
        expect(screen.getByText(/Explorer/i)).toBeDefined();
        expect(screen.getByText('Test Workspace')).toBeDefined();
        expect(screen.getByText('/test/path')).toBeDefined();

        // Refresh action
        const refreshBtn = screen.getByTitle('Refresh Files');
        fireEvent.click(refreshBtn);
        expect(mockHookValues.loadFiles).toHaveBeenCalled();

        // Download ZIP action
        const downloadBtn = screen.getByTitle('Download Full Workspace ZIP');
        fireEvent.click(downloadBtn);
        expect(mockHookValues.downloadZip).toHaveBeenCalledWith('ws-1', '');
    });

    it('handles context menu and triggers sub-actions (lines 147-200)', () => {
        const contextMenu = {
            x: 100, y: 100,
            item: { name: 'folder', path: 'folder', is_dir: true }
        };
        (useWorkspace as any).mockReturnValue({ ...mockHookValues, contextMenu });

        render(<WorkspaceExplorer />);
        
        const downloadOption = screen.getByText('Download ZIP');
        fireEvent.click(downloadOption);
        expect(mockHookValues.downloadZip).toHaveBeenCalledWith('ws-1', 'folder');
        expect(mockHookValues.closeContextMenu).toHaveBeenCalled();
    });

    it('renders file-specific context menu options', () => {
        const contextMenu = {
            x: 100, y: 100,
            item: { name: 'file.py', path: 'file.py', is_dir: false }
        };
        (useWorkspace as any).mockReturnValue({ ...mockHookValues, contextMenu });

        render(<WorkspaceExplorer />);
        
        // Download File
        const downloadFileOption = screen.getByText('Download File');
        fireEvent.click(downloadFileOption);
        expect(mockHookValues.downloadFile).toHaveBeenCalledWith('file.py');

        // Copy Path
        const copyOption = screen.getByText('Copy Relative Path');
        fireEvent.click(copyOption);
        expect(mockHookValues.copyRelativePath).toHaveBeenCalledWith('file.py');
    });

    it('triggers delete flow from context menu', () => {
        const contextMenu = {
            x: 100, y: 100,
            item: { name: 'trash.txt', path: 'trash.txt', is_dir: false }
        };
        (useWorkspace as any).mockReturnValue({ ...mockHookValues, contextMenu });

        render(<WorkspaceExplorer />);
        
        const deleteOption = screen.getByText('Delete');
        fireEvent.click(deleteOption);
        expect(mockHookValues.handleDelete).toHaveBeenCalledWith('trash.txt');
    });

    it('renders the ConfirmationModal when isDeleteModalOpen is true', () => {
        (useWorkspace as any).mockReturnValue({ ...mockHookValues, isDeleteModalOpen: true });
        render(<WorkspaceExplorer />);
        
        expect(screen.getByTestId('modal')).toBeDefined();
        expect(screen.getByText(/Delete Item/i)).toBeDefined();
        
        const confirmBtn = screen.getByText('ConfirmDelete');
        fireEvent.click(confirmBtn);
        expect(mockHookValues.confirmDelete).toHaveBeenCalled();
    });

    it('closes explorer when backdrop is clicked', () => {
        render(<WorkspaceExplorer />);
        const backdrop = screen.getByTestId('explorer-backdrop');
        fireEvent.click(backdrop);
        expect(mockHookValues.setIsExplorerOpen).toHaveBeenCalledWith(false);
    });
});
