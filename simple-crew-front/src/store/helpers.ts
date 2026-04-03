import type { AppNode, AppEdge, AgentNodeData, TaskNodeData, CrewNodeData, ChatNodeData } from '../types/nodes.types';
import type { ModelConfig, ToolConfig, CustomTool, MCPServer } from '../types/config.types';

export const migrateNodes = (nodes: any[]): AppNode[] => {
  return nodes.map(node => {
    const type = node.type;
    const data = node.data || {};

    if (type === 'agent') {
      const agentData: AgentNodeData = {
        name: data.name || 'Unnamed Agent',
        role: data.role || '',
        goal: data.goal || '',
        backstory: data.backstory || '',
        modelId: data.modelId || undefined,
        temperature: data.temperature !== undefined ? data.temperature : 0.7,
        mcpServerIds: data.mcpServerIds || [],
        customToolIds: data.customToolIds || [],
        globalToolIds: (data.globalToolIds || []).map((gt: any) => 
          typeof gt === 'string' ? gt : gt
        ),
        code_execution_mode: data.code_execution_mode || 'disabled',
        ...data
      };
      return { ...node, data: agentData };
    }

    if (type === 'task') {
      const taskData: TaskNodeData = {
        name: data.name || 'Unnamed Task',
        description: data.description || '',
        expected_output: data.expected_output || '',
        async_execution: data.async_execution || false,
        human_input: data.human_input || false,
        ...data
      };
      return { ...node, data: taskData };
    }

    if (type === 'crew') {
      const crewData: CrewNodeData = {
        process: data.process || 'sequential',
        verbose: data.verbose !== undefined ? data.verbose : true,
        memory: data.memory !== undefined ? data.memory : true,
        cache: data.cache !== undefined ? data.cache : true,
        planning: data.planning || false,
        share_crew: data.share_crew || false,
        ...data
      };
      return { ...node, data: crewData };
    }

    if (type === 'chat') {
      const chatData: ChatNodeData = {
        name: data.name || 'Chat Trigger',
        description: data.description || '',
        includeHistory: data.includeHistory !== undefined ? data.includeHistory : true,
        ...data
      };
      return { ...node, data: chatData };
    }

    return node;
  });
};

export const migrateEdges = (edges: any[]): AppEdge[] => {
  return edges.map(edge => ({
    ...edge,
    type: edge.type || 'deletable',
    sourceHandle: edge.sourceHandle?.includes('-source') 
      ? edge.sourceHandle 
      : `${edge.sourceHandle || 'right'}-source`,
    targetHandle: edge.targetHandle?.includes('-target') 
      ? edge.targetHandle 
      : `${edge.targetHandle || 'left'}-target`
  }));
};

/**
 * Validates if nodes dependencies (Tools, Models, Servers) exist in the current system.
 */
export const validateDependencies = (
  nodes: AppNode[], 
  models: ModelConfig[], 
  globalTools: ToolConfig[], 
  customTools: CustomTool[], 
  mcpServers: MCPServer[],
  workspaceId: string | null,
  originalWorkspaceName?: string | null
) => {
  const warnings: Record<string, string[]> = {};
  
  const migratedNodes = nodes.map(node => {
    const nodeWarnings: string[] = [];
    const data = node.data as any;

    // 0. Workspace Validation
    if (!workspaceId) {
      if (node.type === 'task' || node.type === 'agent') {
        const needsWorkspace = node.type === 'task' || 
          (data.globalToolIds && data.globalToolIds.some((gtIdObj: any) => {
            const id = typeof gtIdObj === 'string' ? gtIdObj : gtIdObj.id;
            return id.toLowerCase().includes('file') || id.toLowerCase().includes('directory');
          }));

        if (needsWorkspace) {
          if (originalWorkspaceName) {
            nodeWarnings.push(`Workspace '${originalWorkspaceName}' not found. Please select a local workspace.`);
          } else {
            nodeWarnings.push("No workspace selected. File operations may fail.");
          }
        }
      }
    }

    // 1. Validate Models
    if (data.modelId) {
      const exists = models.some(m => m.id === data.modelId);
      if (!exists) {
        nodeWarnings.push(`Model '${data.modelId}' not found. Falling back to default.`);
      }
    }

    if (data.manager_llm_id) {
       if (!models.some(m => m.id === data.manager_llm_id)) {
         nodeWarnings.push(`Manager LLM '${data.manager_llm_id}' not found.`);
       }
    }

    // 2. Validate Global Tools
    if (data.globalToolIds) {
      data.globalToolIds.forEach((gtIdObj: any) => {
        const id = typeof gtIdObj === 'string' ? gtIdObj : gtIdObj.id;
        if (!globalTools.some(gt => gt.id === id)) {
          nodeWarnings.push(`Global Tool '${id}' not found.`);
        }
      });
    }

    // 3. Validate Custom Tools
    if (data.customToolIds) {
      data.customToolIds.forEach((id: string) => {
        if (!customTools.some(ct => ct.id === id)) {
          nodeWarnings.push(`Custom Tool '${id}' not found.`);
        }
      });
    }

    // 4. Validate MCP Servers
    if (data.mcpServerIds) {
      data.mcpServerIds.forEach((id: string) => {
        if (!mcpServers.some(ms => ms.id === id)) {
          nodeWarnings.push(`MCP Server '${id}' not found.`);
        }
      });
    }

    if (nodeWarnings.length > 0) {
      warnings[node.id] = nodeWarnings;
    }

    return node;
  });

  return { migratedNodes, warnings };
};
