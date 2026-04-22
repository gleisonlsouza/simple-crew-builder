import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StateNodeModal } from '../StateNodeModal';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../../store/index';
import type { Mock } from 'vitest';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  Save: () => <div data-testid="icon-save" />,
  Plus: () => <div data-testid="icon-plus" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Database: () => <div data-testid="icon-database" />,
  AlertCircle: () => <div data-testid="icon-alert-circle" />,
}));

// Mock the store
vi.mock('../../../store/index', () => ({
  useStore: vi.fn(),
}));

describe('StateNodeModal', () => {
  const mockUpdateNodeData = vi.fn();
  const mockCloseStateModal = vi.fn();

  const mockNodes = [
    {
      id: 'state-1',
      type: 'state',
      data: {
        name: 'Initial State',
        fields: [
          { id: 'f1', key: 'messages', type: 'list', reducer: 'append', defaultValue: '[]' }
        ]
      }
    },
    {
        id: 'schema-1',
        type: 'schema',
        data: { name: 'UserSchema' }
    }
  ];

  const defaultState = {
    isStateModalOpen: true,
    activeStateNodeId: 'state-1',
    nodes: mockNodes,
    updateNodeData: mockUpdateNodeData,
    closeStateModal: mockCloseStateModal,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as Mock).mockImplementation((selector: (state: any) => any) => {
      return selector(defaultState);
    });
  });

  it('renders correctly when open', () => {
    render(<StateNodeModal />);
    expect(screen.getByText('State Schema Configuration')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Initial State')).toBeInTheDocument();
    expect(screen.getByDisplayValue('messages')).toBeInTheDocument();
  });

  it('discovers schema types from nodes', () => {
    render(<StateNodeModal />);
    screen.getByDisplayValue('List');
    expect(screen.getByText('UserSchema')).toBeInTheDocument();
  });

  it('adds a new field', async () => {
    const user = userEvent.setup();
    render(<StateNodeModal />);
    
    const addBtn = screen.getByText('Add Field');
    await user.click(addBtn);
    
    const inputs = screen.getAllByPlaceholderText('messages, context, etc.');
    expect(inputs).toHaveLength(2);
  });

  it('removes a field', async () => {
    const user = userEvent.setup();
    render(<StateNodeModal />);
    
    const trashBtn = screen.getByTestId('icon-trash').parentElement;
    await user.click(trashBtn!);
    
    expect(screen.queryByDisplayValue('messages')).not.toBeInTheDocument();
    expect(screen.getByText('No fields defined yet.')).toBeInTheDocument();
  });

  it('updates local state and saves correctly', async () => {
    const user = userEvent.setup();
    render(<StateNodeModal />);
    
    const nameInput = screen.getByDisplayValue('Initial State');
    await user.clear(nameInput);
    await user.type(nameInput, 'New State Name');
    
    const saveBtn = screen.getByText('Save State');
    await user.click(saveBtn);
    
    expect(mockUpdateNodeData).toHaveBeenCalledWith('state-1', expect.objectContaining({
      name: 'New State Name'
    }));
    expect(mockCloseStateModal).toHaveBeenCalled();
  });

  it('renders nothing when not open', () => {
    (useStore as unknown as Mock).mockImplementation((selector: (state: any) => any) => {
        return selector({ ...defaultState, isStateModalOpen: false });
    });
    const { container } = render(<StateNodeModal />);
    expect(container).toBeEmptyDOMElement();
  });
});
