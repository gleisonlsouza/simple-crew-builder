import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProjectSlice } from '../project.slice';

// Robust Mock for react-hot-toast (hoisted correctly)
vi.mock('react-hot-toast', () => {
    const m = {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(() => 'loading-id'),
    };
    return { ...m, default: m };
});

import toast from 'react-hot-toast';

// Mock helpers
vi.mock('../../store/helpers', () => ({
    migrateNodes: vi.fn(nodes => nodes),
    migrateEdges: vi.fn(edges => edges),
    validateDependencies: vi.fn(() => ({ migratedNodes: [], warnings: { 'n1': ['warning'] } })),
}));

describe('projectSlice - Elite Coverage Max', () => {
    let set: any;
    let get: any;
    let slice: any;
    let mockState: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockState = {
            nodes: [],
            edges: [],
            customTools: [],
            globalTools: [],
            mcpServers: [],
            models: [],
            savedProjects: [],
            workspaces: [{ id: 'ws-1', name: 'WS1' }, { id: 'ws-2', name: 'WS2' }],
            currentProjectId: null,
            currentProjectName: null,
            currentProjectDescription: null,
            currentProjectWorkspaceId: 'ws-1',
            executionResult: null,
            nodeStatuses: {},
            validateGraph: vi.fn(() => true),
            fetchProjects: vi.fn().mockResolvedValue(undefined),
            showNotification: vi.fn(),
            resetProject: vi.fn(),
            setNodeStatus: vi.fn((id, status) => { mockState.nodeStatuses[id] = status; }),
            fetchModels: vi.fn().mockResolvedValue(undefined),
            fetchMCPServers: vi.fn().mockResolvedValue(undefined),
            fetchCustomTools: vi.fn().mockResolvedValue(undefined),
            fetchCredentials: vi.fn().mockResolvedValue(undefined),
            fetchWorkspaces: vi.fn().mockResolvedValue(undefined),
            fetchSettings: vi.fn().mockResolvedValue(undefined),
            updateExecutionLog: vi.fn(),
        };

        set = vi.fn((update) => {
            if (typeof update === 'function') {
                const result = update(mockState);
                Object.assign(mockState, result);
                return;
            }
            Object.assign(mockState, update);
        });
        
        get = vi.fn(() => mockState);
        vi.stubGlobal('fetch', vi.fn());
        slice = createProjectSlice(set, get, {} as any);
        vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:url'), revokeObjectURL: vi.fn() });
        vi.stubGlobal('window', { URL: { createObjectURL: vi.fn(() => 'blob:url'), revokeObjectURL: vi.fn() } });
        vi.stubGlobal('TextDecoder', class { decode(val: any) { return val; } });
        vi.stubGlobal('document', {
            createElement: vi.fn(() => ({ 
                click: vi.fn(), 
                appendChild: vi.fn(), 
                removeChild: vi.fn(),
                setAttribute: vi.fn(),
                href: '',
                download: ''
            })),
            body: { appendChild: vi.fn(), removeChild: vi.fn() },
        });
    });

    // --- FULL PROJECT CYCLE ---
    it('handles project lifecycle (save, load, delete, metadata)', async () => {
        // 1. Create/Save
        (fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1', name: 'P1' }) });
        await slice.saveProject('P1', 'D1');
        expect(mockState.currentProjectId).toBe('p1');
        
        // 2. Metadata Update
        (fetch as any).mockResolvedValueOnce({ ok: true });
        await slice.updateProjectMetadata('p1', 'New P1', 'New D1');
        expect(mockState.currentProjectName).toBe('New P1');
        
        // 3. Duplicate
        (fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1', name: 'P1', canvas_data: { nodes: [] } }) });
        (fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1-copy', name: 'P1 (Copy)' }) });
        await slice.duplicateProject('p1');
        expect(toast.success).toHaveBeenCalledWith('Project duplicated successfully');
        
        // 4. Delete
        (fetch as any).mockResolvedValueOnce({ ok: true });
        await slice.deleteProject('p1');
        expect(toast.success).toHaveBeenCalledWith('Projeto removido.');
    });

    it('createNewProject: handles API success', async () => {
        (fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-id', name: 'New', canvas_data: { nodes: [], edges: [] } }) });
        const p = await slice.createNewProject('New', 'Desc');
        expect(p.id).toBe('new-id');
    });

    // --- EXPORT/IMPORT ---
    it('exportProjectJson: triggers download flow', () => {
        slice.exportProjectJson();
        expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('exportPythonProject: handles project export', async () => {
        mockState.currentProjectId = 'p1';
        (fetch as any).mockResolvedValueOnce({ ok: true, blob: async () => new Blob(['zip'], { type: 'application/zip' }) });
        await slice.exportPythonProject();
        expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('downloaded'), 'success');
    });

    it('loadProjectJson: handles and merges config', () => {
        const data = { nodes: [], edges: [], name: 'Import', mcpServers: [{ id: 'm1' }] };
        const result = slice.loadProjectJson(data);
        expect(result).toBe(true);
        expect(mockState.mcpServers).toHaveLength(1);
    });

    // --- EXECUTION ---
    it('startRealExecution: handles full success stream and returns result', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', name: 'Agent 1', data: {} }];
        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: JSON.stringify({ type: 'status', nodeId: 'n1', status: 'running' }), done: false })
                .mockResolvedValueOnce({ value: JSON.stringify({ type: 'final_result', result: 'Task Completed' }), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        (fetch as any).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } });
        
        const result = await slice.startRealExecution();
        expect(mockState.isConsoleExpanded).toBe(true);
        expect(mockState.executionResult).toBe('Task Completed');
        expect(result).toBe('Task Completed');
        expect(mockState.isExecuting).toBe(false);
    });

    it('startRealExecution: handles CrewAI specific payload format (final_output)', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', name: 'Agent 1', data: {} }];
        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: JSON.stringify({ type: 'final_result', final_output: 'CrewAI Response' }), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        (fetch as any).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } });
        
        const result = await slice.startRealExecution();
        expect(result).toBe('CrewAI Response');
        expect(mockState.executionResult).toBe('CrewAI Response');
    });

    it('startRealExecution: handles generic output field', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', name: 'Agent 1', data: {} }];
        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: JSON.stringify({ type: 'final_result', output: 'Generic Output' }), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        (fetch as any).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } });
        
        const result = await slice.startRealExecution();
        expect(result).toBe('Generic Output');
    });

    it('startRealExecution: handles user abortion and error events', async () => {
        // Test Error Event
        const mockReaderError = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: JSON.stringify({ type: 'error', error: 'Internal Error' }), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        (fetch as any).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReaderError } });
        
        // This should catch the error internally and show a notification
        await slice.startRealExecution();
        
        expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('Internal Error'), 'error');
    });

    it('stopExecution: clears state', () => {
        const abortCtrl = new AbortController();
        mockState.abortController = abortCtrl;
        slice.stopExecution();
        expect(mockState.isExecuting).toBe(false);
    });

    it('exportPythonProject: handles non-JSON errors', async () => {
        mockState.currentProjectId = 'p1';
        (fetch as any).mockResolvedValueOnce({ 
            ok: false, 
            status: 500,
            text: async () => 'Server Error Text'
        });
        await slice.exportPythonProject();
        expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('Server Error Text'), 'error');
    });

    it('importProjectJsonAndSave: handles valid and invalid data', async () => {
        const validData = { 
            nodes: [], 
            edges: [], 
            name: 'Imported', 
            workspaceId: 'ws-1',
            customTools: [],
            mcpServers: []
        };
        (fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-p1', ...validData, canvas_data: validData }) });
        
        const result = await slice.importProjectJsonAndSave(validData);
        expect(result.id).toBe('new-p1');
        expect(mockState.currentProjectWorkspaceId).toBe('ws-1');

        // Invalid data should throw/return null
        const invalidData = { nodes: 'not-an-array' };
        const resultNull = await slice.importProjectJsonAndSave(invalidData);
        expect(resultNull).toBeNull();
        expect(toast.error).toHaveBeenCalled();
    });

    it('startRealExecution: handles non-ok response from backend', async () => {
        (fetch as any).mockResolvedValueOnce({ 
            ok: false, 
            json: async () => ({ detail: 'Backend Overloaded' }) 
        });
        
        await slice.startRealExecution();
        expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('Backend Overloaded'), 'error');
    });

    it('startRealExecution: handles malformed JSON in stream', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: {} }];
        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: '{"type": "log", "data": "Valid Log"}\n{invalid-json}', done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        (fetch as any).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } });
        
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await slice.startRealExecution();
        
        expect(mockState.executionResult).toContain('Valid Log');
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
    });

    it('startRealExecution: handles stream done with active execution', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: {} }];
        
        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: JSON.stringify({ type: 'status', nodeId: 'n1', status: 'running' }), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        (fetch as any).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } });
                                                                                                  
        await slice.startRealExecution();
        expect(mockState.nodeStatuses['n1']).toBe('success');
        expect(mockState.isExecuting).toBe(false);
    });

    it('startRealExecution: handles explicit final_result event', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: {} }];
        
        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: JSON.stringify({ type: 'status', nodeId: 'n1', status: 'running' }), done: false })
                .mockResolvedValueOnce({ value: JSON.stringify({ type: 'final_result', result: 'Success Output' }), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        (fetch as any).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } });
                                                                                                  
        const res = await slice.startRealExecution();
        expect(res).toBe('Success Output');
        expect(mockState.nodeStatuses['n1']).toBe('success');
    });

    it('startRealExecution: handles explicit done event', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: {} }];
        
        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: JSON.stringify({ type: 'status', nodeId: 'n1', status: 'running' }), done: false })
                .mockResolvedValueOnce({ value: JSON.stringify({ type: 'done' }), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        (fetch as any).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } });
                                                                                                  
        await slice.startRealExecution();
        expect(mockState.nodeStatuses['n1']).toBe('success');
    });

    it('startRealExecution: handles explicit error event from backend', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: {} }];
        
        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: JSON.stringify({ type: 'status', nodeId: 'n1', status: 'running' }), done: false })
                .mockResolvedValueOnce({ value: JSON.stringify({ type: 'error', error: 'Backend Crash' }), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        (fetch as any).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } });
                                                                                                  
        await slice.startRealExecution();
        expect(mockState.nodeStatuses['n1']).toBe('error');
    });

    it('startRealExecution: handles unexpected response body (null reader)', async () => {
        (fetch as any).mockResolvedValueOnce({ ok: true, body: null });
        
        await slice.startRealExecution();
        expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('Stream API não suportado'), 'error');
    });

    it('startRealExecution: handles network error during stream', async () => {
        const mockReader = {
            read: vi.fn().mockRejectedValue(new Error('Network Lost')),
        };
        (fetch as any).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } });
                                                                                                  
        await slice.startRealExecution();
        expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('Network Lost'), 'error');
    });

    it('startRealExecution: handles abort during stream', async () => {
        const mockReader = {
            read: vi.fn().mockRejectedValue({ name: 'AbortError' }),
        };
        (fetch as any).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } });
                                                                                                  
        await slice.startRealExecution();
        expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('interrompido'), 'warning');
    });

    it('fetchProjects: updates savedProjects on success', async () => {
        const mockProjects = [{ id: 'p1', name: 'P1' }];
        (fetch as any).mockResolvedValueOnce({ 
            ok: true, 
            json: async () => mockProjects 
        });
        
        await slice.fetchProjects();
        expect(mockState.savedProjects).toEqual(mockProjects);
    });

    it('saveProject: handles creation of new project', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: { name: 'A1', role: 'R', goal: 'G', backstory: 'B' } }];
        mockState.validateGraph = vi.fn().mockReturnValue(true);
        const newProject = { id: 'p2', name: 'New' };
        
        (fetch as any).mockResolvedValueOnce({ 
            ok: true, 
            json: async () => newProject 
        });
        
        await slice.saveProject('New', 'Desc');
        expect(mockState.currentProjectId).toBe('p2');
        expect(toast.success).toHaveBeenCalled();
    });

    it('deleteProject: removes project and resets if current', async () => {
        mockState.savedProjects = [{ id: 'p1' }];
        mockState.currentProjectId = 'p1';
        mockState.fetchProjects = vi.fn().mockImplementation(async () => {
            mockState.savedProjects = [];
        });
        mockState.resetProject = vi.fn(() => { mockState.currentProjectId = null; });
        (fetch as any).mockResolvedValueOnce({ ok: true });
        
        await slice.deleteProject('p1');
        expect(mockState.savedProjects).toHaveLength(0);
        expect(mockState.currentProjectId).toBeNull();
    });

    it('fetchProjects: handles network error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (fetch as any).mockRejectedValueOnce(new Error('Network Fail'));
        
        await slice.fetchProjects();
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('saveProject: blocks save if graph is invalid', async () => {
        mockState.validateGraph = vi.fn().mockReturnValue(false);
        await slice.saveProject('P', 'D');
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('fix the errors'));
    });

    it('updateProjectWorkspaceId: handles null workspace', () => {
        slice.updateProjectWorkspaceId(null);
        expect(mockState.currentProjectWorkspaceId).toBeNull();
        expect(mockState.currentProjectWorkspaceName).toBeNull();
    });



    it('saveProject: handles server error', async () => {
        mockState.validateGraph = vi.fn().mockReturnValue(true);
        mockState.nodes = [{ id: 'n1', type: 'agent', data: { name: 'A', role: 'R', goal: 'G', backstory: 'B' } }];
        (fetch as any).mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ detail: 'Save failed' }) });
        
        await slice.saveProject('P', 'D');
        expect(toast.error).toHaveBeenCalled();
    });

    it('loadProjectJson: handles valid data', () => {
        const data = { nodes: [], edges: [], version: '1.0' };
        const result = slice.loadProjectJson(data);
        expect(result).toBe(true);
        expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('successfully'), 'success');
    });

    it('startRealExecution: handles final_result event', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: {} }];
        
        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: JSON.stringify({ type: 'status', nodeId: 'n1', status: 'running' }), done: false })
                .mockResolvedValueOnce({ value: JSON.stringify({ type: 'final_result', result: 'Success' }), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        (fetch as any).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } });
                                                                                                  
        const res = await slice.startRealExecution();
        expect(res).toBe('Success');
        expect(mockState.isExecuting).toBe(false);
    });
    it('saveProject: updates existing project via PATCH', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'p-1' }) });
        globalThis.fetch = fetchMock;
        mockState.currentProjectId = 'p-1';
        mockState.validateGraph = vi.fn().mockReturnValue(true);
        mockState.nodes = [{ id: 'n1', type: 'agent', data: { name: 'A', role: 'R', goal: 'G', backstory: 'B' } }];
        
        await slice.saveProject('P', 'D');
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/projects/p-1'), expect.objectContaining({ method: 'PATCH' }));
    });

    it('exportPythonProject: fails if no project ID', async () => {
        mockState.currentProjectId = null;
        await slice.exportPythonProject();
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('save the project'));
    });

    it('loadProjectJson: handles invalid format', () => {
        const result = slice.loadProjectJson(null);
        expect(result).toBe(false);
    });

    it('updateProjectMetadata: handles API error', async () => {
        (fetch as any).mockResolvedValueOnce({ ok: false });
        await slice.updateProjectMetadata('p1', 'N', 'D');
        expect(toast.error).toHaveBeenCalledWith('Error updating project');
    });

    it('loadProject: merges project tools into state', async () => {
        const projectData = { 
            id: 'p1', 
            workspace_id: 'ws-1',
            canvas_data: { 
                nodes: [], 
                edges: [], 
                customTools: [{ id: 'new-tool-1', name: 'New' }] 
            } 
        };
        (fetch as any).mockResolvedValueOnce({ ok: true, json: async () => projectData });
        mockState.customTools = [{ id: 'old-tool', name: 'Old' }];
        
        await slice.loadProject('p1');
        expect(mockState.customTools).toHaveLength(2);
        expect(mockState.customTools.some((t: any) => t.id === 'new-tool-1')).toBe(true);
    });

    // --- HYDRATION TIME TRAVEL ---
    it('setDirty: updates flag', () => {
        slice.setDirty(true);
        expect(mockState.isDirty).toBe(true);
        slice.setDirty(false);
        expect(mockState.isDirty).toBe(false);
    });

    it('hydrateFromSnapshot: sets dirty flag, unwraps nodes/edges, clears chat, points to execution project', () => {
        // Prepare initial dirty state
        mockState.messages = [{ id: '1', role: 'user', content: 'hello' }];
        mockState.isDirty = false;
        mockState.currentProjectId = 'live-project-id';

        const snapshot = {
            nodes: [{ id: 'snap-n1', type: 'agent', data: {} }],
            edges: [{ id: 'snap-e1', source: 'snap-n1', target: 'snap-n2' }],
            workspaceId: 'ws-2'
        };

        slice.hydrateFromSnapshot('snapshot-project-id', snapshot);

        // Asserts
        expect(mockState.currentProjectId).toBe('snapshot-project-id');
        expect(mockState.nodes).toHaveLength(1);
        expect(mockState.nodes[0].id).toBe('snap-n1');
        expect(mockState.edges).toHaveLength(1);
        expect(mockState.isDirty).toBe(true); // Forces user to save a new version
        expect(mockState.currentProjectWorkspaceId).toBe('ws-2');
        expect(mockState.currentProjectWorkspaceName).toBe('WS2');
        
        // Chat should be cleared (messages reset to INITIAL array or just different from hello)
        expect(mockState.messages).not.toContainEqual({ id: '1', role: 'user', content: 'hello' });
    });

    it('hydrateFromSnapshot: falls back gracefully when workspace is missing or unknown', () => {
        slice.hydrateFromSnapshot('snapshot-2', { nodes: [], edges: [] });
        expect(mockState.currentProjectWorkspaceId).toBeNull();
        expect(mockState.currentProjectWorkspaceName).toBeNull();
        expect(mockState.isDirty).toBe(true);
    });
});
