import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import React from 'react';

// Mock react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

// Mock motion/react (framer motion) to avoid animation-related failures
vi.mock('motion/react', () => {
  const motionComponent = (tag: string) => ({ children, ...props }: any) => {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      whileHover,
      whileTap,
      animate,
      initial,
      exit,
      variants,
      transition,
      onAnimationStart,
      onAnimationComplete,
      onUpdate,
      layout,
      ...domProps
    } = props;
    return React.createElement(tag, domProps, children);
  };

  return {
    motion: {
      div: motionComponent('div'),
      section: motionComponent('section'),
      header: motionComponent('header'),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Plus: () => <div />,
  Workflow: () => <div />,
  Clock: () => <div />,
  Layers: () => <div />,
  Search: () => <div />,
  Trash2: () => <div />,
  Edit2: () => <div />,
  X: () => <div />,
  Upload: () => <div />,
  MoreVertical: () => <div />,
  Settings: () => <div />,
  Key: () => <div />,
  Database: () => <div />,
  HelpCircle: () => <div />,
  Moon: () => <div />,
}));

// Mock the store
vi.mock('../../store/index', () => ({
  useStore: vi.fn(),
}));

// Mock components that might be complex
vi.mock('../../components/SettingsDrawer', () => ({
  SettingsDrawer: () => <div data-testid="mock-settings-drawer" />,
}));
vi.mock('../../components/ConfirmationModal', () => ({
  ConfirmationModal: () => <div data-testid="mock-confirmation-modal" />,
}));
vi.mock('../../components/AboutModal', () => ({
  AboutModal: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div data-testid="mock-about-modal" /> : null,
}));
vi.mock('../../components/MainSidebar', () => ({
  MainSidebar: () => <div data-testid="mock-main-sidebar" />,
}));

describe('Dashboard Page Smoke Test', () => {
  const mockNavigate = vi.fn();

  const defaultState = {
    savedProjects: [],
    isAboutModalOpen: false,
    setIsAboutModalOpen: vi.fn(),
    fetchProjects: vi.fn(),
    fetchCredentials: vi.fn(),
    fetchWorkspaces: vi.fn(),
    deleteProject: vi.fn(),
    updateProjectMetadata: vi.fn(),
    createNewProject: vi.fn(),
    importProjectJsonAndSave: vi.fn(),
    showNotification: vi.fn(),
    duplicateProject: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
    (useStore as any).mockImplementation((selector: (state: any) => any) => {
      // Small hack to handle both selector usage and full state usage if any
      if (typeof selector !== 'function') return defaultState;
      return selector(defaultState);
    });
    // Add getState for direct calls
    (useStore as any).getState = () => defaultState;
  });

  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    expect(screen.getByText('My Workflows')).toBeInTheDocument();
    expect(screen.getByText(/Manage and automate your AI agents/i)).toBeInTheDocument();
    expect(screen.getByText('Add Workflow')).toBeInTheDocument();
  });
});
