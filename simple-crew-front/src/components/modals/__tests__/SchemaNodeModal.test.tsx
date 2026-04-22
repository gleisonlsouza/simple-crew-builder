import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SchemaNodeModal } from '../SchemaNodeModal';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../../store/index';
import type { Mock } from 'vitest';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  Save: () => <div data-testid="icon-save" />,
  Plus: () => <div data-testid="icon-plus" />,
  Trash2: () => <div data-testid="icon-trash" />,
  FileJson: () => <div data-testid="icon-file-json" />,
  AlertCircle: () => <div data-testid="icon-alert-circle" />,
}));

// Mock the store
vi.mock('../../../store/index', () => ({
  useStore: vi.fn(),
}));

describe('SchemaNodeModal', () => {
  const mockUpdateNodeData = vi.fn();
  const mockCloseSchemaModal = vi.fn();

  const mockNodes = [
    {
      id: 'schema-1',
      type: 'schema',
      data: {
        name: 'Initial Schema',
        fields: [
          { id: 'f1', key: 'user_name', type: 'string', description: 'User name' }
        ]
      }
    }
  ];

  const defaultState = {
    isSchemaModalOpen: true,
    activeSchemaNodeId: 'schema-1',
    nodes: mockNodes,
    updateNodeData: mockUpdateNodeData,
    closeSchemaModal: mockCloseSchemaModal,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as Mock).mockImplementation((selector: (state: any) => any) => {
      return selector(defaultState);
    });
  });

  it('renders correctly when open', () => {
    render(<SchemaNodeModal />);
    expect(screen.getByText('Extraction Schema (Pydantic)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Initial Schema')).toBeInTheDocument();
    expect(screen.getByDisplayValue('user_name')).toBeInTheDocument();
  });

  it('adds a new field', async () => {
    const user = userEvent.setup();
    render(<SchemaNodeModal />);
    
    const addBtn = screen.getByText('Add Attribute');
    await user.click(addBtn);
    
    const inputs = screen.getAllByPlaceholderText('e.g. user_intent');
    expect(inputs).toHaveLength(2);
  });

  it('removes a field', async () => {
    const user = userEvent.setup();
    render(<SchemaNodeModal />);
    
    const trashBtn = screen.getByTestId('icon-trash').parentElement;
    await user.click(trashBtn!);
    
    expect(screen.queryByDisplayValue('user_name')).not.toBeInTheDocument();
    expect(screen.getByText('No attributes defined yet.')).toBeInTheDocument();
  });

  it('updates local state and saves correctly', async () => {
    const user = userEvent.setup();
    render(<SchemaNodeModal />);
    
    const nameInput = screen.getByDisplayValue('Initial Schema');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Schema Name');
    
    const saveBtn = screen.getByText('Save Schema');
    await user.click(saveBtn);
    
    expect(mockUpdateNodeData).toHaveBeenCalledWith('schema-1', expect.objectContaining({
      name: 'New Schema Name'
    }));
    expect(mockCloseSchemaModal).toHaveBeenCalled();
  });

  it('renders nothing when not open', () => {
    (useStore as unknown as Mock).mockImplementation((selector: (state: any) => any) => {
        return selector({ ...defaultState, isSchemaModalOpen: false });
    });
    const { container } = render(<SchemaNodeModal />);
    expect(container).toBeEmptyDOMElement();
  });
});
