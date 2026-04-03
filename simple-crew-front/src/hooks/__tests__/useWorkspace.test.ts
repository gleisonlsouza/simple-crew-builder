import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkspace } from '../useWorkspace';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Prism from 'prismjs';
import { useStore } from '../../store/index';
import toast from 'react-hot-toast';

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
    let mockStore: any;

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
        };

        (useStore as any).mockImplementation((selector: any) => selector(mockStore));
        
        vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:url'), revokeObjectURL: vi.fn() });
        vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
    });

    it('handleFileSelect: fetches content and highlights (lines 65-72)', async () => {
        const { result } = renderHook(() => useWorkspace());
        await act(async () => {
            await result.current.handleFileSelect('test.txt');
        });
        expect(mockStore.fetchFileContent).toHaveBeenCalledWith('ws-1', 'test.txt');
        expect(result.current.content).toBe('text content');
        
        // Wait for effect
        await waitFor(() => expect(Prism.highlightAll).toHaveBeenCalled());
    });

    it('downloadFile: triggers download flow (lines 88-106)', async () => {
        const { result } = renderHook(() => useWorkspace());
        const documentSpy = vi.spyOn(document, 'createElement');
        
        await act(async () => {
            await result.current.downloadFile('test.txt');
        });
        
        expect(documentSpy).toHaveBeenCalledWith('a');
    });

    it('handleUpload: triggers upload and reloads (lines 108-122)', async () => {
        const { result } = renderHook(() => useWorkspace());
        const mockFiles = [new File([''], 'test.txt')];
        const event = { target: { files: mockFiles, value: 'something' } } as any;

        await act(async () => {
            await result.current.handleUpload(event);
        });

        expect(mockStore.uploadWorkspaceFiles).toHaveBeenCalled();
        expect(mockStore.fetchWorkspaceFiles).toHaveBeenCalled();
    });

    it('confirmDelete: triggers deletion and handles cleanup (lines 129-145)', async () => {
        const { result } = renderHook(() => useWorkspace());
        act(() => {
            result.current.handleDelete('test.txt');
        });
        
        await act(async () => {
            await result.current.confirmDelete();
        });

        expect(mockStore.deleteWorkspaceFile).toHaveBeenCalled();
        expect(result.current.isDeleteModalOpen).toBe(false);
    });

    it('copyRelativePath: uses clipboard API (lines 165-168)', () => {
        const { result } = renderHook(() => useWorkspace());
        act(() => {
            result.current.copyRelativePath('my/path');
        });
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('my/path');
        expect(toast.success).toHaveBeenCalled();
    });

    it('filterFiles: handles search (lines 170-187)', async () => {
        const files = [
            { name: 'foo.txt', path: 'foo.txt', is_dir: false },
            { name: 'bar.py', path: 'bar.py', is_dir: false },
            { name: 'folder', path: 'folder', is_dir: true, children: [
                { name: 'sub.txt', path: 'folder/sub.txt', is_dir: false }
            ]}
        ];
        mockStore.fetchWorkspaceFiles.mockResolvedValue(files);
        
        const { result } = renderHook(() => useWorkspace());
        
        await waitFor(() => expect(result.current.files.length).toBe(3));

        act(() => {
            result.current.setSearchTerm('py');
        });

        expect(result.current.filteredDocs.length).toBe(1);
        expect(result.current.filteredDocs[0].name).toBe('bar.py');
    });
});
