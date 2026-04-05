import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';

// --- CHEAT CODE: Portals Neutralization (Hoisted) ---
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node, 
  };
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolConfigurationModal } from '../ToolConfigurationModal';

// Mock fetch
vi.stubGlobal('fetch', vi.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
));

// Mock lucide-react icons as spans
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x" />,
  Settings2: () => <span data-testid="icon-settings" />,
  Save: () => <span data-testid="icon-save" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
  Loader2: () => <span data-testid="icon-loader" />,
  ChevronDown: () => <span data-testid="icon-chevron-down" />,
}));

describe('ToolConfigurationModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  
  const mockTool = {
    id: 'tool-1',
    name: 'Test Tool',
    user_config_schema: {
      fields: {
        'api_key': { type: 'string', label: 'API Key', required: true, placeholder: 'Enter API Key' },
        'model': { type: 'select', label: 'Model', required: false, options: [{ label: 'GPT-4', value: 'gpt4' }], placeholder: 'Select Model' },
        'debug': { type: 'boolean', label: 'Enable Debug', required: false, placeholder: 'Toggle debug' }
      }
    }
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ToolConfigurationModal 
        tool={mockTool} 
        isOpen={false} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders header correctly when open', async () => {
    render(
      <ToolConfigurationModal 
        tool={mockTool} 
        isOpen={true} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
      />
    );

    // Initial check for the modal content
    expect(await screen.findByText(/Configure Tool/i)).toBeInTheDocument();
    expect(await screen.findByText(/Test Tool/i)).toBeInTheDocument();
    
    // Check for fields (Model vs Modal fix)
    expect(await screen.findByText(/API.*Key/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter API Key/i)).toBeInTheDocument();
    expect(screen.getByText(/Select Model/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(
      <ToolConfigurationModal 
        tool={mockTool} 
        isOpen={true} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
      />
    );

    const saveBtn = await screen.findByText(/Save Configuration/i);
    await user.click(saveBtn);

    expect(await screen.findByText(/required/i)).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('calls onSave with updated config', async () => {
    const user = userEvent.setup();
    render(
      <ToolConfigurationModal 
        tool={mockTool} 
        isOpen={true} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
      />
    );

    const input = await screen.findByPlaceholderText(/Enter API Key/i);
    await user.type(input, 'secret-key');

    const saveBtn = await screen.findByText(/Save Configuration/i);
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
    expect(mockOnSave.mock.calls[0][0].api_key).toBe('secret-key');
    expect(mockOnClose).toHaveBeenCalled();
  });
});
