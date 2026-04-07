import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';

// Neutralizar Portais e Redimensionar o Tempo para o JSDOM
vi.setConfig({ testTimeout: 30000 });
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node, 
  };
});

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KnowledgeBaseDocumentsModal } from '../KnowledgeBaseDocumentsModal';
import { useStore } from '../../store/index';

// Mock de ícones (Lucide)
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x" />,
  Upload: () => <span data-testid="icon-upload" />,
  FileText: () => <span data-testid="icon-file-text" />,
  Loader2: () => <span data-testid="icon-loader" />,
  HardDrive: () => <span data-testid="icon-hard-drive" />,
  CheckCircle2: () => <span data-testid="icon-check" />,
  Trash2: () => <span data-testid="icon-trash" />,
  AlertTriangle: () => <span data-testid="icon-alert" />,
  Folder: () => <span data-testid="icon-folder" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
  ChevronDown: () => <span data-testid="icon-chevron-down" />,
}));

// Mock do Modal de Confirmação
vi.mock('../ConfirmationModal', () => ({
  ConfirmationModal: ({ isOpen, onConfirm, title }: any) => isOpen ? (
    <div data-testid="mock-confirm-modal">
      <h2>{title}</h2>
      <button data-testid="confirm-btn" onClick={onConfirm}>Confirm Delete</button>
    </div>
  ) : null
}));

// Mock da Store Zustand
vi.mock('../../store/index', () => ({
  useStore: vi.fn()
}));

// Mock do Toast
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() }
}));

describe('KnowledgeBaseDocumentsModal', () => {
  const mockKB = { 
    id: 'kb-1', 
    name: 'KB Alpha', 
    embeddingModel: 'model-123', // Adicionado como sugerido
    created_at: '2024-01-01' 
  } as any;
  const mockDocs = [{ id: 'doc-1', filename: 'test.pdf', size: 100, created_at: '2024' }];
  const mockOnClose = vi.fn();
  let fetchSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset Default Store Mock
    vi.mocked(useStore).mockImplementation((selector: any) => selector({
      embeddingModelId: 'model-123',
      models: [{ id: 'model-123', name: 'Embed Model', model_type: 'EMBEDDING' }],
    }));

    fetchSpy = vi.fn().mockImplementation((url) => {
      const isDocList = url.includes('/documents') && !url.includes('POST') && !url.includes('DELETE');
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(isDocList ? mockDocs : [{ id: 'new', filename: 'new.pdf' }])
      });
    });
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders and allows closing', async () => {
    const user = userEvent.setup();
    render(<KnowledgeBaseDocumentsModal kb={mockKB} onClose={mockOnClose} />);
    expect(await screen.findByText('KB Alpha')).toBeInTheDocument();
    
    const closeBtn = screen.getByRole('button', { name: /Close/i });
    await user.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles loading state and file tree', async () => {
    render(<KnowledgeBaseDocumentsModal kb={mockKB} onClose={mockOnClose} />);
    expect(await screen.findByText('test.pdf')).toBeInTheDocument();
  });

  it('shows error on upload if embedding model is missing', async () => {
    // Override local para este teste específico
    vi.mocked(useStore).mockImplementation((selector: any) => selector({
      embeddingModelId: null,
      models: [],
    }));

    render(<KnowledgeBaseDocumentsModal kb={mockKB} onClose={mockOnClose} />);
    const uploadArea = (await screen.findByText(/Embedding Model Missing/i)).parentElement;
    fireEvent.click(uploadArea!);
    
    const toast = (await import('react-hot-toast')).default;
    expect(toast.error).toHaveBeenCalled();
  });

  it('triggers upload fetch', async () => {
    vi.setConfig({ testTimeout: 60000 });
    // Garantir que o store esteja correto para o upload
    vi.mocked(useStore).mockImplementation((selector: any) => selector({
      embeddingModelId: 'model-123',
      models: [{ id: 'model-123', name: 'Embed Model', model_type: 'EMBEDDING' }],
    }));

    render(<KnowledgeBaseDocumentsModal kb={mockKB} onClose={mockOnClose} />);
    await screen.findByText('test.pdf');
    
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    const fileList = [file];
    Object.setPrototypeOf(fileList, FileList.prototype);
    
    fireEvent.change(input, {
      target: {
        files: fileList
      }
    });

    await waitFor(() => {
      const postCall = fetchSpy.mock.calls.find((c: any) => c[1]?.method === 'POST');
      expect(postCall).toBeDefined();
    }, { timeout: 15000 });
  });

  it('triggers delete fetch', async () => {
    const user = userEvent.setup({ delay: null });
    render(<KnowledgeBaseDocumentsModal kb={mockKB} onClose={mockOnClose} />);
    await screen.findByText('test.pdf');
    
    const trashIcons = await screen.findAllByTestId('icon-trash');
    const deleteBtn = trashIcons[0].closest('button');
    
    await user.click(deleteBtn!);
    
    const confirmBtn = await screen.findByTestId('confirm-btn');
    await user.click(confirmBtn);
    
    await waitFor(() => {
      const deleteCall = fetchSpy.mock.calls.find((c: any) => c[1]?.method === 'DELETE');
      expect(deleteCall).toBeDefined();
    }, { timeout: 15000 });
  });
});
