import { render, screen } from '@testing-library/react';
import Builder from '../Builder';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { MemoryRouter, useNavigate, useParams } from 'react-router-dom';
import React from 'react';

// Mock react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useNavigate: vi.fn(),
    useParams: vi.fn(),
  };
});

// Mock the store
vi.mock('../../store/index', () => ({
  useStore: vi.fn(),
}));

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
      header: motionComponent('header'),
      main: motionComponent('main'),
      span: motionComponent('span'),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock zustand/shallow
vi.mock('zustand/shallow', () => ({
  useShallow: (val: any) => val,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Play: () => <div />,
  Sparkles: () => <div />,
  Save: () => <div />,
  Loader2: () => <div />,
  ArrowLeft: () => <div />,
  Workflow: () => <div />,
  Settings: () => <div />,
  Key: () => <div />,
  Database: () => <div />,
  HelpCircle: () => <div />,
  Moon: () => <div />,
  Search: () => <div />,
}));

// --- HEAVY MOCK OF REACT FLOW (@xyflow/react) ---
vi.mock('@xyflow/react', () => {
    return {
        ReactFlow: ({ children }: { children: React.ReactNode }) => <div data-testid="rf-root">{children}</div>,
        Background: () => <div data-testid="rf-background" />,
        Controls: () => <div data-testid="rf-controls" />,
        MiniMap: () => <div data-testid="rf-minimap" />,
        ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="rf-provider">{children}</div>,
        useReactFlow: () => ({
            screenToFlowPosition: vi.fn((pos) => pos),
            fitView: vi.fn(),
        }),
        useNodesState: () => [[], vi.fn()],
        useEdgesState: () => [[], vi.fn()],
        BackgroundVariant: { Dots: 'dots' },
    };
});

// Mock children components that might be complex
vi.mock('../../components/Sidebar', () => ({
  Sidebar: () => <div data-testid="mock-sidebar" />,
}));

vi.mock('../../components/NodeConfigDrawer', () => ({
  NodeConfigDrawer: () => <div data-testid="mock-node-config-drawer" />,
}));
vi.mock('../../components/ConsoleDrawer', () => ({
  ConsoleDrawer: () => <div data-testid="mock-console-drawer" />,
}));
vi.mock('../../components/SettingsDrawer', () => ({
  SettingsDrawer: () => <div data-testid="mock-settings-drawer" />,
}));
vi.mock('../../components/UsabilityCardsDrawer', () => ({
  UsabilityCardsDrawer: () => <div data-testid="mock-usability-drawer" />,
}));
vi.mock('../../components/ResizableChatPanel', () => ({
  ResizableChatPanel: () => <div data-testid="mock-chat-panel" />,
}));
vi.mock('../../components/ExecutionsTab', () => ({
  default: () => <div data-testid="mock-executions-tab">Mocked Executions Tab</div>
}));
vi.mock('../../components/AboutModal', () => ({
  AboutModal: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div data-testid="mock-about-modal" /> : null,
}));
vi.mock('../../components/Toast', () => ({
  Toast: () => <div data-testid="mock-toast" />,
}));
vi.mock('../../components/ExportDropdown', () => ({
  ExportDropdown: () => <div data-testid="mock-export-dropdown" />,
}));

// AnimationView is a page but it is also used inside Builder
vi.mock('../AnimationView', () => ({
  default: () => <div data-testid="mock-animation-view" />,
}));

describe('Builder Page Smoke Test', () => {
    const mockNavigate = vi.fn();
    const mockParams = { id: 'test-project-id' };

    const defaultStore = {
        nodes: [],
        edges: [],
        onNodesChange: vi.fn(),
        onEdgesChange: vi.fn(),
        onConnect: vi.fn(),
        addNode: vi.fn(),
        validateGraph: vi.fn(() => true),
        theme: 'light',
        isDirty: false,
        isExecuting: false,
        startRealExecution: vi.fn(),
        executionResult: null,
        setIsConsoleExpanded: vi.fn(),
        setIsConsoleOpen: vi.fn(),
        isChatVisible: false,
        setIsChatVisible: vi.fn(),
        resetUIState: vi.fn(),
        loadProject: vi.fn(),
        saveProject: vi.fn(),
        currentProjectId: 'test-project-id',
        isSaving: false,
        resetProject: vi.fn(),
        showNotification: vi.fn(),
        updateProjectMetadata: vi.fn(),
        currentProjectName: 'Test Crew Builder',
        currentProjectDescription: 'Test'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useNavigate as any).mockReturnValue(mockNavigate);
        (useParams as any).mockReturnValue(mockParams);
        (useStore as any).mockImplementation((selector: (state: any) => any) => {
          if (typeof selector !== 'function') return defaultStore;
          return selector(defaultStore);
        });
        (useStore as any).getState = () => defaultStore;
    });

    it('renders without crashing', () => {
        render(
            <MemoryRouter>
                <Builder />
            </MemoryRouter>
        );

        expect(screen.getByText('Test Crew Builder')).toBeInTheDocument();
        expect(screen.getByText('Builder')).toBeInTheDocument(); // Subheading
        expect(screen.getByText('Editor')).toBeInTheDocument(); // Tab button
        expect(screen.getByText('Run Crew')).toBeInTheDocument();
    });
});
