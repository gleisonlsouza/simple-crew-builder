import type { StateCreator } from 'zustand';
import type { AppState, ExecutionSlice, Execution } from '../../types/store.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const createExecutionSlice: StateCreator<
  AppState,
  [],
  [],
  ExecutionSlice
> = (set, get) => ({
  executions: [],
  currentExecution: null,
  isLoadingExecutions: false,

  fetchExecutions: async (projectId: string) => {
    if (!projectId) return;
    set({ isLoadingExecutions: true });
    try {
      const response = await fetch(`${API_URL}/api/v1/projects/${projectId}/executions`);
      if (!response.ok) throw new Error('Failed to fetch executions');
      const data = await response.json();
      set({ executions: data, isLoadingExecutions: false });
    } catch (error) {
      console.error('Error fetching executions:', error);
      set({ isLoadingExecutions: false });
    }
  },

  fetchExecutionDetails: async (executionId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/executions/${executionId}`);
      if (!response.ok) throw new Error('Failed to fetch execution details');
      const data = await response.json();
      set({ currentExecution: data });
      return data;
    } catch (error) {
      console.error('Error fetching execution details:', error);
      return null;
    }
  },

  reRunExecution: (execution: Execution) => {
    // 1. Load the graph snapshot if it's different from current
    const state = get();
    
    if (execution.graph_snapshot) {
      state.loadProjectJson(execution.graph_snapshot);
    }

    // 2. If it was a chat trigger, load the input as a message to facilitate re-run
    if (execution.trigger_type === 'chat' && execution.input_data) {
      const input = typeof execution.input_data === 'string' 
        ? execution.input_data 
        : JSON.stringify(execution.input_data, null, 2);
      
      state.setMessages((prev: any) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'user', content: `Re-running with input: ${input}` }
      ]);
      
      // Open chat and start execution
      state.setIsChatVisible(true);
    } else if (execution.trigger_type === 'webhook') {
      // For webhooks, we could potentially show the mapper with the input_data
      // but for now let's show a notification
      state.showNotification("Webhook snapshot loaded. You can click 'Run Crew' to execute again.", "info");
    }
  }
});
