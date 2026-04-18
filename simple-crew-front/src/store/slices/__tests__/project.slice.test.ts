import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createProjectSlice } from '../project.slice';
import type {
    AppState,
    ProjectSlice,
    NodeStatus,
    ExportedProject,
    Project,
    Workspace
} from '../../../types/store.types';
import type { AppNode, AppEdge, AgentNodeData, TaskNodeData } from '../../../types/nodes.types';
import type { MCPServer, CustomTool, ToolConfig } from '../../../types/config.types';
import type { StoreApi } from 'zustand';

const MOCK_AGENT_DATA: AgentNodeData = { name: 'A', role: 'R', goal: 'G', backstory: 'B' };
const MOCK_TASK_DATA: TaskNodeData = { name: 'T', description: 'D', expected_output: 'O' };

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
    let set: Mock;
    let get: Mock;
    let slice: ProjectSlice;
    let mockState: AppState;

    beforeEach(() => {
        vi.clearAllMocks();

        mockState = {
            nodes: [],
            edges: [],
            customTools: [],
            globalTools: [],
            mcpServers: [],
            models: [],
            credentials: [],
            savedProjects: [],
            workspaces: [
                { id: 'ws-1', name: 'WS1', path: '/path/1' },
                { id: 'ws-2', name: 'WS2', path: '/path/2' }
            ],
            currentProjectId: null,
            currentProjectName: null,
            currentProjectDescription: null,
            currentProjectWorkspaceId: 'ws-1',
            currentProjectWorkspaceName: 'WS1',
            activeWorkspaceId: 'ws-1',
            isSaving: false,
            isExecuting: false,
            isDirty: false,
            abortController: null,
            executionResult: null,
            nodeStatuses: {},
            nodeErrors: {},
            nodeWarnings: {},
            activeNodeId: null,
            messages: [],
            theme: 'dark',
            isSettingsOpen: false,
            isConsoleOpen: false,
            isConsoleExpanded: false,
            isUsabilityDrawerOpen: false,
            isChatVisible: false,
            notification: null,
            systemAiModelId: null,
            embeddingModelId: null,
            defaultModel: 'gpt-4o',
            isLoadingExecutions: false,
            executions: [],
            currentExecution: null,

            // Functions
            resetExecutionVisuals: vi.fn(),
            finalizeExecutionVisuals: vi.fn(),
            clearDimmedState: vi.fn(),
            applyAutoLayout: vi.fn(),
            setDirty: vi.fn(),
            validateGraph: vi.fn(() => true),
            fetchProjects: vi.fn().mockResolvedValue(undefined),
            showNotification: vi.fn(),
            resetProject: vi.fn(),
            setNodeStatus: vi.fn((id: string, status: NodeStatus) => {
                mockState.nodeStatuses[id] = status;
            }),
            fetchModels: vi.fn().mockResolvedValue(undefined),
            fetchMCPServers: vi.fn().mockResolvedValue(undefined),
            fetchCustomTools: vi.fn().mockResolvedValue(undefined),
            fetchCredentials: vi.fn().mockResolvedValue(undefined),
            fetchWorkspaces: vi.fn().mockResolvedValue(undefined),
            fetchSettings: vi.fn().mockResolvedValue(undefined),
            updateExecutionLog: vi.fn(),
            onNodesChange: vi.fn(),
            onEdgesChange: vi.fn(),
            onConnect: vi.fn(),
            deleteEdge: vi.fn(),
            deleteNode: vi.fn(),
            updateNodeData: vi.fn(),
            addNode: vi.fn(),
            addNodeWithAutoPosition: vi.fn(),
            setNodeWarnings: vi.fn(),
            setActiveNode: vi.fn(),
            toggleCollapse: vi.fn(),
            updateCrewAgentOrder: vi.fn(),
            updateCrewTaskOrder: vi.fn(),
            updateAgentTaskOrder: vi.fn(),
            setExecutionResult: vi.fn(),
            setMessages: vi.fn(),
            clearChat: vi.fn(),
            toggleTheme: vi.fn(),
            setIsSettingsOpen: vi.fn(),
            setIsConsoleOpen: vi.fn(),
            setIsConsoleExpanded: vi.fn(),
            setIsUsabilityDrawerOpen: vi.fn(),
            setIsChatVisible: vi.fn(),
            resetUIState: vi.fn(),
            clearNotification: vi.fn(),
            addCredential: vi.fn(),
            updateCredential: vi.fn(),
            deleteCredential: vi.fn(),
            addModel: vi.fn(),
            duplicateModel: vi.fn(),
            updateModel: vi.fn(),
            deleteModel: vi.fn(),
            setDefaultModelConfig: vi.fn(),
            setSystemAiModelId: vi.fn(),
            setEmbeddingModelId: vi.fn(),
            setDefaultModel: vi.fn(),
            updateToolConfig: vi.fn(),
            addCustomTool: vi.fn(),
            updateCustomTool: vi.fn(),
            deleteCustomTool: vi.fn(),
            addMCPServer: vi.fn(),
            updateMCPServer: vi.fn(),
            deleteMCPServer: vi.fn(),
            updateSettings: vi.fn(),
            addWorkspace: vi.fn(),
            updateWorkspace: vi.fn(),
            deleteWorkspace: vi.fn(),
            openWorkspace: vi.fn(),
            setActiveWorkspaceId: vi.fn(),
            setIsExplorerOpen: vi.fn(),
            setCurrentExplorerWsId: vi.fn(),
            fetchWorkspaceFiles: vi.fn(),
            fetchFileContent: vi.fn(),
            uploadWorkspaceFiles: vi.fn(),
            deleteWorkspaceFile: vi.fn(),
            downloadWorkspaceZip: vi.fn(),
            suggestAiContent: vi.fn(),
            suggestBulkAiContent: vi.fn(),
            suggestTaskBulkAiContent: vi.fn(),
            fetchExecutions: vi.fn(),
            fetchExecutionDetails: vi.fn(),
            reRunExecution: vi.fn(),
        } as unknown as AppState;

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
        // Fix for StoreApi types in constructor
        slice = createProjectSlice(set, get, {} as unknown as StoreApi<AppState>);
        vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:url'), revokeObjectURL: vi.fn() });
        vi.stubGlobal('window', { URL: { createObjectURL: vi.fn(() => 'blob:url'), revokeObjectURL: vi.fn() } });
        // Use native TextDecoder to avoid recursion and handle polyfill if needed
        const RealDecoder = globalThis.TextDecoder;
        vi.stubGlobal('TextDecoder', class { 
            decode(val: any, options?: any) { 
                return new RealDecoder().decode(val, options); 
            } 
        });
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
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1', name: 'P1' }) } as unknown as Response);
        await slice.saveProject('P1', 'D1');
        expect(mockState.currentProjectId).toBe('p1');

        // 2. Metadata Update
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as unknown as Response);
        await slice.updateProjectMetadata('p1', 'New P1', 'New D1');
        expect(mockState.currentProjectName).toBe('New P1');

        // 3. Duplicate
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1', name: 'P1', canvas_data: { nodes: [] } }) } as unknown as Response);
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1-copy', name: 'P1 (Copy)' }) } as unknown as Response);
        await slice.duplicateProject('p1');
        expect(toast.success).toHaveBeenCalledWith('Project duplicated successfully');

        // 4. Delete
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as unknown as Response);
        await slice.deleteProject('p1');
        expect(toast.success).toHaveBeenCalledWith('Projeto removido.');
    });

    it('createNewProject: handles API success', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-id', name: 'New', canvas_data: { nodes: [], edges: [] } }) } as unknown as Response);
        const p = await slice.createNewProject('New', 'Desc');
        expect(p?.id).toBe('new-id');
    });

    // --- EXPORT/IMPORT ---
    it('exportProjectJson: triggers download flow', () => {
        slice.exportProjectJson();
        expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('exportPythonProject: handles project export', async () => {
        mockState.currentProjectId = 'p1';
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, blob: async () => new Blob(['zip'], { type: 'application/zip' }) } as unknown as Response);
        await slice.exportPythonProject();
        expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('downloaded'), 'success');
    });

    it('startRealExecution: handles CrewAI specific payload format (final_output)', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: MOCK_AGENT_DATA, position: { x: 0, y: 0 } } as AppNode];
        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'final_result', final_output: 'CrewAI Response' }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } } as unknown as Response);

        const result = await slice.startRealExecution();
        expect(result).toBe('CrewAI Response');
        expect(mockState.executionResult).toBe('CrewAI Response');
    });

    it('startRealExecution: handles generic output field', async () => {
        mockState.nodes = [{ id: 'n2', type: 'task', data: MOCK_TASK_DATA, position: { x: 0, y: 0 } } as AppNode];
        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'final_result', output: 'Generic Output' }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } } as unknown as Response);

        const result = await slice.startRealExecution();
        expect(result).toBe('Generic Output');
    });

    it('startRealExecution: handles user abortion and error events', async () => {
        // Test Error Event
        const mockReaderError = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'error', error: 'Internal Error' }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReaderError } } as unknown as Response);

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
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: async () => 'Server Error Text'
        } as unknown as Response);
        await slice.exportPythonProject();
        expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('Server Error Text'), 'error');
    });

    it('loadProjectJson: handles and merges config', () => {
        const data = { nodes: [], edges: [], name: 'Import', mcpServers: [{ id: 'm1' }], version: '1.0' };
        const result = slice.loadProjectJson(data as unknown as ExportedProject);
        expect(result).toBe(true);
        expect(mockState.mcpServers).toHaveLength(1);
    });

    it('importProjectJsonAndSave: handles valid and invalid data', async () => {
        const validData = {
            nodes: [],
            edges: [],
            name: 'Imported',
            workspaceId: 'ws-1',
            customTools: [],
            mcpServers: [],
            version: '1.0'
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-p1', ...validData, canvas_data: validData }) } as unknown as Response);

        const result = await slice.importProjectJsonAndSave(validData as unknown as ExportedProject);
        expect(result?.id).toBe('new-p1');
        expect(mockState.currentProjectWorkspaceId).toBe('ws-1');

        // Invalid data should throw/return null
        const invalidData = { nodes: 'not-an-array' };
        const resultNull = await slice.importProjectJsonAndSave(invalidData as unknown as ExportedProject);
        expect(resultNull).toBeNull();
        expect(toast.error).toHaveBeenCalled();
    });

    it('startRealExecution: handles non-ok response from backend', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ detail: 'Backend Overloaded' })
        } as unknown as Response);

        await slice.startRealExecution();
        expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('Backend Overloaded'), 'error');
    });

    it('startRealExecution: handles malformed JSON in stream', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: MOCK_AGENT_DATA, position: { x: 0, y: 0 } } as AppNode];
        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode('{"type": "log", "data": "Valid Log"}\n{invalid-json}'), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } } as unknown as Response);

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        await slice.startRealExecution();

        expect(mockState.executionResult).toContain('Valid Log');
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
    });

    it('startRealExecution: handles stream done with active execution', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: MOCK_AGENT_DATA, position: { x: 0, y: 0 } } as AppNode];

        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'status', nodeId: 'n1', status: 'running' }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } } as unknown as Response);

        await slice.startRealExecution();
        expect(mockState.nodeStatuses['n1']).toBe('success');
        expect(mockState.isExecuting).toBe(false);
    });

    it('startRealExecution: handles explicit final_result event', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: MOCK_AGENT_DATA, position: { x: 0, y: 0 } } as AppNode];

        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'status', nodeId: 'n1', status: 'running' }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'final_result', result: 'Success Output' }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } } as unknown as Response);

        const res = await slice.startRealExecution();
        expect(res).toBe('Success Output');
        expect(mockState.nodeStatuses['n1']).toBe('success');
    });

    it('startRealExecution: handles explicit done event', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: MOCK_AGENT_DATA, position: { x: 0, y: 0 } } as AppNode];

        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'status', nodeId: 'n1', status: 'running' }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'done' }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } } as unknown as Response);

        await slice.startRealExecution();
        expect(mockState.nodeStatuses['n1']).toBe('success');
    });

    it('startRealExecution: handles explicit error event from backend', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: MOCK_AGENT_DATA, position: { x: 0, y: 0 } } as AppNode];

        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'status', nodeId: 'n1', status: 'running' }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'error', error: 'Backend Crash' }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } } as unknown as Response);

        await slice.startRealExecution();
        expect(mockState.nodeStatuses['n1']).toBe('error');
    });

    it('startRealExecution: handles unexpected response body (null reader)', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, body: null } as unknown as Response);

        await slice.startRealExecution();
        expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('Stream API não suportado'), 'error');
    });

    it('startRealExecution: handles network error during stream', async () => {
        const mockReader = {
            read: vi.fn().mockRejectedValue(new Error('Network Lost')),
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } } as unknown as Response);

        await slice.startRealExecution();
        expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('Network Lost'), 'error');
    });

    it('startRealExecution: handles abort during stream', async () => {
        const mockReader = {
            read: vi.fn().mockRejectedValue({ name: 'AbortError' }),
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } } as unknown as Response);

        await slice.startRealExecution();
        expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('interrompido'), 'warning');
    });

    it('fetchProjects: updates savedProjects on success', async () => {
        const mockProjects = [{ id: 'p1', name: 'P1' }] as unknown as Project[];
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => mockProjects
        } as unknown as Response);

        await slice.fetchProjects();
        expect(mockState.savedProjects).toEqual(mockProjects);
    });

    it('saveProject: handles creation of new project', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: MOCK_AGENT_DATA, position: { x: 0, y: 0 } } as AppNode];
        mockState.validateGraph = vi.fn().mockReturnValue(true);
        const newProject = { id: 'p2', name: 'New' };

        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => newProject
        } as unknown as Response);

        await slice.saveProject('New', 'Desc');
        expect(mockState.currentProjectId).toBe('p2');
        expect(toast.success).toHaveBeenCalled();
    });

    it('deleteProject: removes project and resets if current', async () => {
        mockState.savedProjects = [{ id: 'p1' } as unknown as Project];
        mockState.currentProjectId = 'p1';
        mockState.fetchProjects = vi.fn().mockImplementation(async () => {
            mockState.savedProjects = [];
        });
        mockState.resetProject = vi.fn(() => { mockState.currentProjectId = null; });
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as unknown as Response);

        await slice.deleteProject('p1');
        expect(mockState.savedProjects).toHaveLength(0);
        expect(mockState.currentProjectId).toBeNull();
    });

    it('fetchProjects: handles network error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.mocked(fetch).mockRejectedValueOnce(new Error('Network Fail'));

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
        mockState.nodes = [{ id: 'n1', type: 'agent', data: MOCK_AGENT_DATA, position: { x: 0, y: 0 } } as AppNode];
        vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ detail: 'Save failed' }) } as unknown as Response);

        await slice.saveProject('P', 'D');
        expect(toast.error).toHaveBeenCalled();
    });

    it('loadProjectJson: handles valid data', () => {
        const data = { nodes: [], edges: [], version: '1.0' };
        const result = slice.loadProjectJson(data as unknown as ExportedProject);
        expect(result).toBe(true);
        expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('successfully'), 'success');
    });

    it('startRealExecution: handles final_result event', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: MOCK_AGENT_DATA, position: { x: 0, y: 0 } } as AppNode];

        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'status', nodeId: 'n1', status: 'running' }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'final_result', result: 'Success' }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } } as unknown as Response);

        const res = await slice.startRealExecution();
        expect(res).toBe('Success');
        expect(mockState.isExecuting).toBe(false);
    });

    it('saveProject: updates existing project via PATCH', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'p-1' }) });
        globalThis.fetch = fetchMock;
        mockState.currentProjectId = 'p-1';
        mockState.validateGraph = vi.fn().mockReturnValue(true);
        mockState.nodes = [{ id: 'n1', type: 'agent', data: MOCK_AGENT_DATA, position: { x: 0, y: 0 } } as AppNode];

        await slice.saveProject('P', 'D');
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/projects/p-1'), expect.objectContaining({ method: 'PATCH' }));
    });

    it('exportPythonProject: fails if no project ID', async () => {
        mockState.currentProjectId = null;
        await slice.exportPythonProject();
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('save the project'));
    });

    it('loadProjectJson: handles invalid format', () => {
        const result = slice.loadProjectJson(null as unknown as ExportedProject);
        expect(result).toBe(false);
    });

    it('updateProjectMetadata: handles API error', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as unknown as Response);
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
                customTools: [{ id: 'new-tool-1', name: 'New', description: 'Desc', code: 'print()' } as unknown as CustomTool]
            }
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => projectData } as unknown as Response);
        mockState.customTools = [{ id: 'old-tool', name: 'Old', description: 'Old', code: 'print()' } as unknown as CustomTool];

        await slice.loadProject('p1');
        expect(mockState.customTools).toHaveLength(2);
        expect(mockState.customTools.some((t: CustomTool) => t.id === 'new-tool-1')).toBe(true);
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
            nodes: [{ id: 'snap-n1', type: 'agent', data: MOCK_AGENT_DATA, position: { x: 0, y: 0 } } as AppNode],
            edges: [{ id: 'snap-e1', source: 'snap-n1', target: 'snap-n2' } as AppEdge],
            workspaceId: 'ws-2',
            version: '1.0'
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
        slice.hydrateFromSnapshot('snapshot-2', { nodes: [], edges: [], version: '1.0' });
        expect(mockState.currentProjectWorkspaceId).toBeNull();
        expect(mockState.currentProjectWorkspaceName).toBeNull();
        expect(mockState.isDirty).toBe(true);
    });

    // --- STAGE 1: JSON Import Edge Cases & Catch Blocks ---
    it('loadProjectJson: merges NEW mcp servers and tools (lines 407, 413)', () => {
        mockState.mcpServers = [{ id: 'existing-mcp', name: 'M1', transportType: 'stdio' } as unknown as MCPServer];
        mockState.customTools = [{ id: 'existing-tool', name: 'T1', description: 'D1', code: 'C1' } as unknown as CustomTool];

        const data = {
            nodes: [],
            edges: [],
            mcpServers: [{ id: 'existing-mcp' }, { id: 'new-mcp' }],
            customTools: [{ id: 'existing-tool' }, { id: 'new-tool' }],
            version: '1.0'
        };

        slice.loadProjectJson(data as unknown as ExportedProject);

        expect(mockState.mcpServers).toHaveLength(2);
        expect(mockState.mcpServers.some((m: MCPServer) => m.id === 'new-mcp')).toBe(true);
        expect(mockState.customTools).toHaveLength(2);
        expect(mockState.customTools.some((t: CustomTool) => t.id === 'new-tool')).toBe(true);
    });

    it('loadProjectJson: catch block reached on invalid data (lines 455-456)', () => {
        const data = {
            nodes: [],
            edges: [],
            version: '1.0'
        };

        const getSpy = vi.spyOn(mockState, 'mcpServers', 'get').mockImplementation(() => {
            throw new Error('Force Catch');
        });

        const result = slice.loadProjectJson(data as unknown as ExportedProject);
        expect(result).toBe(false);
        expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('Invalid file'), 'error');
        getSpy.mockRestore();
    });

    it('importProjectJsonAndSave: catch block (lines 496-497)', async () => {
        // Triggering an error in the try block
        vi.mocked(fetch).mockImplementationOnce(() => { throw new Error('Network Blast'); });

        const data = { nodes: [], edges: [], name: 'Import' };
        const result = await slice.importProjectJsonAndSave(data as unknown as ExportedProject);

        expect(result).toBeNull();
        expect(toast.error).toHaveBeenCalledWith('Network Blast');
    });

    // --- STAGE 2: Execution Stream - Logs & ANSI ---
    it('startRealExecution: strips ANSI and accumulates logs (lines 573-576)', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: MOCK_AGENT_DATA, position: { x: 0, y: 0 } } as AppNode];
        const ansiLog = '\u001b[31mRed Error\u001b[0m';
        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'heartbeat' }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'log', data: ansiLog }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'log', data: ' - Plain Text' }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } } as unknown as Response);

        await slice.startRealExecution();

        // Should ignore heartbeat and strip ANSI from "Red Error" -> "Red Error"
        // Also accumulate "Red Error" + " - Plain Text"
        expect(mockState.executionResult).toBe('Red Error - Plain Text');
    });

    // --- STAGE 3: Execution Stream - Complex Final Results ---
    it('startRealExecution: handles complex serializing in final_result (lines 583-587)', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: MOCK_AGENT_DATA, position: { x: 0, y: 0 } } as AppNode];

        // Test Case 1: JSON Object Result
        const jsonResult = { status: 'complete', id: 123 };
        const mockReader1 = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'final_result', result: jsonResult }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader1 } } as unknown as Response);
        await slice.startRealExecution();
        expect(mockState.executionResult).toBe(JSON.stringify(jsonResult, null, 2));

        // Test Case 2: Null/Undefined Result
        const mockReader2 = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'final_result', result: null }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader2 } } as unknown as Response);
        await slice.startRealExecution();
        expect(mockState.executionResult).toBe('');
    });

    // --- STAGE 4: Execution Stream - Error Handling ---
    it('startRealExecution: handles malformed API error response (lines 538-545)', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            json: async () => { throw new Error('Not JSON'); }
        } as unknown as Response);

        await slice.startRealExecution();
        expect(mockState.showNotification).toHaveBeenCalledWith(expect.stringContaining('Erro inesperado'), 'error');
    });

    it('startRealExecution: handles explicit error event (lines 601-606)', async () => {
        mockState.nodes = [{ id: 'n1', type: 'agent', data: MOCK_AGENT_DATA, position: { x: 0, y: 0 } } as AppNode];
        const mockReader = {
            read: vi.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'status', nodeId: 'n1', status: 'running' }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: new TextEncoder().encode(JSON.stringify({ type: 'error', error: 'Stream Crash' }) + '\n'), done: false })
                .mockResolvedValueOnce({ value: null, done: true }),
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, body: { getReader: () => mockReader } } as unknown as Response);

        await slice.startRealExecution();
        expect(mockState.nodeStatuses['n1']).toBe('error');
        expect(mockState.showNotification).toHaveBeenCalledWith('Falha na API Inteligente: Stream Crash', 'error');
    });

    // --- PHASE 1 Coverage Improvement ---
    it('loadProject: merges new MCP servers (line 165)', async () => {
        const projectData = {
            id: 'p1',
            canvas_data: {
                nodes: [],
                edges: [],
                mcpServers: [{ id: 'new-mcp-1' }]
            }
        };
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => projectData } as unknown as Response);
        mockState.mcpServers = [{ id: 'existing-mcp' }] as unknown as MCPServer[];

        await slice.loadProject('p1');
        expect(mockState.mcpServers).toHaveLength(2);
        expect(mockState.mcpServers.some((m: MCPServer) => m.id === 'new-mcp-1')).toBe(true);
    });

    it('loadProject: handles catch block (line 208)', async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error('Load Failed'));
        await slice.loadProject('p-error');
        expect(toast.error).toHaveBeenCalledWith('Load Failed');
    });

    it('deleteProject: handles catch block (line 226)', async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error('Delete Failed'));
        await slice.deleteProject('p-error');
        expect(toast.error).toHaveBeenCalledWith('Delete Failed');
    });

    it('exportPythonProject: handles JSON error with detail (line 368)', async () => {
        mockState.currentProjectId = 'p1';
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ detail: 'Custom Backend Error' })
        } as unknown as Response);

        await slice.exportPythonProject();
        expect(mockState.showNotification).toHaveBeenCalledWith('Export failed: Custom Backend Error', 'error');
    });

    it('loadProjectJson: warns if workspace not found locally (line 432)', () => {
        const data = {
            nodes: [],
            edges: [],
            workspaceId: 'non-existent-ws',
            workspaceName: 'Remote WS',
            version: '1.0'
        };
        mockState.workspaces = [{ id: 'ws-1', name: 'WS1' }] as unknown as Workspace[];

        slice.loadProjectJson(data as unknown as ExportedProject);
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Workspace 'Remote WS' not found locally"), expect.any(Object));
    });

    // --- PHASE 2 Coverage Improvement ---
    it('createNewProject: handles catch block (lines 263-264)', async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error('Create Failed'));
        const result = await slice.createNewProject('New', 'Desc');
        expect(result).toBeNull();
        expect(toast.error).toHaveBeenCalledWith('Create Failed');
    });

    it('duplicateProject: handles catch block (lines 287-288)', async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error('Duplicate Failed'));
        await slice.duplicateProject('p1');
        expect(toast.error).toHaveBeenCalledWith('Error duplicating project');
    });

    it('exportProjectJson: handles validation failure (lines 295-296)', () => {
        mockState.validateGraph = vi.fn().mockReturnValue(false);
        slice.exportProjectJson();
        expect(mockState.showNotification).toHaveBeenCalledWith(
            expect.stringContaining("Please fix the highlighted errors first"),
            "error"
        );
    });

    it('exportPythonProject: handles validation failure (lines 357-358)', async () => {
        mockState.currentProjectId = 'p1';
        mockState.validateGraph = vi.fn().mockReturnValue(false);
        await slice.exportPythonProject();
        expect(mockState.showNotification).toHaveBeenCalledWith(
            expect.stringContaining("Please fix the highlighted errors first"),
            "error"
        );
    });

    // --- PHASE 3 Coverage Improvement ---
    it('exportProjectJson: slim export filters unused tools and strips secrets (lines 306-328)', () => {
        // 1. Setup used/unused tools
        const usedGlobalTool = { id: 'gt-used', name: 'GT1' };
        const usedGlobalToolObj = { id: 'gt-used-obj', name: 'GT-OBJ' };
        const unusedGlobalTool = { id: 'gt-unused', name: 'GT2' };
        const usedCustomTool = { id: 'ct-used', name: 'CT1' };
        const unusedCustomTool = { id: 'ct-unused', name: 'CT2' };
        const usedMcpServer = {
            id: 'mcp-used',
            name: 'M1',
            headers: { 'Authorization': 'Bearer token' },
            envVars: { 'API_KEY': '123' }
        };
        const unusedMcpServer = { id: 'mcp-unused', name: 'M2' };

        mockState.globalTools = [usedGlobalTool as unknown as ToolConfig, usedGlobalToolObj as unknown as ToolConfig, unusedGlobalTool as unknown as ToolConfig];
        mockState.customTools = [usedCustomTool as unknown as CustomTool, unusedCustomTool as unknown as CustomTool];
        mockState.mcpServers = [usedMcpServer as unknown as MCPServer, unusedMcpServer as unknown as MCPServer];

        // 2. Mock nodes using these tools/servers
        mockState.nodes = [
            {
                id: 'n1',
                type: 'agent',
                data: {
                    globalToolIds: ['gt-used', { id: 'gt-used-obj' }], // Combined string and object formats
                    customToolIds: ['ct-used']
                }
            },
            {
                id: 'n2',
                type: 'agent',
                data: {
                    mcpServerIds: ['mcp-used']
                }
            }
        ] as unknown as AppNode[];

        // 3. Intercept JSON.stringify to verify the payload before the Blob is created
        const stringifySpy = vi.spyOn(JSON, 'stringify');

        slice.exportProjectJson();

        expect(stringifySpy).toHaveBeenCalled();
        // Find the call that looks like the project export (version 1.0)
        const exportCall = stringifySpy.mock.calls.find(call => {
            const arg = call[0] as ExportedProject;
            return arg && arg.version === '1.0' && arg.nodes;
        });

        expect(exportCall).toBeDefined();
        const payload = exportCall![0] as ExportedProject;

        // Assertions on the collected tools/servers (Slim Export)
        expect(payload.globalTools).toHaveLength(2);
        expect(payload.globalTools!.some((t: ToolConfig) => t.id === 'gt-used')).toBe(true);
        expect(payload.globalTools!.some((t: ToolConfig) => t.id === 'gt-used-obj')).toBe(true);

        expect(payload.customTools).toHaveLength(1);
        expect(payload.customTools![0].id).toBe('ct-used');

        expect(payload.mcpServers).toHaveLength(1);
        expect(payload.mcpServers![0].id).toBe('mcp-used');

        // Assert secrets (headers and envVars values) are stripped to empty strings
        expect(payload.mcpServers![0].headers!.Authorization).toBe('');
        expect(payload.mcpServers![0].envVars!.API_KEY).toBe('');

        stringifySpy.mockRestore();
    });
});
