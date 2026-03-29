import { create } from 'zustand';
import { createGraphSlice } from './slices/graph.slice';
import { createUISlice } from './slices/ui.slice';
import { createProjectSlice } from './slices/project.slice';
import { createConfigSlice } from './slices/config.slice';
import { createWorkspaceSlice } from './slices/workspace.slice';
import { createAISlice } from './slices/ai.slice';
import { createExecutionSlice } from './slices/executions.slice';
import type { AppState } from '../types/store.types';

export const useStore = create<AppState>()((...a) => ({
  ...createGraphSlice(...a),
  ...createUISlice(...a),
  ...createProjectSlice(...a),
  ...createConfigSlice(...a),
  ...createWorkspaceSlice(...a),
  ...createAISlice(...a),
  ...createExecutionSlice(...a),
}));
