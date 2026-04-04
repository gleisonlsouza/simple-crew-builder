import { describe, it, expect } from 'vitest';
import { migrateNodes, migrateEdges, validateDependencies } from '../helpers';
import type { AppNode, AppEdge } from '../../types/nodes.types';
import type { ModelConfig, ToolConfig, CustomTool, MCPServer } from '../../types/config.types';

describe('Store Helpers', () => {
  describe('migrateNodes', () => {
    it('migrates agent nodes with default values and complex tool IDs', () => {
      const nodes = [{ 
        id: '1', 
        type: 'agent', 
        data: { 
          name: 'Test Agent',
          globalToolIds: ['t1', { id: 't2' }, 123] 
        } 
      }] as unknown as AppNode[];
      const migrated = migrateNodes(nodes);
      expect(migrated[0].data).toMatchObject({
        name: 'Test Agent',
        globalToolIds: ['t1', 't2', '123'],
        role: '',
        goal: '',
        backstory: '',
        temperature: 0.7,
        code_execution_mode: 'disabled'
      });
    });

    it('migrates task nodes with default values', () => {
      const nodes = [{ id: '1', type: 'task', data: { name: 'Test Task' } }] as unknown as AppNode[];
      const migrated = migrateNodes(nodes);
      expect(migrated[0].data).toMatchObject({
        name: 'Test Task',
        description: '',
        expected_output: '',
        async_execution: false,
        human_input: false
      });
    });

    it('migrates crew nodes with default values', () => {
      const nodes = [{ id: '1', type: 'crew', data: {} }] as unknown as AppNode[];
      const migrated = migrateNodes(nodes);
      expect(migrated[0].data).toMatchObject({
        process: 'sequential',
        verbose: true,
        memory: false,
        cache: false
      });
    });

    it('migrates chat nodes with default values', () => {
      const nodes = [{ id: '1', type: 'chat', data: { name: 'My Chat' } }] as unknown as AppNode[];
      const migrated = migrateNodes(nodes);
      expect(migrated[0].data).toMatchObject({
        name: 'My Chat',
        includeHistory: true
      });
    });

    it('returns original node for unknown types', () => {
      const nodes = [{ id: '1', type: 'unknown', data: { x: 1 } }] as unknown as AppNode[];
      const migrated = migrateNodes(nodes);
      expect(migrated[0]).toEqual(nodes[0]);
    });
  });

  describe('migrateEdges', () => {
    it('sets default edge type and handle formatting', () => {
      const edges = [{ id: 'e1', source: 's1', target: 't1', sourceHandle: 'right', targetHandle: 'left' }];
      const migrated = migrateEdges(edges);
      expect(migrated[0]).toMatchObject({
        type: 'deletable',
        sourceHandle: 'right-source',
        targetHandle: 'left-target'
      });
    });

    it('prevents double-formatting handles and handles defaults', () => {
      const edges = [
          { id: 'e1', source: 's1', target: 't1', sourceHandle: 'right-source', targetHandle: 'left-target' },
          { id: 'e2', source: 's1', target: 't1' }
      ] as unknown as AppEdge[];
      const migrated = migrateEdges(edges);
      expect(migrated[0].sourceHandle).toBe('right-source');
      expect(migrated[0].targetHandle).toBe('left-target');
      expect(migrated[1].sourceHandle).toBe('right-source');
      expect(migrated[1].targetHandle).toBe('left-target');
    });
  });

  describe('validateDependencies', () => {
    const mockModels: ModelConfig[] = [{ id: 'm1', name: 'Model 1', model_name: 'gpt-4o', credentialId: 'c1', isDefault: true, model_type: 'GENERATIVE' }];
    const mockTools: ToolConfig[] = [{ id: 't1', name: 'Tool 1', description: 'test', isEnabled: true, requiresKey: false }];
    const mockCustomTools: CustomTool[] = [{ id: 'ct1', name: 'Custom Tool 1', description: 'test', code: 'print()' }];
    const mockServers: MCPServer[] = [{ id: 'ms1', name: 'Server 1', transportType: 'stdio' }];

    it('identifies missing models', () => {
      const nodes: AppNode[] = [
        { id: 'n1', type: 'agent', position: { x: 0, y: 0 }, data: { modelId: 'non-existent' } } as unknown as AppNode
      ];
      const { warnings } = validateDependencies(nodes, mockModels, [], [], [], 'ws-1');
      expect(warnings['n1']).toContain("Model 'non-existent' not found. Falling back to default.");
    });

    it('identifies missing global tools', () => {
      const nodes: AppNode[] = [
        { id: 'n1', type: 'agent', position: { x: 0, y: 0 }, data: { globalToolIds: ['t2'] } } as unknown as AppNode
      ];
      const { warnings } = validateDependencies(nodes, [], mockTools, [], [], 'ws-1');
      expect(warnings['n1']).toContain("Global Tool 't2' not found.");
    });

    it('identifies missing custom tools', () => {
      const nodes: AppNode[] = [
        { id: 'n1', type: 'agent', position: { x: 0, y: 0 }, data: { customToolIds: ['ct2'] } } as unknown as AppNode
      ];
      const { warnings } = validateDependencies(nodes, [], [], mockCustomTools, [], 'ws-1');
      expect(warnings['n1']).toContain("Custom Tool 'ct2' not found.");
    });

    it('identifies missing MCP servers', () => {
      const nodes: AppNode[] = [
        { id: 'n1', type: 'agent', position: { x: 0, y: 0 }, data: { mcpServerIds: ['ms2'] } } as unknown as AppNode
      ];
      const { warnings } = validateDependencies(nodes, [], [], [], mockServers, 'ws-1');
      expect(warnings['n1']).toContain("MCP Server 'ms2' not found.");
    });

    it('flags missing workspace for file tools', () => {
      const nodes: AppNode[] = [
        { id: 'n1', type: 'agent', position: { x: 0, y: 0 }, data: { globalToolIds: ['FileReadTool'] } } as unknown as AppNode
      ];
      const { warnings } = validateDependencies(nodes, [], [{ id: 'FileReadTool', name: 'File Read' } as unknown as ToolConfig], [], [], null);
      expect(warnings['n1']).toContain("No workspace selected. File operations may fail.");
    });

    it('flags missing workspace with original name hint', () => {
      const nodes: AppNode[] = [
        { id: 'n1', type: 'task', position: { x: 0, y: 0 }, data: {} } as unknown as AppNode
      ];
      const { warnings } = validateDependencies(nodes, [], [], [], [], null, 'Old Workspace');
      expect(warnings['n1']).toContain("Workspace 'Old Workspace' not found. Please select a local workspace.");
    });

    it('identifies missing manager_llm_id', () => {
      const nodes: AppNode[] = [
        { id: 'c1', type: 'crew', data: { manager_llm_id: 'missing-llm' } } as unknown as AppNode
      ];
      const { warnings } = validateDependencies(nodes, mockModels, [], [], [], 'ws-1');
      expect(warnings['c1']).toContain("Manager LLM 'missing-llm' not found.");
    });

    it('skips workspace warning for local tools found in agent', () => {
        const nodes: AppNode[] = [
            { id: 'a1', type: 'agent', data: { globalToolIds: ['Calculator'] } } as unknown as AppNode
        ];
        const { warnings } = validateDependencies(nodes, [], [{ id: 'Calculator', name: 'Calc' } as unknown as ToolConfig], [], [], null);
        expect(warnings['a1']).toBeUndefined();
    });
  });
});
