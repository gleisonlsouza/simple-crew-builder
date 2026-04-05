import { render, screen } from '@testing-library/react';
import AnimationView from '../AnimationView';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import React from 'react';

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
      line: motionComponent('line'),
      circle: motionComponent('circle'),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Coffee: () => <div />,
  Gamepad2: () => <div />,
  Sparkles: () => <div />,
  BatteryCharging: () => <div />,
  Search: () => <div />,
  Type: () => <div />,
  Layout: () => <div />,
  Code: () => <div />,
  Globe: () => <div />,
  Database: () => <div />,
  Terminal: () => <div />,
  MessageSquare: () => <div />,
  Bot: () => <div />,
  CheckCircle2: () => <div />,
  X: () => <div />,
  Zap: () => <div />,
  Award: () => <div />,
  BarChart3: () => <div />,
  Activity: () => <div />,
  Monitor: () => <div />,
  Cpu: () => <div />,
  Play: () => <div />,
}));

// Mock animation components
vi.mock('../../components/Animation/RobotIcon', () => ({
  RobotIcon: () => <div data-testid="mock-robot-icon" />,
}));
vi.mock('../../components/Animation/Station', () => ({
  Station: () => <div data-testid="mock-station" />,
}));
vi.mock('../../components/Animation/SimulationLog', () => ({
  SimulationLog: () => <div data-testid="mock-simulation-log" />,
}));
vi.mock('../../components/Animation/ResultComputerScreen', () => ({
  ResultComputerScreen: () => <div data-testid="mock-result-screen" />,
}));

describe('AnimationView Page Smoke Test', () => {
    const defaultStore = {
        nodes: [],
        currentProjectName: 'Test Project',
        isExecuting: false,
        startRealExecution: vi.fn(),
        validateGraph: vi.fn(() => true),
        showNotification: vi.fn(),
        executionResult: null,
        nodeStatuses: {}
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useStore as any).mockReturnValue(defaultStore);
    });

    it('renders without crashing', async () => {
        render(<AnimationView />);
        
        // Wait for the main identifying text to appear (handles async updates in useEffect)
        expect(await screen.findByText(/Simple Crew Builder/i)).toBeInTheDocument();
        
        expect(screen.getByText(/Operation Status/i)).toBeInTheDocument();
        expect(screen.getByText(/START CREW/i)).toBeInTheDocument();
        
        // Legend text
        expect(screen.getByText(/Legend/i)).toBeInTheDocument();
        expect(screen.getByText(/Pending/i)).toBeInTheDocument();
    });
});
