import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsDrawer } from '../SettingsDrawer';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useStore } from '../../store/index';
import type { Mock } from 'vitest';

// Mock the store
vi.mock('../../store/index', () => ({
  useStore: vi.fn(),
}));

// Mock KnowledgeBaseSettings (as suggested by the user, although it seems it might be in a different page)
vi.mock('../KnowledgeBaseSettings', () => ({
  KnowledgeBaseSettings: () => <span data-testid="mock-kb-settings" />
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: ({ className }: any) => <span data-testid="icon-x" className={className} />,
  Moon: ({ className }: any) => <span data-testid="icon-moon" className={className} />,
  Sun: ({ className }: any) => <span data-testid="icon-sun" className={className} />,
  Bell: ({ className }: any) => <span data-testid="icon-bell" className={className} />,
  Shield: ({ className }: any) => <span data-testid="icon-shield" className={className} />,
  Info: ({ className }: any) => <span data-testid="icon-info" className={className} />,
  Plus: ({ className }: any) => <span data-testid="icon-plus" className={className} />,
  FolderOpen: ({ className }: any) => <span data-testid="icon-folder" className={className} />,
  ChevronDown: ({ className }: any) => <span data-testid="icon-chevron-down" className={className} />,
  Rows: ({ className }: any) => <span data-testid="icon-rows" className={className} />,
  Columns: ({ className }: any) => <span data-testid="icon-columns" className={className} />,
}));

// Mock fetch globally
vi.stubGlobal('fetch', vi.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
));

describe('SettingsDrawer', () => {
  const mockSetIsSettingsOpen = vi.fn();
  const mockToggleTheme = vi.fn();
  const mockAddWorkspace = vi.fn().mockResolvedValue(undefined);
  const mockUpdateProjectWorkspaceId = vi.fn();

  const defaultState = {
    isSettingsOpen: true,
    setIsSettingsOpen: mockSetIsSettingsOpen,
    theme: 'dark',
    toggleTheme: mockToggleTheme,
    currentProjectId: 'p1',
    currentProjectWorkspaceId: null,
    updateProjectWorkspaceId: mockUpdateProjectWorkspaceId,
    workspaces: [{ id: 'ws1', name: 'WS 1', path: '/ws1' }],
    addWorkspace: mockAddWorkspace,
    deleteWorkspace: vi.fn(),
    setIsExplorerOpen: vi.fn(),
    setCurrentExplorerWsId: vi.fn(),
    canvasLayout: 'vertical',
    setCanvasLayout: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector(defaultState));
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders nothing when closed', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => selector({
      ...defaultState,
      isSettingsOpen: false,
    }));
    const { container } = render(<SettingsDrawer />);
    expect(container.firstChild).toBeNull();
  });

  it('renders settings sections correctly', () => {
    render(<SettingsDrawer />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('System Theme')).toBeInTheDocument();
    expect(screen.getByText('Project Environment')).toBeInTheDocument();
    expect(screen.getByText('Workspaces Management')).toBeInTheDocument();
  });

  it('calls toggleTheme when theme buttons are clicked', () => {
    render(<SettingsDrawer />);
    const lightBtn = screen.getByText('Light');
    fireEvent.click(lightBtn);
    expect(mockToggleTheme).toHaveBeenCalled();
  });

  it('calls setIsSettingsOpen(false) when X is clicked', async () => {
    render(<SettingsDrawer />);
    // Select the first X icon (header)
    const closeIcons = screen.getAllByTestId('icon-x');
    const closeBtn = closeIcons[0].parentElement;
    fireEvent.click(closeBtn!);
    await waitFor(() => {
      expect(mockSetIsSettingsOpen).toHaveBeenCalledWith(false);
    });
  });

  it('handles workspace selection', () => {
    render(<SettingsDrawer />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'ws1' } });
    expect(mockUpdateProjectWorkspaceId).toHaveBeenCalledWith('ws1');
  });

  it('opens workspace add form and handles submission', async () => {
    render(<SettingsDrawer />);
    const addBtn = screen.getByText('Add Workspace');
    fireEvent.click(addBtn);
    
    const nameInput = screen.getByPlaceholderText(/Research Hub/i);
    const pathInput = screen.getByPlaceholderText(/workspaces\/research/i);
    
    fireEvent.change(nameInput, { target: { value: 'New WS' } });
    fireEvent.change(pathInput, { target: { value: '/new-ws' } });
    
    const saveBtn = screen.getByText('Save Workspace');
    fireEvent.click(saveBtn);
    
    await waitFor(() => {
      expect(mockAddWorkspace).toHaveBeenCalledWith({ name: 'New WS', path: '/new-ws' });
    });
  });
});
