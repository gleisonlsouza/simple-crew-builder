import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KnowledgeBaseSettings } from '../KnowledgeBaseSettings';

// Mock lucide-react icons as spans
vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus" />,
  Database: () => <span data-testid="icon-database" />,
  Calendar: () => <span data-testid="icon-calendar" />,
  Loader2: () => <span data-testid="icon-loader" />,
  Info: () => <span data-testid="icon-info" />,
  X: () => <span data-testid="icon-x" />,
  Files: () => <span data-testid="icon-files" />,
  Trash2: () => <span data-testid="icon-trash" />,
  CheckCircle2: () => <span data-testid="icon-check" />,
  AlertTriangle: () => <span data-testid="icon-alert" />,
  Folder: () => <span data-testid="icon-folder" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
  ChevronDown: () => <span data-testid="icon-chevron-down" />,
  Upload: () => <span data-testid="icon-upload" />,
  FileText: () => <span data-testid="icon-file-text" />,
  HardDrive: () => <span data-testid="icon-hard-drive" />,
}));

// Mock child components
vi.mock('../KnowledgeBaseDocumentsModal', () => ({
  KnowledgeBaseDocumentsModal: ({ kb, onClose }: any) => (
    <div data-testid="mock-documents-modal">
      <span>Managing {kb.name}</span>
      <button onClick={onClose}>Close Docs</button>
    </div>
  )
}));

vi.mock('../ConfirmationModal', () => ({
  ConfirmationModal: ({ isOpen, onConfirm, onClose, title }: any) => isOpen ? (
    <div data-testid="mock-confirm-modal">
      <h2>{title}</h2>
      <button onClick={onConfirm}>Confirm Delete</button>
      <button onClick={onClose}>Cancel Delete</button>
    </div>
  ) : null
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('KnowledgeBaseSettings', () => {
  const mockKBs = [
    { id: 'kb-1', name: 'Base Alpha', description: 'Alpha Desc', created_at: '2024-01-01T00:00:00Z' },
    { id: 'kb-2', name: 'Base Beta', description: 'Beta Desc', created_at: '2024-01-02T00:00:00Z' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  const setupFetch = (items: any) => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, init?: any) => {
      if (init?.method === 'POST') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'kb-new', name: 'New Base' }) });
      }
      if (init?.method === 'DELETE') {
        return Promise.resolve({ ok: true });
      }
      // GET
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(items),
      });
    }));
  };

  it('renders loading state then list of knowledge bases', async () => {
    setupFetch(mockKBs);
    render(<KnowledgeBaseSettings />);
    
    expect(screen.getByText(/Loading Knowledge Bases/i)).toBeInTheDocument();
    
    expect(await screen.findByText('Base Alpha')).toBeInTheDocument();
    expect(screen.getByText('Base Beta')).toBeInTheDocument();
    expect(screen.getByText('Alpha Desc')).toBeInTheDocument();
  });

  it('shows empty state when no bases found', async () => {
    setupFetch([]);
    render(<KnowledgeBaseSettings />);
    expect(await screen.findByText(/No Knowledge Bases found/i)).toBeInTheDocument();
  });

  it('handles creation of a new knowledge base', async () => {
    const user = userEvent.setup();
    setupFetch(mockKBs);

    render(<KnowledgeBaseSettings />);
    
    // Open modal
    await user.click(await screen.findByText(/New Base/i));
    
    // Fill form
    const nameInput = screen.getByPlaceholderText(/Ex: Customer Support Docs/i);
    const descInput = screen.getByPlaceholderText(/Briefly describe/i);
    
    await user.type(nameInput, 'New Base');
    await user.type(descInput, 'New Desc');
    
    // Submit
    const createBtn = screen.getByRole('button', { name: /Create/i });
    await user.click(createBtn);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/knowledge-bases'), expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'New Base', description: 'New Desc' })
      }));
    });
  });

  it('handles deletion of a knowledge base', async () => {
    const user = userEvent.setup();
    setupFetch(mockKBs);

    render(<KnowledgeBaseSettings />);
    
    // Click delete on first item
    const deleteBtns = await screen.findAllByTitle(/Delete Knowledge Base/i);
    await user.click(deleteBtns[0]);
    
    // Check confirmation modal
    expect(screen.getByTestId('mock-confirm-modal')).toBeInTheDocument();
    
    // Confirm delete
    await user.click(screen.getByText(/Confirm Delete/i));
    
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/knowledge-bases/kb-1'), expect.objectContaining({
        method: 'DELETE'
      }));
    });
    
    // Verify item is filtered out
    await waitFor(() => {
      expect(screen.queryByText('Base Alpha')).not.toBeInTheDocument();
    });
  });

  it('opens documents management modal', async () => {
    const user = userEvent.setup();
    setupFetch(mockKBs);
    render(<KnowledgeBaseSettings />);
    
    // Explicitly wait for the list to render
    await screen.findByText('Base Alpha');
    
    // Use part of the button text if necessary
    const manageBtn = screen.getAllByText(/Manage Documents/i)[0];
    await user.click(manageBtn);
    
    expect(screen.getByTestId('mock-documents-modal')).toBeInTheDocument();
    expect(screen.getByText('Managing Base Alpha')).toBeInTheDocument();
    
    // Test close
    await user.click(screen.getByText('Close Docs'));
    expect(screen.queryByTestId('mock-documents-modal')).not.toBeInTheDocument();
  });
});
