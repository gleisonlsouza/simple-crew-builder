import { render, screen, fireEvent } from '@testing-library/react';
import { WebhookNode } from '../WebhookNode';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { ReactFlowProvider, type NodeProps, type Node } from '@xyflow/react';
import type { AppState } from '../../store/index';
import type { Mock } from 'vitest';
import type { WebhookNodeData } from '../../types/nodes.types';
import React from 'react';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Globe: () => <div data-testid="icon-globe" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Settings: () => <div data-testid="icon-settings" />,
  AlertCircle: () => <div data-testid="icon-alert" />,
  Clock: () => <div data-testid="icon-clock" />,
  Loader2: () => <div data-testid="icon-loader" />,
  CheckCircle2: () => <div data-testid="icon-check" />,
}));

// Mock the store
vi.mock('../../store/index', () => ({
  useStore: vi.fn(),
}));

// Mock zustand/shallow
vi.mock('zustand/shallow', () => ({
  useShallow: (fn: (state: AppState) => unknown) => fn,
}));

// Helper to wrap component with ReactFlowProvider
const wrap = (ui: React.ReactElement) => <ReactFlowProvider>{ui}</ReactFlowProvider>;

describe('WebhookNode', () => {
  const mockUpdateNodeData = vi.fn();
  const mockDeleteNode = vi.fn();
  const mockSetActiveNode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup store mock for both calls in WebhookNode
    (useStore as unknown as Mock).mockImplementation((selector: (state: AppState) => unknown) => {
      const state = {
        deleteNode: mockDeleteNode,
        setActiveNode: mockSetActiveNode,
        updateNodeData: mockUpdateNodeData,
        nodeStatuses: { 'webhook-1': 'idle' },
        nodeErrors: { 'webhook-1': null },
      } as unknown as AppState;
      return selector(state);
    });
  });

  const defaultProps: NodeProps<Node<WebhookNodeData, 'webhook'>> = {
    id: 'webhook-1',
    data: { 
        name: 'Test Webhook', 
        path: 'test-path', 
        isActive: true, 
        waitForResult: false,
        token: 'test-token',
        url: 'http://localhost:5000/webhook/test-path',
        method: 'POST',
        headers: {},
        fieldMappings: {}
    },
    type: 'webhook',
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

  it('renders correctly with toggles', () => {
    render(wrap(<WebhookNode {...defaultProps} />));
    
    expect(screen.getByText('Test Webhook')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Wait')).toBeInTheDocument();
    
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked(); // Active
    expect(checkboxes[1]).not.toBeChecked(); // Wait
  });

  it('calls updateNodeData when toggles are clicked', () => {
    render(wrap(<WebhookNode {...defaultProps} />));
    
    const checkboxes = screen.getAllByRole('checkbox');
    
    // Toggle Active
    fireEvent.click(checkboxes[0]);
    expect(mockUpdateNodeData).toHaveBeenCalledWith('webhook-1', { isActive: false });
    
    // Toggle Wait
    fireEvent.click(checkboxes[1]);
    expect(mockUpdateNodeData).toHaveBeenCalledWith('webhook-1', { waitForResult: true });
  });

  it('displays the path in the footer', () => {
    render(wrap(<WebhookNode {...defaultProps} />));
    expect(screen.getByText(/POST • \/test-path/)).toBeInTheDocument();
  });

  it('calls deleteNode when delete button is clicked', () => {
    render(wrap(<WebhookNode {...defaultProps} />));
    const deleteBtn = screen.getByTitle('Delete node');
    fireEvent.click(deleteBtn);
    expect(mockDeleteNode).toHaveBeenCalledWith('webhook-1');
  });

  it('calls setActiveNode when config button or title is clicked', () => {
    render(wrap(<WebhookNode {...defaultProps} />));
    
    // Title double click
    const title = screen.getByText('Test Webhook');
    fireEvent.doubleClick(title);
    expect(mockSetActiveNode).toHaveBeenCalledWith('webhook-1');

    // Config button click
    const configBtn = screen.getByTitle('Config Webhook');
    fireEvent.click(configBtn);
    expect(mockSetActiveNode).toHaveBeenCalledWith('webhook-1');
  });

  it('handles different statuses correctly', () => {
    const statuses = ['waiting', 'running', 'success', 'error'] as const;
    const icons = ['icon-clock', 'icon-loader', 'icon-check', 'icon-alert'];

    statuses.forEach((status, index) => {
      (useStore as unknown as Mock).mockImplementation((selector: (state: AppState) => unknown) => {
        const state = {
          deleteNode: mockDeleteNode,
          setActiveNode: mockSetActiveNode,
          updateNodeData: mockUpdateNodeData,
          nodeStatuses: { 'webhook-1': status },
          nodeErrors: { 'webhook-1': status === 'error' ? ['Something went wrong'] : null },
        } as unknown as AppState;
        return selector(state);
      });

      const { unmount } = render(wrap(<WebhookNode {...defaultProps} />));
      expect(screen.getByTestId(icons[index])).toBeInTheDocument();
      unmount();
    });
  });

  it('renders default name when data.name is missing', () => {
    const propsNoName = {
      ...defaultProps,
      data: { ...defaultProps.data, name: '' }
    };
    render(wrap(<WebhookNode {...propsNoName} />));
    expect(screen.getByText('New Webhook')).toBeInTheDocument();
  });

  it('renders "No Path" when data.path is missing', () => {
    const propsNoPath = {
      ...defaultProps,
      data: { ...defaultProps.data, path: '' }
    };
    render(wrap(<WebhookNode {...propsNoPath} />));
    expect(screen.getByText(/POST • No Path/)).toBeInTheDocument();
  });
});
