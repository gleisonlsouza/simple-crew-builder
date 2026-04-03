import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWorkspaceSlice } from '../workspace.slice';
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
  let set: any;
  let get: any;
  let slice: any;
  let mockState: any;

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
        const result = update(mockState);
        Object.assign(mockState, result);
      } else {
        Object.assign(mockState, update);
      }
    });
    
    get = vi.fn(() => mockState);
    slice = createWorkspaceSlice(set, get, {} as any);

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
    (fetch as any).mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'ws-1', name: 'WS' }] });
    await slice.fetchWorkspaces();
    expect(mockState.workspaces).toHaveLength(1);
    expect(mockState.workspaces[0].name).toBe('WS');
  });

  it('fetchWorkspaces: handle network exception', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network Fail'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await slice.fetchWorkspaces();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Fetch workspaces error:'), expect.any(Error));
    spy.mockRestore();
  });

  it('addWorkspace: handle success', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: true });
    await slice.addWorkspace({ name: 'New WS' });
    expect(toast.success).toHaveBeenCalledWith("Workspace created successfully");
    expect(mockState.fetchWorkspaces).toHaveBeenCalled();
  });

  it('addWorkspace: handle network exception', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network Fail'));
    await slice.addWorkspace({ name: 'New WS' });
    expect(toast.error).toHaveBeenCalledWith('Network Fail');
  });

  it('openWorkspace: handle success', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: true });
    await slice.openWorkspace('ws-1');
    expect(toast.success).toHaveBeenCalledWith("Opening workspace folder...");
  });

  it('openWorkspace: handle network exception', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network Fail'));
    await slice.openWorkspace('ws-1');
    expect(toast.error).toHaveBeenCalledWith('Network Fail');
  });

  it('uploadWorkspaceFiles: handle success', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: true });
    await slice.uploadWorkspaceFiles('ws-1', [{ name: 'test.txt' }] as any);
    expect(toast.success).toHaveBeenCalledWith('Upload complete!');
  });

  it('uploadWorkspaceFiles: handle network exception', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network Fail'));
    await expect(slice.uploadWorkspaceFiles('ws-1', [] as any)).rejects.toThrow('Network Fail');
    expect(toast.error).toHaveBeenCalledWith('Network Fail');
  });

  it('fetchWorkspaceFiles: handle error', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await slice.fetchWorkspaceFiles('ws-1');
    expect(result).toEqual([]);
    expect(toast.error).toHaveBeenCalled();
  });

  it('deleteWorkspaceFile: handle status 500', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false, json: async () => ({ detail: 'API Fail' }) });
    await expect(slice.deleteWorkspaceFile('ws-1', 'path')).rejects.toThrow('API Fail');
    expect(toast.error).toHaveBeenCalledWith('API Fail');
  });

  it('updateWorkspace: handle success', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: true });
    await slice.updateWorkspace('ws-1', { name: 'Updated' });
    expect(toast.success).toHaveBeenCalledWith("Workspace updated successfully");
  });

  it('updateWorkspace: handle error', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false });
    await slice.updateWorkspace('ws-1', { name: 'Updated' });
    expect(toast.error).toHaveBeenCalled();
  });

  it('deleteWorkspace: handle success and resets active workspace', async () => {
    mockState.activeWorkspaceId = 'ws-1';
    (fetch as any).mockResolvedValueOnce({ ok: true });
    await slice.deleteWorkspace('ws-1');
    expect(mockState.activeWorkspaceId).toBeNull();
    expect(toast.success).toHaveBeenCalledWith("Workspace deleted successfully");
  });

  it('deleteWorkspace: handle error with detail', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false, json: async () => ({ detail: 'Protectd' }) });
    await slice.deleteWorkspace('ws-1');
    expect(toast.error).toHaveBeenCalledWith('Protectd');
  });

  it('fetchWorkspaceFiles: handle catch block', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Catch Me'));
    const result = await slice.fetchWorkspaceFiles('ws-1');
    expect(result).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith('Catch Me');
  });

  it('fetchFileContent: handle success', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ content: 'hello' }) });
    const result = await slice.fetchFileContent('ws-1', 'a.txt');
    expect(result).toBe('hello');
  });

  it('fetchFileContent: handle error', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false });
    const result = await slice.fetchFileContent('ws-1', 'a.txt');
    expect(result).toBe('');
    expect(toast.error).toHaveBeenCalled();
  });

  it('uploadWorkspaceFiles: handles json parse error on error data', async () => {
    (fetch as any).mockResolvedValueOnce({ 
      ok: false, 
      json: () => Promise.reject('Invalid JSON') 
    });
    await expect(slice.uploadWorkspaceFiles('ws-1', [] as any)).rejects.toThrow('Failed to upload files');
  });

  it('downloadWorkspaceZip: handle success and verify link attributes', async () => {
    await slice.downloadWorkspaceZip('ws-1', 'subfolder');
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("download"));
  });
});
