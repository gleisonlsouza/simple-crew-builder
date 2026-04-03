import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createExecutionSlice } from '../executions.slice';

describe('executionSlice', () => {
  let set: any;
  let get: any;
  let slice: any;
  let mockState: any;

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
        const result = update(mockState);
        Object.assign(mockState, result);
      } else {
        Object.assign(mockState, update);
      }
    });
    
    get = vi.fn(() => mockState);
    slice = createExecutionSlice(set, get, {} as any);

    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid'
    });
  });

  it('fetchExecutions: handle success', async () => {
    (fetch as any).mockResolvedValueOnce({ 
      ok: true, 
      json: async () => [{ id: 'exec-1', status: 'success' }] 
    });
    
    await slice.fetchExecutions('proj-1');
    
    expect(mockState.executions).toHaveLength(1);
    expect(mockState.executions[0].id).toBe('exec-1');
    expect(mockState.isLoadingExecutions).toBe(false);
  });

  it('fetchExecutions: handle error', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Fetch failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    await slice.fetchExecutions('proj-1');
    
    expect(mockState.isLoadingExecutions).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('fetchExecutionDetails: handle success', async () => {
    const mockExecution = { id: 'exec-1', status: 'success', trigger_type: 'chat' };
    (fetch as any).mockResolvedValueOnce({ 
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
      status: 'success',
      trigger_type: 'chat',
      input_data: { query: 'test' },
      graph_snapshot: { nodes: [], edges: [] }
    };

    slice.reRunExecution(mockExecution);

    expect(mockState.loadProjectJson).toHaveBeenCalledWith(mockExecution.graph_snapshot);
    expect(mockState.setMessages).toHaveBeenCalled();
    expect(mockState.setIsChatVisible).toHaveBeenCalledWith(true);
  });

  it('reRunExecution: handle webhook trigger', () => {
    const mockExecution = {
      id: 'exec-2',
      status: 'success',
      trigger_type: 'webhook',
      input_data: { data: 'test' },
      graph_snapshot: { nodes: [], edges: [] }
    };

    slice.reRunExecution(mockExecution);

    expect(mockState.loadProjectJson).toHaveBeenCalledWith(mockExecution.graph_snapshot);
    expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('Webhook snapshot loaded'), 'info');
  });
});
