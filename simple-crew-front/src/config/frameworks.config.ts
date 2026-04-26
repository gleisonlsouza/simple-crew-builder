export type NodeType = 'crew' | 'agent' | 'task' | 'tool' | 'customTool' | 'mcp' | 'state' | 'router' | 'schema' | 'chat' | 'webhook';

export interface FrameworkRules {
  name: string;
  allowedNodes: NodeType[];
  labels: {
    crew: string;
    task: string;
  };
}

export const FRAMEWORK_CONFIG: Record<string, FrameworkRules> = {
  crewai: {
    name: 'CrewAI',
    allowedNodes: ['crew', 'agent', 'task', 'tool', 'customTool', 'mcp', 'chat', 'webhook'],
    labels: {
      crew: 'Crew',
      task: 'Task'
    }
  },
  langgraph: {
    name: 'LangGraph',
    allowedNodes: ['crew', 'agent', 'task', 'tool', 'customTool', 'mcp', 'state', 'router', 'schema', 'chat', 'webhook'],
    labels: {
      crew: 'Graph / Crew',
      task: 'Tasks'
    }
  }
};
