import { v4 as uuidv4 } from 'uuid';
import type { AppNode, AppEdge, AgentNodeData, TaskNodeData } from '../types/nodes.types';

/**
 * Migrates legacy workflows where tasks, tools, and MCP servers were embedded
 * inside AgentNode data objects into the new separate Node-based architecture.
 */
export const migrateLegacyWorkflow = (nodes: AppNode[], edges: AppEdge[]): { migratedNodes: AppNode[], migratedEdges: AppEdge[] } => {
  const nextNodes = [...nodes];
  const nextEdges = [...edges];

  // We iterate through a snapshot of original nodes to find agents with legacy data
  nodes.forEach((node) => {
    if (node.type !== 'agent') return;

    const data = node.data as AgentNodeData;
    const { x, y } = node.position;

    // Track horizontal offset for newly created nodes to prevent overlap
    let xOffset = 0;
    const Y_OFFSET = 350;
    const X_SPACING = 280;

    // 1. Migrate Legacy Tasks Array
    if (Array.isArray(data.tasks) && data.tasks.length > 0) {
      (data.tasks as Record<string, unknown>[]).forEach((taskData) => {
        const taskId = `dndnode_${uuidv4()}`;

        // Create the separate Task Node
        const newTaskNode: AppNode = {
          id: taskId,
          type: 'task',
          position: { x: x + xOffset, y: y + Y_OFFSET },
          data: {
            name: (taskData.name as string) || 'Migrated Task',
            description: (taskData.description as string) || '',
            expected_output: (taskData.expected_output as string) || '',
            isCollapsed: false,
            ...taskData
          } as TaskNodeData
        };
        nextNodes.push(newTaskNode);

        // Create the Edge connecting Agent -> Task
        const newEdge: AppEdge = {
          id: `edge-${uuidv4()}`,
          source: node.id,
          target: taskId,
          sourceHandle: 'out-task',
          targetHandle: 'left-target',
          type: 'deletable',
          animated: true
        };
        nextEdges.push(newEdge);

        xOffset += X_SPACING;
      });
      delete data.tasks;
    }

    // 2. Migrate Global Tool IDs
    if (Array.isArray(data.globalToolIds) && data.globalToolIds.length > 0) {
      (data.globalToolIds as (string | { id: string; config?: Record<string, unknown> })[]).forEach((gtId) => {
        const toolNodeId = `dndnode_${uuidv4()}`;
        const idStr = typeof gtId === 'string' ? gtId : (gtId?.id || '');
        if (!idStr) return;

        const newNode: AppNode = {
          id: toolNodeId,
          type: 'tool',
          position: { x: x + xOffset, y: y + Y_OFFSET },
          data: {
            name: 'Tool',
            toolId: idStr,
            config: typeof gtId === 'object' ? gtId.config : {}
          }
        };
        nextNodes.push(newNode);

        const newEdge: AppEdge = {
          id: `edge-${uuidv4()}`,
          source: node.id,
          target: toolNodeId,
          sourceHandle: 'out-tool',
          targetHandle: 'left-target',
          type: 'deletable',
          animated: true
        };
        nextEdges.push(newEdge);
        xOffset += X_SPACING;
      });
      delete data.globalToolIds;
    }

    // 3. Migrate Custom Tool IDs
    if (Array.isArray(data.customToolIds) && data.customToolIds.length > 0) {
      data.customToolIds.forEach((ctId: string) => {
        const toolNodeId = `dndnode_${uuidv4()}`;

        const newNode: AppNode = {
          id: toolNodeId,
          type: 'customTool',
          position: { x: x + xOffset, y: y + Y_OFFSET },
          data: {
            name: 'Custom Tool',
            toolId: ctId
          }
        };
        nextNodes.push(newNode);

        const newEdge: AppEdge = {
          id: `edge-${uuidv4()}`,
          source: node.id,
          target: toolNodeId,
          sourceHandle: 'out-tool',
          targetHandle: 'left-target',
          type: 'deletable',
          animated: true
        };
        nextEdges.push(newEdge);
        xOffset += X_SPACING;
      });
      delete data.customToolIds;
    }

    // 4. Migrate MCP Servers
    if (Array.isArray(data.mcpServerIds) && data.mcpServerIds.length > 0) {
      data.mcpServerIds.forEach((serverId: string) => {
        const mcpNodeId = `dndnode_${uuidv4()}`;

        const newNode: AppNode = {
          id: mcpNodeId,
          type: 'mcp',
          position: { x: x + xOffset, y: y + Y_OFFSET },
          data: {
            name: 'MCP Server',
            serverId: serverId
          }
        };
        nextNodes.push(newNode);

        const newEdge: AppEdge = {
          id: `edge-${uuidv4()}`,
          source: node.id,
          target: mcpNodeId,
          sourceHandle: 'out-mcp',
          targetHandle: 'left-target',
          type: 'deletable',
          animated: true
        };
        nextEdges.push(newEdge);
        xOffset += X_SPACING;
      });
      delete data.mcpServerIds;
    }
  });

  return { migratedNodes: nextNodes, migratedEdges: nextEdges };
};
