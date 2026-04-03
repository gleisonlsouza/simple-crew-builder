import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WebhookMapperModal } from '../WebhookMapperModal';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  Zap: () => <div data-testid="icon-zap" />,
  Search: () => <div data-testid="icon-search" />,
  ChevronRight: () => <div data-testid="icon-chevron-right" />,
  ChevronDown: () => <div data-testid="icon-chevron-down" />,
  ListTree: () => <div data-testid="icon-list-tree" />,
  GripVertical: () => <div data-testid="icon-grip" />,
}));

// Mock dnd-kit (since dragging is hard to simulate in JSDOM)
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({
    isOver: false,
    setNodeRef: () => {},
  }),
}));

describe('WebhookMapperModal', () => {
  let mockProps: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProps = {
      isOpen: true,
      onClose: vi.fn(),
      data: {
        fieldMappings: { 'topic': '{{ $json.subject }}' }
      },
      nodeId: 'node-1',
      updateNodeData: vi.fn(),
      allProjectVariables: ['topic', 'language', 'city']
    };
  });

  it('renders nothing when closed', () => {
    const { container } = render(<WebhookMapperModal {...mockProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders structural elements when open', () => {
    render(<WebhookMapperModal {...mockProps} />);
    expect(screen.getByText('Visual Input Mapper')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste a sample JSON/i)).toBeInTheDocument();
  });

  it('shows error on invalid JSON', () => {
    render(<WebhookMapperModal {...mockProps} />);
    const textarea = screen.getByPlaceholderText(/Paste a sample JSON/i);
    
    // Partially invalid JSON
    fireEvent.change(textarea, { target: { value: '{ "invalid": }' } });
    expect(screen.getByText(/Invalid JSON:/i)).toBeInTheDocument();
  });

  it('renders JSON tree when valid JSON is provided', async () => {
    render(<WebhookMapperModal {...mockProps} />);
    const textarea = screen.getByPlaceholderText(/Paste a sample JSON/i);
    
    const validJson = '{"user": {"name": "Gleison", "age": 30}}';
    fireEvent.change(textarea, { target: { value: validJson } });
    
    // Verify textarea has the value
    expect(textarea).toHaveValue(validJson);
    
    // We need to wait for the tree to render (async state update)
    await waitFor(() => {
      expect(screen.getByText('root')).toBeInTheDocument();
      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('age')).toBeInTheDocument();
    });
  });

  it('filters project variables by search query', () => {
    render(<WebhookMapperModal {...mockProps} />);
    
    expect(screen.getByText('topic')).toBeInTheDocument();
    expect(screen.getByText('language')).toBeInTheDocument();
    expect(screen.getByText('city')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('Search variables...');
    fireEvent.change(searchInput, { target: { value: 'cit' } });

    expect(screen.queryByText('topic')).not.toBeInTheDocument();
    expect(screen.getByText('city')).toBeInTheDocument();
  });

  it('clears a mapping when X is clicked', () => {
    render(<WebhookMapperModal {...mockProps} />);
    
    // Header has one X, each mapped variable has one X
    // We want to click the one in the variable list
    const clearBtns = screen.getAllByTestId('icon-x');
    // The first X is the Header close button (223), the second is the mapping clear (72)
    fireEvent.click(clearBtns[1]);

    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-1', {
      fieldMappings: {}
    });
  });

  it('calls onClose when Done is clicked', () => {
    render(<WebhookMapperModal {...mockProps} />);
    fireEvent.click(screen.getByText('Done'));
    expect(mockProps.onClose).toHaveBeenCalled();
  });
});
