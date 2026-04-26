import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkspace } from '../useWorkspace';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Prism from 'prismjs';
import { useStore } from '../../store/index';
import type { AppState } from '../../store/index';
import type { Mock } from 'vitest';
import toast from 'react-hot-toast';
import React from 'react';

// Mock Zustand
vi.mock('../../store/index', () => ({
    useStore: vi.fn(),
}));

// Mock Prism
vi.mock('prismjs', () => ({
    default: { highlightAll: vi.fn() },
    highlightAll: vi.fn(),
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() },
    success: vi.fn(),
    error: vi.fn(),
}));

describe('useWorkspace - Hook Coverage', () => {
    let mockStore: AppState;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockStore = {
            isExplorerOpen: true,
            activeWorkspaceId: 'ws-1',
            currentExplorerWsId: null,
            workspaces: [{ id: 'ws-1', name: 'WS1' }],
            setIsExplorerOpen: vi.fn(),
            fetchWorkspaceFiles: vi.fn().mockResolvedValue([{ name: 'test.txt', path: 'test.txt', is_dir: false }]),
            fetchFileContent: vi.fn().mockResolvedValue('text content'),
            uploadWorkspaceFiles: vi.fn().mockResolvedValue(undefined),
            deleteWorkspaceFile: vi.fn().mockResolvedValue(undefined),
            downloadWorkspaceZip: vi.fn(),
        } as unknown as AppState;

        (useStore as unknown as Mock).mockImplementation((selector: (state: AppState) => unknown) => selector(mockStore));
        
        vi.stubGlobal('URL', { 
            createObjectURL: vi.fn(() => 'blob:url'), 
            revokeObjectURL: vi.fn() 
        });
        vi.stubGlobal('navigator', { 
            clipboard: { writeText: vi.fn() } 
        });
    });

    it('handleFileSelect: fetches content and highlights', async () => {
        const { result } = renderHook(() => useWorkspace());
        await act(async () => {
            await result.current.handleFileSelect('test.txt');
        });
        expect(mockStore.fetchFileContent).toHaveBeenCalledWith('ws-1', 'test.txt');
        expect(result.current.content).toBe('text content');
        
        await waitFor(() => expect(Prism.highlightAll).toHaveBeenCalled());
    });

    it('handleDownload: downloads current file content', async () => {
        const { result } = renderHook(() => useWorkspace());
        
        // Setup initial content
        await act(async () => {
            await result.current.handleFileSelect('test.txt');
        });

        const documentSpy = vi.spyOn(document, 'createElement');
        
        act(() => {
            result.current.handleDownload();
        });
        
        expect(documentSpy).toHaveBeenCalledWith('a');
    });

    it('downloadFile: triggers download flow with custom path', async () => {
        const { result } = renderHook(() => useWorkspace());
        const documentSpy = vi.spyOn(document, 'createElement');
        
        await act(async () => {
            await result.current.downloadFile('other.py');
        });
        
        expect(mockStore.fetchFileContent).toHaveBeenCalledWith('ws-1', 'other.py');
        expect(documentSpy).toHaveBeenCalledWith('a');
    });

    it('downloadFile: handles fetch error', async () => {
        (mockStore.fetchFileContent as Mock).mockRejectedValueOnce(new Error('Fetch Fail'));
        const { result } = renderHook(() => useWorkspace());
        
        await act(async () => {
            await result.current.downloadFile('fail.txt');
        });
        
        expect(toast.error).toHaveBeenCalledWith('Failed to download file');
    });

    it('handleUpload: triggers upload and reloads', async () => {
        const { result } = renderHook(() => useWorkspace());
        const mockFiles = [new File([''], 'test.txt')];
        const event = { 
            target: { 
                files: mockFiles, 
                value: 'something' 
            } 
        } as unknown as React.ChangeEvent<HTMLInputElement>;

        await act(async () => {
            await result.current.handleUpload(event);
        });

        expect(mockStore.uploadWorkspaceFiles).toHaveBeenCalled();
        expect(mockStore.fetchWorkspaceFiles).toHaveBeenCalled();
        expect(event.target.value).toBe('');
    });

    it('handleUpload: handles upload error', async () => {
        (mockStore.uploadWorkspaceFiles as Mock).mockRejectedValueOnce(new Error('Upload Fail'));
        const { result } = renderHook(() => useWorkspace());
        const mockFiles = [new File([''], 'test.txt')];
        const event = { 
            target: { files: mockFiles, value: 'something' } 
        } as unknown as React.ChangeEvent<HTMLInputElement>;

        await act(async () => {
            await result.current.handleUpload(event);
        });
        
        expect(result.current.isUploading).toBe(false);
    });

    it('confirmDelete: triggers deletion and handles cleanup', async () => {
        const { result } = renderHook(() => useWorkspace());
        
        // Select file first
        await act(async () => {
            await result.current.handleFileSelect('test.txt');
        });

        act(() => {
            result.current.handleDelete('test.txt');
        });
        
        await act(async () => {
            await result.current.confirmDelete();
        });

        expect(mockStore.deleteWorkspaceFile).toHaveBeenCalled();
        expect(result.current.selectedPath).toBeNull();
        expect(result.current.content).toBeNull();
    });

    it('confirmDelete: handles deletion error', async () => {
        (mockStore.deleteWorkspaceFile as Mock).mockRejectedValueOnce(new Error('Delete Fail'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const { result } = renderHook(() => useWorkspace());
        
        act(() => {
            result.current.handleDelete('fail.txt');
        });
        
        await act(async () => {
            await result.current.confirmDelete();
        });
        
        expect(consoleSpy).toHaveBeenCalled();
        expect(result.current.isDeleteModalOpen).toBe(false);
        consoleSpy.mockRestore();
    });

    it('handleContextMenu: updates context menu state', () => {
        const { result } = renderHook(() => useWorkspace());
        const mockEvent = { 
            preventDefault: vi.fn(), 
            stopPropagation: vi.fn(),
            clientX: 100,
            clientY: 200
        } as unknown as React.MouseEvent;
        const mockItem = { name: 'file.txt', path: 'file.txt', is_dir: false };

        act(() => {
            result.current.handleContextMenu(mockEvent, mockItem);
        });

        expect(result.current.contextMenu).toEqual({ x: 100, y: 200, item: mockItem });
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('closes context menu on window click', () => {
        const { result } = renderHook(() => useWorkspace());
        const mockEvent = { 
            preventDefault: vi.fn(), stopPropagation: vi.fn(), clientX: 10, clientY: 10 
        } as unknown as React.MouseEvent;
        
        act(() => {
            result.current.handleContextMenu(mockEvent, { name: 'f.txt', path: 'f.txt', is_dir: false });
        });
        expect(result.current.contextMenu).not.toBeNull();

        act(() => {
            window.dispatchEvent(new MouseEvent('click'));
        });
        expect(result.current.contextMenu).toBeNull();
    });

    it('copyRelativePath: uses clipboard API', () => {
        const { result } = renderHook(() => useWorkspace());
        act(() => {
            result.current.copyRelativePath('my/path');
        });
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('my/path');
        expect(toast.success).toHaveBeenCalled();
    });

    it('filterFiles: handles recursive search in directories', async () => {
        const files = [
            { name: 'folder', path: 'folder', is_dir: true, children: [
                { name: 'sub.txt', path: 'folder/sub.txt', is_dir: false }
            ]}
        ];
        (mockStore.fetchWorkspaceFiles as Mock).mockResolvedValue(files);
        
        const { result } = renderHook(() => useWorkspace());
        
        await waitFor(() => expect(result.current.files.length).toBe(1));

        act(() => {
            result.current.setSearchTerm('sub');
        });

        expect(result.current.filteredDocs.length).toBe(1);
        expect(result.current.filteredDocs[0].children?.[0].name).toBe('sub.txt');
    });

    it('filterFiles: reaches null case for non-matching files at root', async () => {
        const files = [
            { name: 'no-match.jpg', path: 'no-match.jpg', is_dir: false },
        ];
        (mockStore.fetchWorkspaceFiles as Mock).mockResolvedValue(files);
        const { result } = renderHook(() => useWorkspace());
        await waitFor(() => expect(result.current.files.length).toBe(1));
        act(() => { result.current.setSearchTerm('something-else'); });
        expect(result.current.filteredDocs.length).toBe(0);
    });
});
