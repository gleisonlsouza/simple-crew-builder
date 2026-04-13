import { render, screen } from '@testing-library/react';
import SettingsPage from '../Settings';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { MemoryRouter, useNavigate } from 'react-router-dom';

// Mock react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

// Mock the store
vi.mock('../../store/index', () => ({
  useStore: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div />,
  Key: () => <div />,
  Cpu: () => <div />,
  Eye: () => <div />,
  EyeOff: () => <div />,
  Plus: () => <div />,
  Trash2: () => <div />,
  Calendar: () => <div />,
  ChevronRight: () => <div />,
  X: () => <div />,
  ShieldCheck: () => <div />,
  Copy: () => <div />,
  Wrench: () => <div />,
  Server: () => <div />,
  Settings2: () => <div />,
  PlusCircle: () => <div />,
  Hash: () => <div />,
  Search: () => <div />,
  Sparkles: () => <div />,
  Network: () => <div />,
  Code: () => <div />,
  Edit: () => <div />,
  Terminal: () => <div />,
  FileCode: () => <div />,
  FolderOpen: () => <div />,
  Layout: () => <div />,
  Type: () => <div />,
  Database: () => <div />,
}));

// Mock child components
vi.mock('../../components/HighlightedTextField', () => ({
  default: () => <div data-testid="mock-highlighted-text-field" />,
}));
vi.mock('../../components/CustomSelect', () => ({
  CustomSelect: () => <div data-testid="mock-custom-select" />,
}));
vi.mock('../../components/ConfirmationModal', () => ({
  ConfirmationModal: () => <div data-testid="mock-confirmation-modal" />,
}));
vi.mock('../../components/KnowledgeBaseSettings', () => ({
  KnowledgeBaseSettings: () => <div data-testid="mock-kb-settings" />,
}));

describe('Settings Page Smoke Test', () => {
    const mockNavigate = vi.fn();

    const defaultStore = {
        credentials: [],
        addCredential: vi.fn(),
        updateCredential: vi.fn(),
        deleteCredential: vi.fn(),
        fetchCredentials: vi.fn(),
        models: [],
        addModel: vi.fn(),
        updateModel: vi.fn(),
        deleteModel: vi.fn(),
        setDefaultModelConfig: vi.fn(),
        fetchModels: vi.fn(),
        duplicateModel: vi.fn(),
        globalTools: [],
        updateToolConfig: vi.fn(),
        customTools: [],
        addCustomTool: vi.fn(),
        updateCustomTool: vi.fn(),
        deleteCustomTool: vi.fn(),
        mcpServers: [],
        addMCPServer: vi.fn(),
        updateMCPServer: vi.fn(),
        deleteMCPServer: vi.fn(),
        systemAiModelId: null,
        setSystemAiModelId: vi.fn(),
        embeddingModelId: null,
        setEmbeddingModelId: vi.fn(),
        fetchSettings: vi.fn(),
        workspaces: [],
        fetchWorkspaces: vi.fn(),
        addWorkspace: vi.fn(),
        updateWorkspace: vi.fn(),
        deleteWorkspace: vi.fn(),
        activeWorkspaceId: null,
        setActiveWorkspaceId: vi.fn(),
        fetchCustomTools: vi.fn(),
        fetchMCPServers: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useNavigate as any).mockReturnValue(mockNavigate);
        (useStore as any).mockReturnValue(defaultStore);
    });

    it('renders without crashing', () => {
        render(
            <MemoryRouter>
                <SettingsPage />
            </MemoryRouter>
        );

        // Sidebar title
        expect(screen.getByText('Settings')).toBeInTheDocument();
        // Active tab header
        expect(screen.getByRole('heading', { name: /Credentials/i })).toBeInTheDocument();
        // Tabs
        expect(screen.getByText('Tools')).toBeInTheDocument();
        expect(screen.getByText('MCP Servers')).toBeInTheDocument();
    });
});
