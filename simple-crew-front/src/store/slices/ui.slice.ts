import type { StateCreator } from 'zustand';
import type { AppState, UISlice } from '../../types/store.types';

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set) => ({
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  isSettingsOpen: false,
  isConsoleOpen: false,
  isConsoleExpanded: false,
  isUsabilityDrawerOpen: false,
  isChatVisible: false,
  isAboutModalOpen: false,
  isSidebarCollapsed: false,
  isStateModalOpen: false,
  activeStateNodeId: null,
  isSchemaModalOpen: false,
  activeSchemaNodeId: null,
  isRouterModalOpen: false,
  activeRouterNodeId: null,
  notification: null,
  canvasLayout: 'vertical',

  toggleTheme: () => {
    set((state: AppState) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return { theme: newTheme };
    });
  },

  setCanvasLayout: (layout) => {
    set({ canvasLayout: layout });
  },

  setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setIsConsoleOpen: (open) => set({ isConsoleOpen: open }),
  setIsConsoleExpanded: (expanded) => set({ isConsoleExpanded: expanded }),
  setIsUsabilityDrawerOpen: (open) => set({ isUsabilityDrawerOpen: open }),
  setIsChatVisible: (visible) => set({ isChatVisible: visible }),
  setIsAboutModalOpen: (open) => set({ isAboutModalOpen: open }),
  setIsSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  openStateModal: (nodeId) => set({ isStateModalOpen: true, activeStateNodeId: nodeId, activeNodeId: null }),
  closeStateModal: () => set({ isStateModalOpen: false, activeStateNodeId: null }),
  openSchemaModal: (nodeId) => set({ isSchemaModalOpen: true, activeSchemaNodeId: nodeId, activeNodeId: null }),
  closeSchemaModal: () => set({ isSchemaModalOpen: false, activeSchemaNodeId: null }),
  openRouterModal: (nodeId) => set({ isRouterModalOpen: true, activeRouterNodeId: nodeId, activeNodeId: null }),
  closeRouterModal: () => set({ isRouterModalOpen: false, activeRouterNodeId: null }),
  resetUIState: () => set({ 
    isChatVisible: false, 
    isConsoleOpen: false, 
    isConsoleExpanded: false, 
    isSettingsOpen: false, 
    isUsabilityDrawerOpen: false,
    isAboutModalOpen: false,
    isSidebarCollapsed: false,
    isStateModalOpen: false,
    activeStateNodeId: null,
    isSchemaModalOpen: false,
    activeSchemaNodeId: null,
    isRouterModalOpen: false,
    activeRouterNodeId: null
  }),

  showNotification: (message, type) => {
    set({ notification: { message, type, visible: true } });
    setTimeout(() => {
      set((state: AppState) => {
        if (state.notification?.message === message) {
          return { notification: null };
        }
        return state;
      });
    }, 4500);
  },

  clearNotification: () => set({ notification: null }),
});
