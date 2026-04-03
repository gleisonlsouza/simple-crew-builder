import type { StateCreator } from 'zustand';
import toast from 'react-hot-toast';
import type { AppState, AISlice } from '../../types/store.types';

const API_URL = import.meta.env.VITE_API_URL || '';

export const createAISlice: StateCreator<AppState, [], [], AISlice> = (_set, get) => ({
  suggestAiContent: async (nodeId, field) => {
    const { nodes, updateNodeData } = get();
    const agentNode = nodes.find((n: any) => n.id === nodeId);
    if (!agentNode) return;

    const crewNode = nodes.find(n => n.type === 'crew');
    const workflowName = (crewNode?.data as any)?.name || 'SimpleCrew Workflow';
    const workflowDescription = (crewNode?.data as any)?.description || '';

    try {
      const response = await fetch(`${API_URL}/api/v1/ai/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          agent_name: (agentNode.data as any).name,
          workflow_name: workflowName,
          workflow_description: workflowDescription,
          current_value: (agentNode.data as any)[field]
        })
      });

      if (!response.ok) throw new Error('Failed to get AI suggestion');
      const data = await response.json();
      updateNodeData(nodeId, { [field]: data.suggestion });
    } catch (error: any) {
      toast.error(`AI Error: ${error.message}`);
    }
  },

  suggestBulkAiContent: async (nodeId) => {
    const { nodes, updateNodeData } = get();
    const agentNode = nodes.find((n: any) => n.id === nodeId);
    if (!agentNode) return;

    const crewNode = nodes.find((n: any) => n.type === 'crew');
    const workflowName = (crewNode?.data as any)?.name || 'SimpleCrew Workflow';
    const workflowDescription = (crewNode?.data as any)?.description || '';

    try {
      const response = await fetch(`${API_URL}/api/v1/ai/bulk-suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: (agentNode.data as any).name,
          workflow_name: workflowName,
          workflow_description: workflowDescription,
          current_values: {
            role: (agentNode.data as any).role,
            goal: (agentNode.data as any).goal,
            backstory: (agentNode.data as any).backstory
          }
        })
      });

      if (!response.ok) throw new Error('AI Bulk Suggestion failed');
      const data = await response.json();
      updateNodeData(nodeId, {
        role: data.role,
        goal: data.goal,
        backstory: data.backstory
      });
      toast.success('Agent details generated! ✨');
    } catch (error: any) {
      toast.error(error.message);
    }
  },

  suggestTaskBulkAiContent: async (nodeId) => {
    const { nodes, updateNodeData } = get();
    const taskNode = nodes.find((n: any) => n.id === nodeId);
    if (!taskNode) return;

    const crewNode = nodes.find((n: any) => n.type === 'crew');
    const workflowName = (crewNode?.data as any)?.name || 'SimpleCrew Workflow';
    const workflowDescription = (crewNode?.data as any)?.description || '';

    const agentNode = nodes.find((n: any) => n.type === 'agent' && (n.data as any).taskIds?.includes(nodeId));
    const agentName = (agentNode?.data as any)?.name;

    try {
      const response = await fetch(`${API_URL}/api/v1/ai/task-bulk-suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_name: (taskNode.data as any).name || 'Unnamed Task',
          agent_name: agentName,
          workflow_name: workflowName,
          workflow_description: workflowDescription,
          current_values: {
            description: (taskNode.data as any).description,
            expected_output: (taskNode.data as any).expected_output
          }
        })
      });

      if (!response.ok) throw new Error('AI Task Suggestion failed');
      const data = await response.json();
      updateNodeData(nodeId, {
        description: data.description,
        expected_output: data.expected_output
      });
      toast.success('Task details generated! ✨');
    } catch (error: any) {
      toast.error(error.message);
    }
  },
});
