import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeletableEdge } from '../DeletableEdge';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { type EdgeProps, Position } from '@xyflow/react';
import type { AppState } from '../../store/index';
import type { Mock } from 'vitest';

// Mock react-flow components and functions
vi.mock('@xyflow/react', () => ({
  BaseEdge: ({ path, style }: any) => (
    <svg>
      <path d={path} style={style} data-testid="base-edge" />
    </svg>
  ),
  EdgeLabelRenderer: ({ children }: any) => <div data-testid="edge-label-renderer">{children}</div>,
  getSmoothStepPath: vi.fn().mockReturnValue(['M0,0L10,10', 5, 5]),
  Position: {
      Left: 'left',
      Right: 'right',
      Top: 'top',
      Bottom: 'bottom'
  }
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Trash2: () => <div data-testid="icon-trash" />,
}));

// Mock the store
vi.mock('../../store/index', () => ({
  useStore: vi.fn(),
}));

// Mock zustand/shallow
vi.mock('zustand/shallow', () => ({
  useShallow: (fn: (state: AppState) => unknown) => fn,
}));

describe('DeletableEdge', () => {
  const mockDeleteEdge = vi.fn();

  const defaultState = {
    deleteEdge: mockDeleteEdge,
    nodeStatuses: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as Mock).mockImplementation((selector: (state: any) => any) => {
      return selector(defaultState);
    });
  });

  const defaultProps: EdgeProps = {
    id: 'edge-1',
    source: 'node-1',
    target: 'node-2',
    sourceX: 0,
    sourceY: 0,
    targetX: 0,
    targetY: 100,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    style: { stroke: 'black' },
    markerEnd: 'arrow',
    animated: false,
    selected: false,
    label: '',
    labelStyle: {},
    labelShowBg: true,
    labelBgStyle: {},
    labelBgPadding: [0, 0],
    labelBgBorderRadius: 0,
    data: {},
    interactionWidth: 20
  };

  it('renders correctly with path', () => {
    render(
        <svg>
            <DeletableEdge {...defaultProps} />
        </svg>
    );
    expect(screen.getByTestId('base-edge')).toHaveAttribute('d', 'M0,0L10,10');
  });

  it('shows delete button when hovered', async () => {
    render(
        <svg>
            <DeletableEdge {...defaultProps} />
        </svg>
    );
    
    // The invisible path is used for hovering
    const invisiblePath = document.querySelector('path[stroke="transparent"]')!;
    
    // Before hover, button should not be present (conditional rendering)
    expect(screen.queryByLabelText('Excluir conexão')).not.toBeInTheDocument();

    // Trigger hover
    fireEvent.mouseEnter(invisiblePath);
    
    expect(screen.getByLabelText('Excluir conexão')).toBeInTheDocument();
  });

  it('calls deleteEdge when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(
        <svg>
            <DeletableEdge {...defaultProps} />
        </svg>
    );
    
    const invisiblePath = document.querySelector('path[stroke="transparent"]')!;
    fireEvent.mouseEnter(invisiblePath);

    const deleteBtn = screen.getByLabelText('Excluir conexão');
    await user.click(deleteBtn);
    
    expect(mockDeleteEdge).toHaveBeenCalledWith('edge-1');
  });

  it('changes style based on node status (running)', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => 
        selector({ 
            ...defaultState, 
            nodeStatuses: { 'node-1': 'running', 'node-2': 'idle' } 
        })
    );
    
    render(
        <svg>
            <DeletableEdge {...defaultProps} />
        </svg>
    );
    
    const baseEdge = screen.getByTestId('base-edge');
    expect(baseEdge.style.stroke).toBe('rgb(59, 130, 246)'); // #3b82f6 in RGB
    expect(baseEdge.style.strokeWidth).toBe('4');
  });

  it('changes style based on node status (success)', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => 
        selector({ 
            ...defaultState, 
            nodeStatuses: { 'node-1': 'success', 'node-2': 'success' } 
        })
    );
    
    render(
        <svg>
            <DeletableEdge {...defaultProps} />
        </svg>
    );
    
    const baseEdge = screen.getByTestId('base-edge');
    expect(baseEdge.style.stroke).toBe('rgb(16, 185, 129)'); // #10b981 in RGB
  });
});
