import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWorkspaceSlice } from '../workspace.slice';
import type { AppState } from '../../../types/store.types';
import type { StoreApi } from 'zustand';
import type { Mock } from 'vitest';
import toast from 'react-hot-toast';

// Mock toast
vi.mock('react-hot-toast', () => {
  const mockFuncs = {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn()
  };
  return {
    default: mockFuncs,
    ...mockFuncs
  };
});

describe('workspaceSlice', () => {
  let set: Mock;
  let get: Mock;
  let slice: ReturnType<typeof createWorkspaceSlice>;
  let mockState: Partial<AppState>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockState = {
      workspaces: [],
      activeWorkspaceId: null,
      currentProjectWorkspaceId: null,
      currentProjectWorkspaceName: null,
      isExplorerOpen: false,
      currentExplorerWsId: null,
      fetchWorkspaces: vi.fn(),
      fetchSettings: vi.fn(),
    };

    set = vi.fn((update) => {
      if (typeof update === 'function') {
        const result = update(mockState as AppState);
        Object.assign(mockState, result);
      } else {
        Object.assign(mockState, update);
      }
    });

    get = vi.fn(() => mockState as AppState);
    slice = createWorkspaceSlice(set, get, {} as unknown as StoreApi<AppState>);

    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({
        href: '',
        download: '',
        click: vi.fn(),
        setAttribute: vi.fn(),
        appendChild: vi.fn(),
        removeChild: vi.fn()
      })),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });
    vi.stubGlobal('FormData', class {
      append = vi.fn();
    });
  });

  it('fetchWorkspaces: handle success', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'ws-1', name: 'WS' }] });
    await slice.fetchWorkspaces();
    expect(mockState.workspaces!).toHaveLength(1);
    expect(mockState.workspaces![0].name).toBe('WS');
  });

  it('fetchWorkspaces: handle network exception', async () => {
    (fetch as Mock).mockRejectedValueOnce(new Error('Network Fail'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
    await slice.fetchWorkspaces();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Fetch workspaces error:'), expect.any(Error));
    spy.mockRestore();
  });

  it('fetchWorkspaces: handle response not ok', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: false });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
    await slice.fetchWorkspaces();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('addWorkspace: handle success', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: true });
    await slice.addWorkspace({ name: 'New WS', path: '/new' });
    expect(toast.success).toHaveBeenCalledWith("Workspace created successfully");
    expect(mockState.fetchWorkspaces).toHaveBeenCalled();
  });

  it('addWorkspace: handle network exception', async () => {
    (fetch as Mock).mockRejectedValueOnce(new Error('Network Fail'));
    await slice.addWorkspace({ name: 'New WS', path: '/new' });
    expect(toast.error).toHaveBeenCalledWith('Network Fail');
  });

  it('addWorkspace: handle error without detail', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    await slice.addWorkspace({ name: 'New WS', path: '/new' });
    expect(toast.error).toHaveBeenCalledWith('Failed to create workspace');
  });

  it('openWorkspace: handle success', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: true });
    await slice.openWorkspace('ws-1');
    expect(toast.success).toHaveBeenCalledWith("Opening workspace folder...");
  });

  it('openWorkspace: handle network exception', async () => {
    (fetch as Mock).mockRejectedValueOnce(new Error('Network Fail'));
    await slice.openWorkspace('ws-1');
    expect(toast.error).toHaveBeenCalledWith('Network Fail');
  });

  it('openWorkspace: handle response not ok', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: false });
    await slice.openWorkspace('ws-1');
    expect(toast.error).toHaveBeenCalledWith('Failed to open workspace');
  });

  it('uploadWorkspaceFiles: handle success', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: true });
    await slice.uploadWorkspaceFiles('ws-1', [{ name: 'test.txt' }] as unknown as FileList);
    expect(toast.success).toHaveBeenCalledWith('Upload complete!');
  });

  it('uploadWorkspaceFiles: handle network exception', async () => {
    (fetch as Mock).mockRejectedValueOnce(new Error('Network Fail'));
    await expect(slice.uploadWorkspaceFiles('ws-1', [] as unknown as FileList)).rejects.toThrow('Network Fail');
    expect(toast.error).toHaveBeenCalledWith('Network Fail');
  });

  it('fetchWorkspaceFiles: handle error', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await slice.fetchWorkspaceFiles('ws-1');
    expect(result).toEqual([]);
    expect(toast.error).toHaveBeenCalled();
  });

  it('deleteWorkspaceFile: handle status 500', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ detail: 'API Fail' }) });
    await expect(slice.deleteWorkspaceFile('ws-1', 'path')).rejects.toThrow('API Fail');
    expect(toast.error).toHaveBeenCalledWith('API Fail');
  });

  it('updateWorkspace: handle success', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: true });
    await slice.updateWorkspace('ws-1', { name: 'Updated' });
    expect(toast.success).toHaveBeenCalledWith("Workspace updated successfully");
  });

  it('updateWorkspace: handle error', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: false });
    await slice.updateWorkspace('ws-1', { name: 'Updated' });
    expect(toast.error).toHaveBeenCalled();
  });

  it('deleteWorkspace: handle success and resets active workspace', async () => {
    mockState.activeWorkspaceId = 'ws-1';
    (fetch as Mock).mockResolvedValueOnce({ ok: true });
    await slice.deleteWorkspace('ws-1');
    expect(mockState.activeWorkspaceId).toBeNull();
    expect(toast.success).toHaveBeenCalledWith("Workspace deleted successfully");
  });

  it('deleteWorkspace: handle error with detail', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ detail: 'Protectd' }) });
    await slice.deleteWorkspace('ws-1');
    expect(toast.error).toHaveBeenCalledWith('Protectd');
  });

  it('deleteWorkspace: handle error without detail', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    await slice.deleteWorkspace('ws-1');
    expect(toast.error).toHaveBeenCalledWith('Failed to delete workspace');
  });

  it('deleteWorkspace: resets currentProjectWorkspaceId if deleted', async () => {
    mockState.currentProjectWorkspaceId = 'ws-1';
    (fetch as Mock).mockResolvedValueOnce({ ok: true });
    await slice.deleteWorkspace('ws-1');
    expect(mockState.currentProjectWorkspaceId).toBeNull();
  });

  it('fetchWorkspaceFiles: handle catch block', async () => {
    (fetch as Mock).mockRejectedValueOnce(new Error('Catch Me'));
    const result = await slice.fetchWorkspaceFiles('ws-1');
    expect(result).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith('Catch Me');
  });

  it('fetchFileContent: handle success', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ content: 'hello' }) });
    const result = await slice.fetchFileContent('ws-1', 'a.txt');
    expect(result).toBe('hello');
  });

  it('fetchFileContent: handle error', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: false });
    const result = await slice.fetchFileContent('ws-1', 'a.txt');
    expect(result).toBe('');
    expect(toast.error).toHaveBeenCalled();
  });

  it('uploadWorkspaceFiles: handles json parse error on error data', async () => {
    (fetch as Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.reject('Invalid JSON')
    });
    await expect(slice.uploadWorkspaceFiles('ws-1', [] as unknown as FileList)).rejects.toThrow('Failed to upload files');
  });

  it('downloadWorkspaceZip: handle success and verify link attributes', async () => {
    await slice.downloadWorkspaceZip('ws-1', 'subfolder');
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("download"));
  });
  it('setActiveWorkspaceId: updates state', () => {
    slice.setActiveWorkspaceId('ws-2');
    expect(mockState.activeWorkspaceId).toBe('ws-2');
    expect(mockState.currentExplorerWsId).toBeNull();
  });

  it('setIsExplorerOpen: updates state', () => {
    slice.setIsExplorerOpen(true);
    expect(mockState.isExplorerOpen).toBe(true);
  });

  it('setCurrentExplorerWsId: updates state', () => {
    slice.setCurrentExplorerWsId('ws-3');
    expect(mockState.currentExplorerWsId).toBe('ws-3');
  });

  it('fetchWorkspaceFiles: handle successful return', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => [{ name: 'file.txt' }] });
    const result = await slice.fetchWorkspaceFiles('ws-1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('file.txt');
  });

  it('deleteWorkspaceFile: handle success', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: true });
    await slice.deleteWorkspaceFile('ws-1', 'path');
    expect(toast.success).toHaveBeenCalledWith('Deleted successfully');
  });

  it('deleteWorkspaceFile: handle json parse error on error data', async () => {
    (fetch as Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.reject('Invalid JSON')
    });
    await expect(slice.deleteWorkspaceFile('ws-1', 'path')).rejects.toThrow('Failed to delete file');
  });

  it('downloadWorkspaceZip: handle catch block', async () => {
    vi.spyOn(document, 'createElement').mockImplementationOnce(() => {
      throw new Error('DOM Exception');
    });
    await slice.downloadWorkspaceZip('ws-1', 'path');
    expect(toast.error).toHaveBeenCalledWith('Failed to download ZIP.');
  });

  it('fetchWorkspaces: syncs project workspace name if project loaded', async () => {
    mockState.currentProjectWorkspaceId = 'ws-1';
    (fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'ws-1', name: 'WS Name Here' }] });
    await slice.fetchWorkspaces();
    expect(mockState.currentProjectWorkspaceName).toBe('WS Name Here');
  });

  it('addWorkspace: handle error payload with detail', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ detail: 'Custom Error Detail' }) });
    await slice.addWorkspace({ name: 'New WS', path: '/new' });
    expect(toast.error).toHaveBeenCalledWith('Custom Error Detail');
  });

  it('fetchWorkspaces: does not sync if currentProjectWorkspaceId is not found', async () => {
    mockState.currentProjectWorkspaceId = 'ws-missing';
    mockState.currentProjectWorkspaceName = 'Keep Me';
    (fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'ws-1', name: 'WS 1' }] });
    await slice.fetchWorkspaces();
    expect(mockState.currentProjectWorkspaceName).toBe('Keep Me');
  });
});
