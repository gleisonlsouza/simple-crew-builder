import { render, screen, fireEvent } from '@testing-library/react';
import { WebhookForm } from '../WebhookForm';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import toast from 'react-hot-toast';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Globe: () => <div data-testid="icon-globe" />,
  Lock: () => <div data-testid="icon-lock" />,
  Settings: () => <div data-testid="icon-settings" />,
  Copy: () => <div data-testid="icon-copy" />,
  RefreshCw: () => <div data-testid="icon-refresh" />,
  Plus: () => <div data-testid="icon-plus" />,
  X: () => <div data-testid="icon-x" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  Zap: () => <div data-testid="icon-zap" />,
}));

// Mock HighlightedTextField
vi.mock('../../HighlightedTextField', () => ({
  HighlightedTextField: ({ value, onChange, placeholder }: any) => (
    <input data-testid="highlighted-input" value={value} onChange={onChange} placeholder={placeholder} />
  )
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

// Mock clipboard
if (!navigator.clipboard) {
  (navigator as any).clipboard = {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  };
} else {
  vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(() => Promise.resolve());
}

// Mock crypto.randomUUID
if (typeof crypto === 'undefined') {
  (globalThis as any).crypto = {
    randomUUID: () => 'test-uuid'
  };
} else if (!crypto.randomUUID) {
  (crypto as any).randomUUID = () => 'test-uuid';
}

describe('WebhookForm', () => {
  let mockProps: any;

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_API_URL', 'https://api.test.com');
    
    mockProps = {
      data: {
        name: 'Test Webhook',
        path: 'test-path',
        url: '', 
        method: 'POST',
        isActive: true,
        waitForResult: false,
        headers: { 'X-Auth': 'secret' },
        fieldMappings: { 'input1': 'data.field' },
        token: undefined
      },
      nodeId: 'node-webhook-1',
      updateNodeData: vi.fn(),
      onFieldKeyDown: vi.fn(),
      onFieldChange: vi.fn((e, _field, updateFn) => updateFn(e.target.value)),
      allProjectVariables: ['topic', 'language']
    };
  });

  it('renders initial values correctly', () => {
    render(<WebhookForm {...mockProps} />);
    
    expect(screen.getByDisplayValue('Test Webhook')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test-path')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://api.test.com/webhook/test-path')).toBeInTheDocument();
    expect(screen.getByText('POST')).toHaveClass('bg-orange-500');
  });

  it('updates path with sluggification', () => {
    render(<WebhookForm {...mockProps} />);
    
    const pathInput = screen.getByDisplayValue('test-path');
    fireEvent.change(pathInput, { target: { value: 'My New Webhook!' } });
    
    // 'My New Webhook!' -> 'my-new-webhook'
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-webhook-1', { path: 'my-new-webhook' });
  });

  it('updates name field', () => {
    render(<WebhookForm {...mockProps} />);
    
    const nameInput = screen.getByDisplayValue('Test Webhook');
    fireEvent.change(nameInput, { target: { value: 'Updated Webhook' } });
    
    expect(mockProps.onFieldChange).toHaveBeenCalled();
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-webhook-1', { name: 'Updated Webhook' });
  });

  it('changes HTTP method', () => {
    render(<WebhookForm {...mockProps} />);
    
    fireEvent.click(screen.getByText('GET'));
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-webhook-1', { method: 'GET' });
  });

  it('copies dynamic URL to clipboard', () => {
    render(<WebhookForm {...mockProps} />);
    
    const copyBtn = screen.getByTitle('Copy URL');
    fireEvent.click(copyBtn);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://api.test.com/webhook/test-path');
    expect(toast.success).toHaveBeenCalledWith('URL copied to clipboard!');
  });

  it('toggles Active and Wait Result', () => {
    render(<WebhookForm {...mockProps} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    
    // Toggle Active (initial true -> false)
    fireEvent.click(checkboxes[0]);
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-webhook-1', { isActive: false });
    
    // Toggle Wait (initial false -> true)
    fireEvent.click(checkboxes[1]);
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-webhook-1', { waitForResult: true });
  });

  it('handles custom headers (add/update/remove)', () => {
    render(<WebhookForm {...mockProps} />);
    
    // Add header
    const addBtn = screen.getAllByTestId('icon-plus')[0];
    fireEvent.click(addBtn);
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-webhook-1', expect.objectContaining({
      headers: expect.objectContaining({ '': '' })
    }));

    // Update header (key)
    const headerInputs = screen.getAllByPlaceholderText('Header Name');
    fireEvent.change(headerInputs[0], { target: { value: 'X-New-Header' } });
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-webhook-1', {
      headers: { 'X-New-Header': 'secret' }
    });

    // Remove header
    const removeBtn = screen.getByTestId('icon-x');
    fireEvent.click(removeBtn);
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-webhook-1', { headers: {} });
  });

  it('handles Security tab and Bearer Token generation', async () => {
    const { rerender } = render(<WebhookForm {...mockProps} />);

    fireEvent.click(await screen.findByText('Security'));

    // No token configured — shows "Generate Token" button
    const generateBtn = await screen.findByText('Generate Token');
    fireEvent.click(generateBtn);
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-webhook-1', expect.objectContaining({
      token: expect.any(String)
    }));
    expect(toast.success).toHaveBeenCalledWith('Token generated! Remember to save the project.');

    // Rerender with token set — button should now say "Rotate Token"
    const updatedProps = {
      ...mockProps,
      data: {
        ...mockProps.data,
        token: 'abc123'
      }
    };
    rerender(<WebhookForm {...updatedProps} />);

    fireEvent.click(await screen.findByText('Security'));

    const rotateBtn = await screen.findByText('Rotate Token');
    fireEvent.click(rotateBtn);
    expect(updatedProps.updateNodeData).toHaveBeenCalledWith('node-webhook-1', expect.objectContaining({
      token: expect.any(String)
    }));
    expect(toast.success).toHaveBeenCalledWith('Token generated! Remember to save the project.');
  });

  it('handles field mappings (add/update/remove)', () => {
    render(<WebhookForm {...mockProps} />);
    
    fireEvent.click(screen.getByText('Input Mappings'));
    
    // Add mapping
    const addBtn = screen.getAllByTestId('icon-plus')[0];
    fireEvent.click(addBtn);
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-webhook-1', expect.objectContaining({
      fieldMappings: expect.objectContaining({ '': '' })
    }));

    // Update mapping
    const mappingInputs = screen.getAllByPlaceholderText('Crew Input (e.g. city)');
    fireEvent.change(mappingInputs[0], { target: { value: 'new_input' } });
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-webhook-1', {
      fieldMappings: { 'new_input': 'data.field' }
    });

    // Remove mapping
    const removeBtn = screen.getByTestId('icon-x');
    fireEvent.click(removeBtn);
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-webhook-1', { fieldMappings: {} });
  });
});
