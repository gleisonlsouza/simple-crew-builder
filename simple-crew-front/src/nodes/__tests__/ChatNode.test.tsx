import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatNode } from '../ChatNode';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { ReactFlowProvider, type NodeProps, type Node, Position } from '@xyflow/react';
import type { AppState } from '../../store/index';
import type { Mock } from 'vitest';
import type { ChatNodeData } from '../../types/nodes.types';
import React from 'react';

// Mock Handle component
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    Handle: ({ type, id }: any) => <div data-testid={`handle-${type}`} data-handleid={id} className={`react-flow__handle-${type}`} />,
  };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  MessageCircle: () => <div data-testid="icon-message-circle" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Settings: () => <div data-testid="icon-settings" />,
}));

// Mock the store
const mockSetIsChatVisible = vi.fn();
vi.mock('../../store/index', () => ({
  useStore: Object.assign(vi.fn(), {
    getState: () => ({
      setIsChatVisible: mockSetIsChatVisible,
    }),
  }),
}));

// Mock zustand/shallow
vi.mock('zustand/shallow', () => ({
  useShallow: (fn: (state: AppState) => unknown) => fn,
}));

// Helper to wrap component with ReactFlowProvider
const wrap = (ui: React.ReactElement) => <ReactFlowProvider>{ui}</ReactFlowProvider>;

describe('ChatNode', () => {
  const mockDeleteNode = vi.fn();
  const mockSetActiveNode = vi.fn();

  const defaultState = {
    deleteNode: mockDeleteNode,
    setActiveNode: mockSetActiveNode,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as Mock).mockImplementation((selector: (state: any) => any) => {
      return selector(defaultState);
    });
  });

  const defaultProps: NodeProps<Node<ChatNodeData, 'chat'>> = {
    id: 'chat-1',
    data: { 
      name: 'Test Chat', 
      description: 'Test Description',
    },
    type: 'chat',
    selected: false,
    zIndex: 0,
    isConnectable: true,
    dragging: false,
    dragHandle: '',
    selectable: true,
    deletable: true,
    draggable: true,
    parentId: undefined,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  };

  it('renders correctly with name and description', () => {
    render(wrap(<ChatNode {...defaultProps} />));
    expect(screen.getByText('Test Chat')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('renders default name and description when not provided', () => {
    const props = { ...defaultProps, data: { ...defaultProps.data, name: '', description: '' } };
    render(wrap(<ChatNode {...props} />));
    expect(screen.getByText('Chat Trigger')).toBeInTheDocument();
    expect(screen.getByText('Aguardando mensagem do usuário...')).toBeInTheDocument();
  });

  it('contains mandatory source handle', () => {
    render(wrap(<ChatNode {...defaultProps} />));
    const handle = screen.getByTestId('handle-source');
    expect(handle).toBeInTheDocument();
  });

  it('calls setActiveNode when clicking the node container', () => {
    const { container } = render(wrap(<ChatNode {...defaultProps} />));
    fireEvent.click(container.firstChild!);
    expect(mockSetActiveNode).toHaveBeenCalledWith('chat-1');
  });

  it('calls deleteNode when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(wrap(<ChatNode {...defaultProps} />));
    await user.click(screen.getByTitle('Delete node'));
    expect(mockDeleteNode).toHaveBeenCalledWith('chat-1');
  });

  it('calls setActiveNode when config button is clicked', async () => {
    const user = userEvent.setup();
    render(wrap(<ChatNode {...defaultProps} />));
    await user.click(screen.getByLabelText('Config Node'));
    expect(mockSetActiveNode).toHaveBeenCalledWith('chat-1');
  });

  it('calls setIsChatVisible when Open Chat button is clicked', async () => {
    const user = userEvent.setup();
    render(wrap(<ChatNode {...defaultProps} />));
    await user.click(screen.getByText('Open Chat'));
    expect(mockSetIsChatVisible).toHaveBeenCalledWith(true);
  });
});
