import { render, screen, fireEvent } from '@testing-library/react';
import { MainSidebar } from '../MainSidebar';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/index';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import type { AppState } from '../../store/index';
import type { Mock } from 'vitest';
import React from 'react';

// Mock react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: vi.fn(),
  };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Workflow: () => <div data-testid="icon-workflow" />,
  Settings: () => <div data-testid="icon-settings" />,
  Key: () => <div data-testid="icon-key" />,
  Moon: () => <div data-testid="icon-moon" />,
  HelpCircle: () => <div data-testid="icon-help" />,
  Database: () => <div data-testid="icon-database" />,
}));

// Mock the store
vi.mock('../../store/index', () => ({
  useStore: vi.fn(),
}));

describe('MainSidebar', () => {
  const mockNavigate = vi.fn();
  const mockSetIsSettingsOpen = vi.fn();
  const mockSetIsAboutModalOpen = vi.fn();

  const defaultState = {
    setIsSettingsOpen: mockSetIsSettingsOpen,
    setIsAboutModalOpen: mockSetIsAboutModalOpen,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as Mock).mockReturnValue(mockNavigate);
    (useLocation as Mock).mockReturnValue({ pathname: '/' });
    (useStore as unknown as Mock).mockImplementation((selector: (state: any) => any) => {
      return selector(defaultState);
    });
  });

  const wrap = (ui: React.ReactElement) => (
    <MemoryRouter>
      {ui}
    </MemoryRouter>
  );

  it('renders logo and main navigation links', () => {
    render(wrap(<MainSidebar />));
    expect(screen.getByAltText('Logo')).toBeInTheDocument();
    expect(screen.getByLabelText('Workflows')).toBeInTheDocument();
    expect(screen.getByLabelText('Credentials')).toBeInTheDocument();
    expect(screen.getByLabelText('Knowledge Base')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
  });

  it('highlights the active link (Dashboard)', () => {
    (useLocation as Mock).mockReturnValue({ pathname: '/' });
    render(wrap(<MainSidebar />));
    const workflowBtn = screen.getByLabelText('Workflows');
    expect(workflowBtn.className).toContain('bg-indigo-50');
  });

  it('highlights the active link when in a workflow', () => {
    (useLocation as Mock).mockReturnValue({ pathname: '/workflow/123' });
    render(wrap(<MainSidebar />));
    const workflowBtn = screen.getByLabelText('Workflows');
    expect(workflowBtn.className).toContain('bg-indigo-50');
  });

  it('navigates to dashboard when logo is clicked', () => {
    render(wrap(<MainSidebar />));
    fireEvent.click(screen.getByAltText('Logo'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('navigates to dashboard when workflow button is clicked', () => {
    render(wrap(<MainSidebar />));
    fireEvent.click(screen.getByLabelText('Workflows'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('opens and closes settings menu', () => {
    render(wrap(<MainSidebar />));
    const settingsBtn = screen.getByLabelText('Settings');
    
    // Open
    fireEvent.click(settingsBtn);
    expect(screen.getByText('Theme')).toBeInTheDocument();
    
    // Close by clicking again (toggle)
    fireEvent.click(settingsBtn);
    expect(screen.queryByText('Theme')).not.toBeInTheDocument();
  });

  it('navigates to settings page from menu', () => {
    render(wrap(<MainSidebar />));
    const settingsBtn = screen.getByLabelText('Settings');
    fireEvent.click(settingsBtn);
    
    const settingsLink = screen.getByText('Settings');
    fireEvent.click(settingsLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('opens settings drawer from menu', () => {
    render(wrap(<MainSidebar />));
    const settingsBtn = screen.getByLabelText('Settings');
    fireEvent.click(settingsBtn);
    
    const themeBtn = screen.getByText('Theme');
    fireEvent.click(themeBtn);
    
    expect(mockSetIsSettingsOpen).toHaveBeenCalledWith(true);
  });

  it('opens about modal when help button is clicked', () => {
    render(wrap(<MainSidebar />));
    const helpBtn = screen.getByLabelText('About');
    fireEvent.click(helpBtn);
    expect(mockSetIsAboutModalOpen).toHaveBeenCalledWith(true);
  });
});
