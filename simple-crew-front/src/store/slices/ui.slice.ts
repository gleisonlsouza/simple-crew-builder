import type { StateCreator } from 'zustand';
import type { AppState, UISlice } from '../../types/store.types';

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set) => ({
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  isSettingsOpen: false,
  isConsoleOpen: false,
  isConsoleExpanded: false,
  isUsabilityDrawerOpen: false,
  isChatVisible: false,
  notification: null,

  toggleTheme: () => {
    set((state: AppState) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return { theme: newTheme };
    });
  },

  setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setIsConsoleOpen: (open) => set({ isConsoleOpen: open }),
  setIsConsoleExpanded: (expanded) => set({ isConsoleExpanded: expanded }),
  setIsUsabilityDrawerOpen: (open) => set({ isUsabilityDrawerOpen: open }),
  setIsChatVisible: (visible) => set({ isChatVisible: visible }),
  resetUIState: () => set({ 
    isChatVisible: false, 
    isConsoleOpen: false, 
    isConsoleExpanded: false, 
    isSettingsOpen: false, 
    isUsabilityDrawerOpen: false 
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
