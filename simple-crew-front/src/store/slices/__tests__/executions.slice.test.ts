import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createExecutionSlice } from '../executions.slice';
import type { AppState } from '../../index';
import type { Execution, ChatMessage } from '../../../types/store.types';
import type { StoreApi } from 'zustand';
import type { Mock } from 'vitest';

describe('executionSlice', () => {
  let set: Mock;
  let get: Mock;
  let slice: ReturnType<typeof createExecutionSlice>;
  let mockState: Partial<AppState>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockState = {
      executions: [],
      currentExecution: null,
      isLoadingExecutions: false,
      loadProjectJson: vi.fn(),
      setMessages: vi.fn(),
      setIsChatVisible: vi.fn(),
      showNotification: vi.fn(),
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
    slice = createExecutionSlice(set, get, {} as unknown as StoreApi<AppState>);
    
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid'
    });
  });

  it('fetchExecutions: handle success', async () => {
    (fetch as Mock).mockResolvedValueOnce({ 
      ok: true, 
      json: async () => [{ id: 'exec-1', status: 'success' }] 
    });
    
    await slice.fetchExecutions('proj-1');
    
    expect(mockState.executions!).toHaveLength(1);
    expect(mockState.executions![0].id).toBe('exec-1');
    expect(mockState.isLoadingExecutions).toBe(false);
  });

  it('fetchExecutions: handle error', async () => {
    (fetch as Mock).mockRejectedValueOnce(new Error('Fetch failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    await slice.fetchExecutions('proj-1');
    
    expect(mockState.isLoadingExecutions).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('fetchExecutionDetails: handle success', async () => {
    const mockExecution = { id: 'exec-1', status: 'success', trigger_type: 'chat' };
    (fetch as Mock).mockResolvedValueOnce({ 
      ok: true, 
      json: async () => mockExecution 
    });
    
    const result = await slice.fetchExecutionDetails('exec-1');
    
    expect(result).toEqual(mockExecution);
    expect(mockState.currentExecution).toEqual(mockExecution);
  });

  it('reRunExecution: handle chat trigger', () => {
    const mockExecution = {
      id: 'exec-1',
      project_id: 'proj-1',
      timestamp: '2021-01-01',
      status: 'success',
      trigger_type: 'chat',
      input_data: { query: 'test' },
      graph_snapshot: { nodes: [], edges: [], version: '1.0' }
    } as unknown as Execution;

    slice.reRunExecution(mockExecution);

    expect(mockState.loadProjectJson).toHaveBeenCalledWith(mockExecution.graph_snapshot);
    expect(mockState.setMessages).toHaveBeenCalled();
    expect(mockState.setIsChatVisible).toHaveBeenCalledWith(true);
  });

  it('reRunExecution: handle webhook trigger', () => {
    const mockExecution = {
      id: 'exec-2',
      project_id: 'proj-1',
      timestamp: '2021-01-01',
      status: 'success',
      trigger_type: 'webhook',
      input_data: { data: 'test' },
      graph_snapshot: { nodes: [], edges: [], version: '1.0' }
    } as unknown as Execution;

    slice.reRunExecution(mockExecution);

    expect(mockState.loadProjectJson).toHaveBeenCalledWith(mockExecution.graph_snapshot);
    expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('Webhook snapshot loaded'), 'info');
  });

  it('fetchExecutions: returns early if no projectId', async () => {
    await slice.fetchExecutions('');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetchExecutionDetails: handle error and return null', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: false });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const result = await slice.fetchExecutionDetails('exec-err');
    
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('reRunExecution: handle chat trigger with string input_data and executes setMessages callback', () => {
    let internalMessages: ChatMessage[] = [];
    mockState.setMessages = vi.fn((updater) => {
        if (typeof updater === 'function') {
            internalMessages = updater([{ id: 'old', role: 'user', content: 'OLD' }] as ChatMessage[]);
        }
    });

    const mockExecution = {
      id: 'exec-3',
      project_id: 'proj-1',
      timestamp: '2021-01-01',
      status: 'success',
      trigger_type: 'chat',
      input_data: 'string input',
      graph_snapshot: null
    } as unknown as Execution;

    slice.reRunExecution(mockExecution);

    expect(mockState.loadProjectJson).not.toHaveBeenCalled();
    expect(mockState.setMessages).toHaveBeenCalled();
    expect(internalMessages).toHaveLength(2);
    expect(internalMessages[1].content).toContain('Re-running with input: string input');
  });

  it('fetchExecutions: handle non-ok server response branch', async () => {
    (fetch as Mock).mockResolvedValueOnce({ ok: false });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await slice.fetchExecutions('proj-1');

    expect(mockState.isLoadingExecutions).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
