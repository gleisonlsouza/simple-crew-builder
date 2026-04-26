import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import type { Mock } from 'vitest';
import React from 'react';

// Mock react-flow
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useReactFlow: vi.fn(),
    ReactFlowProvider: ({ children }: any) => <div>{children}</div>,
  };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  User: () => <div data-testid="icon-user" />,
  CheckSquare: () => <div data-testid="icon-check-square" />,
  Users: () => <div data-testid="icon-users" />,
  Upload: () => <div data-testid="icon-upload" />,
  Settings: () => <div data-testid="icon-settings" />,
  PlusCircle: () => <div data-testid="icon-plus-circle" />,
  FolderOpen: () => <div data-testid="icon-folder-open" />,
  X: () => <div data-testid="icon-x" />,
  ExternalLink: () => <div data-testid="icon-external-link" />,
  Plus: () => <div data-testid="icon-plus" />,
  LayoutTemplate: () => <div data-testid="icon-layout" />,
  ChevronLeft: () => <div data-testid="icon-chevron-left" />,
  ChevronRight: () => <div data-testid="icon-chevron-right" />,
}));

// Mock the store
vi.mock('../../store/index', () => ({
  useStore: Object.assign(vi.fn(), {
    getState: vi.fn(),
  }),
}));

// Mock toast
const { mockToast } = vi.hoisted(() => {
  const t = vi.fn();
  (t as any).success = vi.fn();
  (t as any).error = vi.fn();
  return { mockToast: t };
});

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

describe('Sidebar (Builder Node Palette)', () => {
  const mockFitView = vi.fn();
  const mockAddNodeWithAutoPosition = vi.fn();
  const mockLoadProjectJson = vi.fn().mockReturnValue(true);
  const mockSetIsSettingsOpen = vi.fn();
  const mockSetIsUsabilityDrawerOpen = vi.fn();
  const mockUpdateProjectWorkspaceId = vi.fn();
  const mockUpdateSettings = vi.fn();
  const mockSetIsSidebarCollapsed = vi.fn();

  const defaultState = {
    workspaces: [{ id: 'ws-1', name: 'Test Workspace', path: '/test' }],
    activeWorkspaceId: null,
    currentProjectId: 'proj-1',
    currentProjectWorkspaceId: null,
    isSidebarCollapsed: false,
    addNodeWithAutoPosition: mockAddNodeWithAutoPosition,
    loadProjectJson: mockLoadProjectJson,
    setIsSettingsOpen: mockSetIsSettingsOpen,
    setIsUsabilityDrawerOpen: mockSetIsUsabilityDrawerOpen,
    updateProjectWorkspaceId: mockUpdateProjectWorkspaceId,
    updateSettings: mockUpdateSettings,
    setIsExplorerOpen: vi.fn(),
    setCurrentExplorerWsId: vi.fn(),
    setIsSidebarCollapsed: mockSetIsSidebarCollapsed,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useReactFlow as Mock).mockReturnValue({ fitView: mockFitView });
    (useStore as unknown as Mock).mockImplementation((selector: (state: any) => any) => {
      return selector(defaultState);
    });
    (useStore.getState as Mock).mockReturnValue(defaultState);
  });

  const wrap = (ui: React.ReactElement) => (
    <ReactFlowProvider>
      {ui}
    </ReactFlowProvider>
  );

  it('renders correctly with default state', () => {
    render(wrap(<Sidebar />));
    expect(screen.getByText('Components')).toBeInTheDocument();
    expect(screen.getByText('Crew')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Task')).toBeInTheDocument();
    expect(screen.getByText('Workspaces')).toBeInTheDocument();
  });

  it('adds a node when the plus button is clicked', async () => {
    render(wrap(<Sidebar />));
    const addCrewBtn = screen.getByLabelText('Add Crew to canvas');
    fireEvent.click(addCrewBtn);
    
    expect(mockAddNodeWithAutoPosition).toHaveBeenCalledWith('crew', expect.any(Object));
    await waitFor(() => expect(mockFitView).toHaveBeenCalled(), { timeout: 1000 });
  });

  it('sets drag data on drag start', () => {
    render(wrap(<Sidebar />));
    const crewNode = screen.getByText('Crew').closest('div[draggable]')!;
    
    const dataTransfer = { setData: vi.fn(), effectAllowed: '' };
    fireEvent.dragStart(crewNode, { dataTransfer });
    
    expect(dataTransfer.setData).toHaveBeenCalledWith('application/reactflow', 'crew');
    expect(dataTransfer.effectAllowed).toBe('move');
  });

  it('calls setIsSidebarCollapsed when toggle button is clicked', () => {
    render(wrap(<Sidebar />));
    const toggleBtn = screen.getByLabelText('Collapse Sidebar');
    fireEvent.click(toggleBtn);
    expect(mockSetIsSidebarCollapsed).toHaveBeenCalledWith(true);
  });

  it('renders collapsed state correctly', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => 
        selector({ ...defaultState, isSidebarCollapsed: true })
    );
    render(wrap(<Sidebar />));
    expect(screen.queryByText('Components')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Expand Sidebar')).toBeInTheDocument();
    
    fireEvent.click(screen.getByLabelText('Expand Sidebar'));
    expect(mockSetIsSidebarCollapsed).toHaveBeenCalledWith(false);
  });

  it('opens usability drawer', () => {
    render(wrap(<Sidebar />));
    const usabilityBtn = screen.getByTestId('btn-open-usability-drawer');
    fireEvent.click(usabilityBtn);
    expect(mockSetIsUsabilityDrawerOpen).toHaveBeenCalledWith(true);
  });

  it('handles workspace linking', async () => {
    render(wrap(<Sidebar />));
    const linkBtn = screen.getByText('Link Workspace');
    fireEvent.click(linkBtn);
    
    const wsOption = screen.getByText('Test Workspace');
    fireEvent.click(wsOption);
    
    expect(mockUpdateProjectWorkspaceId).toHaveBeenCalledWith('ws-1');
  });

  it('handles workspace unlinking', () => {
    (useStore as unknown as Mock).mockImplementation((selector: any) => 
        selector({ ...defaultState, currentProjectWorkspaceId: 'ws-1' })
    );
    
    render(wrap(<Sidebar />));
    const unlinkBtn = screen.getByTitle('Remove from Workflow');
    fireEvent.click(unlinkBtn);
    
    expect(mockUpdateProjectWorkspaceId).toHaveBeenCalledWith(null);
  });

  it('triggers file input for JSON import', () => {
    render(wrap(<Sidebar />));
    const importBtn = screen.getByTitle('Import JSON');
    
    // Check if clicking the button triggers the hidden input
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const inputClickSpy = vi.spyOn(input, 'click');
    
    fireEvent.click(importBtn);
    expect(inputClickSpy).toHaveBeenCalled();
  });

  it('opens settings drawer from footer', () => {
    render(wrap(<Sidebar />));
    const settingsBtn = screen.getByTitle('Settings');
    fireEvent.click(settingsBtn);
    expect(mockSetIsSettingsOpen).toHaveBeenCalledWith(true);
  });
});
