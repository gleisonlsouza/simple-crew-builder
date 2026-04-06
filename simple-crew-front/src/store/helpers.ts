import type { AppNode, AppEdge, AgentNodeData, TaskNodeData, CrewNodeData, ChatNodeData } from '../types/nodes.types';
import type { ModelConfig, ToolConfig, CustomTool, MCPServer } from '../types/config.types';

export const migrateNodes = (nodes: AppNode[]): AppNode[] => {
  return nodes.map(node => {
    const type = node.type;
    const data = (node.data || {}) as Record<string, unknown>;

    if (type === 'agent') {
      const agentData: AgentNodeData = {
        name: typeof data.name === 'string' ? data.name : 'Unnamed Agent',
        role: typeof data.role === 'string' ? data.role : '',
        goal: typeof data.goal === 'string' ? data.goal : '',
        backstory: typeof data.backstory === 'string' ? data.backstory : '',
        modelId: typeof data.modelId === 'string' ? data.modelId : undefined,
        temperature: typeof data.temperature === 'number' ? data.temperature : 0.7,
        mcpServerIds: Array.isArray(data.mcpServerIds) ? (data.mcpServerIds as string[]) : [],
        customToolIds: Array.isArray(data.customToolIds) ? (data.customToolIds as string[]) : [],
        globalToolIds: (Array.isArray(data.globalToolIds) ? data.globalToolIds : []).map((gt: unknown) => 
          typeof gt === 'string' ? gt : (gt && typeof gt === 'object' && 'id' in gt ? (gt as {id: string}).id : String(gt))
        ),
        code_execution_mode: (data.code_execution_mode === 'disabled' || data.code_execution_mode === 'allow' || data.code_execution_mode === 'confirm') ? data.code_execution_mode : 'disabled',
      };
      return { ...node, data: { ...data, ...agentData } };
    }

    if (type === 'task') {
      const taskData: TaskNodeData = {
        name: typeof data.name === 'string' ? data.name : 'Unnamed Task',
        description: typeof data.description === 'string' ? data.description : '',
        expected_output: typeof data.expected_output === 'string' ? data.expected_output : '',
        async_execution: typeof data.async_execution === 'boolean' ? data.async_execution : false,
        human_input: typeof data.human_input === 'boolean' ? data.human_input : false,
      };
      return { ...node, data: { ...data, ...taskData } };
    }

    if (type === 'crew') {
      const crewData: CrewNodeData = {
        name: typeof data.name === 'string' ? data.name : 'Crew',
        process: (data.process === 'sequential' || data.process === 'hierarchical') ? data.process : 'sequential',
        verbose: typeof data.verbose === 'boolean' ? data.verbose : true,
        memory: typeof data.memory === 'boolean' ? data.memory : false,
        cache: typeof data.cache === 'boolean' ? data.cache : false,
        planning: typeof data.planning === 'boolean' ? data.planning : false,
        share_crew: typeof data.share_crew === 'boolean' ? data.share_crew : false,
      };
      return { ...node, data: { ...data, ...crewData } };
    }

    if (type === 'chat') {
      const chatData: ChatNodeData = {
        name: typeof data.name === 'string' ? data.name : 'Chat Trigger',
        description: typeof data.description === 'string' ? data.description : '',
        includeHistory: typeof data.includeHistory === 'boolean' ? data.includeHistory : true,
      };
      return { ...node, data: { ...data, ...chatData } };
    }

    return node;
  });
};

export const migrateEdges = (edges: AppEdge[]): AppEdge[] => {
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
    const data = node.data as Record<string, unknown>;

    // 0. Workspace Validation
    if (!workspaceId) {
      if (node.type === 'task' || node.type === 'agent') {
        const needsWorkspace = node.type === 'task' || 
          ((data.globalToolIds || []) as (string | { id: string })[]).some((gtIdObj) => {
            const id = typeof gtIdObj === 'string' ? gtIdObj : gtIdObj.id;
            return id.toLowerCase().includes('file') || id.toLowerCase().includes('directory');
          });

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
      ((data.globalToolIds || []) as (string | { id: string })[]).forEach((gtIdObj) => {
        const id = typeof gtIdObj === 'string' ? gtIdObj : gtIdObj.id;
        if (!globalTools.some(gt => gt.id === id)) {
          nodeWarnings.push(`Global Tool '${id}' not found.`);
        }
      });
    }

    // 3. Validate Custom Tools
    if (data.customToolIds) {
      (data.customToolIds as string[]).forEach((id: string) => {
        if (!customTools.some(ct => ct.id === id)) {
          nodeWarnings.push(`Custom Tool '${id}' not found.`);
        }
      });
    }

    // 4. Validate MCP Servers
    if (data.mcpServerIds) {
      (data.mcpServerIds as string[]).forEach((id: string) => {
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
