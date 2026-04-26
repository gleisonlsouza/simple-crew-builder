import { describe, it, expect } from 'vitest';
import { migrateLegacyWorkflow } from '../workflowAdapter';
import type { AppNode } from '../../types/nodes.types';

describe('workflowAdapter', () => {
  describe('migrateLegacyWorkflow', () => {
    it('should migrate legacy tasks from agent data', () => {
      const legacyAgent: AppNode = {
        id: 'agent-1',
        type: 'agent',
        position: { x: 100, y: 100 },
        data: {
          name: 'Legacy Agent',
          tasks: [
            { name: 'Task 1', description: 'Desc 1' },
            { name: 'Task 2', description: 'Desc 2' }
          ]
        } as any
      };

      const { migratedNodes, migratedEdges } = migrateLegacyWorkflow([legacyAgent], []);

      // Original agent + 2 new tasks
      expect(migratedNodes).toHaveLength(3);
      expect(migratedEdges).toHaveLength(2);

      const taskNodes = migratedNodes.filter(n => n.type === 'task');
      expect(taskNodes).toHaveLength(2);
      expect(taskNodes[0].data.name).toBe('Task 1');
      expect(taskNodes[1].data.name).toBe('Task 2');

      const edges = migratedEdges.filter(e => e.source === 'agent-1');
      expect(edges).toHaveLength(2);
      expect(edges[0].sourceHandle).toBe('out-task');
      expect(edges[0].targetHandle).toBe('left-target');

      // Legacy tasks should be deleted from agent data
      expect(migratedNodes[0].data.tasks).toBeUndefined();
    });

    it('should migrate legacy global tool IDs', () => {
      const legacyAgent: AppNode = {
        id: 'agent-1',
        type: 'agent',
        position: { x: 100, y: 100 },
        data: {
          name: 'Legacy Agent',
          globalToolIds: ['tool-1', { id: 'tool-2', config: { key: 'val' } }]
        } as any
      };

      const { migratedNodes, migratedEdges } = migrateLegacyWorkflow([legacyAgent], []);

      expect(migratedNodes).toHaveLength(3);
      expect(migratedEdges).toHaveLength(2);

      const toolNodes = migratedNodes.filter(n => n.type === 'tool');
      expect(toolNodes).toHaveLength(2);
      expect(toolNodes[0].data.toolId).toBe('tool-1');
      expect(toolNodes[1].data.toolId).toBe('tool-2');
      expect(toolNodes[1].data.config).toEqual({ key: 'val' });

      expect(migratedNodes[0].data.globalToolIds).toBeUndefined();
    });

    it('should migrate legacy custom tool IDs', () => {
      const legacyAgent: AppNode = {
        id: 'agent-1',
        type: 'agent',
        position: { x: 100, y: 100 },
        data: {
          name: 'Legacy Agent',
          customToolIds: ['custom-1']
        } as any
      };

      const { migratedNodes, migratedEdges } = migrateLegacyWorkflow([legacyAgent], []);

      expect(migratedNodes).toHaveLength(2);
      expect(migratedEdges).toHaveLength(1);

      const customToolNodes = migratedNodes.filter(n => n.type === 'customTool');
      expect(customToolNodes).toHaveLength(1);
      expect(customToolNodes[0].data.toolId).toBe('custom-1');

      expect(migratedNodes[0].data.customToolIds).toBeUndefined();
    });

    it('should migrate legacy MCP server IDs', () => {
      const legacyAgent: AppNode = {
        id: 'agent-1',
        type: 'agent',
        position: { x: 100, y: 100 },
        data: {
          name: 'Legacy Agent',
          mcpServerIds: ['mcp-1']
        } as any
      };

      const { migratedNodes, migratedEdges } = migrateLegacyWorkflow([legacyAgent], []);

      expect(migratedNodes).toHaveLength(2);
      expect(migratedEdges).toHaveLength(1);

      const mcpNodes = migratedNodes.filter(n => n.type === 'mcp');
      expect(mcpNodes).toHaveLength(1);
      expect(mcpNodes[0].data.serverId).toBe('mcp-1');

      expect(migratedNodes[0].data.mcpServerIds).toBeUndefined();
    });

    it('should return original arrays if no migration is needed', () => {
      const modernAgent: AppNode = {
        id: 'agent-1',
        type: 'agent',
        position: { x: 100, y: 100 },
        data: { name: 'Modern Agent' } as any
      };

      const { migratedNodes, migratedEdges } = migrateLegacyWorkflow([modernAgent], []);

      expect(migratedNodes).toEqual([modernAgent]);
      expect(migratedEdges).toEqual([]);
    });

    it('should ignore non-agent nodes', () => {
      const taskNode: AppNode = {
        id: 'task-1',
        type: 'task',
        position: { x: 100, y: 100 },
        data: { name: 'Some Task' } as any
      };

      const { migratedNodes, migratedEdges } = migrateLegacyWorkflow([taskNode], []);

      expect(migratedNodes).toEqual([taskNode]);
      expect(migratedEdges).toEqual([]);
    });
  });
});
