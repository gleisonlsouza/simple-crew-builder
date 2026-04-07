import { render, screen, fireEvent } from '@testing-library/react';
import { WebhookForm } from '../WebhookForm';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { WebhookNodeData } from '../../../types/nodes.types';
import toast from 'react-hot-toast';
import React from 'react';

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
  default: ({ value, onChange, placeholder }: { value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string }) => (
    <input data-testid="highlighted-input" value={value} onChange={onChange} placeholder={placeholder} />
  )
}));

// Mock WebhookMapperModal
vi.mock('../WebhookMapperModal', () => ({
  WebhookMapperModal: ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => (
    isOpen ? <div data-testid="webhook-mapper-modal"><button onClick={onClose}>Done</button></div> : null
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
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn().mockImplementation(() => Promise.resolve()),
    },
    configurable: true
  });
} else {
  vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(() => Promise.resolve());
}

// Mock crypto.randomUUID
if (typeof crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => 'test-uuid'
    },
    configurable: true
  });
} else if (!crypto.randomUUID) {
  Object.defineProperty(crypto, 'randomUUID', {
    value: () => 'test-uuid',
    configurable: true
  });
}

describe('WebhookForm', () => {
  interface WebhookFormTestProps {
    data: WebhookNodeData;
    nodeId: string;
    updateNodeData: (id: string, data: Partial<WebhookNodeData>) => void;
    onFieldKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }, field: string, updateFn: (val: string) => void) => void;
    allProjectVariables: string[];
  }

  let mockProps: WebhookFormTestProps;

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
      } as unknown as WebhookNodeData,
      nodeId: 'node-webhook-1',
      updateNodeData: vi.fn(),
      onFieldKeyDown: vi.fn(),
      onFieldChange: vi.fn((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }, _field: string, updateFn: (val: string) => void) => {
        if ('target' in e && 'value' in e.target) {
          updateFn(e.target.value);
        }
      }),
      allProjectVariables: ['topic', 'language']
    } as unknown as WebhookFormTestProps;
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

  it('updates header and mapping values via second input', () => {
    render(<WebhookForm {...mockProps} />);
    
    // Headers
    const expectedValueInputs = screen.getAllByPlaceholderText('Expected Value');
    fireEvent.change(expectedValueInputs[0], { target: { value: 'new-secret' } });
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-webhook-1', {
      headers: { 'X-Auth': 'new-secret' }
    });

    // Mappings
    fireEvent.click(screen.getByText('Input Mappings'));
    const mappingValueInputs = screen.getAllByPlaceholderText('JSON Path (e.g. data.geo.city)');
    fireEvent.change(mappingValueInputs[0], { target: { value: 'new.json.path' } });
    expect(mockProps.updateNodeData).toHaveBeenCalledWith('node-webhook-1', {
      fieldMappings: { 'input1': 'new.json.path' }
    });
  });

  it('copies token to clipboard in Security tab', async () => {
    const propsWithToken = { ...mockProps, data: { ...mockProps.data, token: 'secret-token' } };
    render(<WebhookForm {...propsWithToken} />);
    fireEvent.click(await screen.findByText('Security'));
    
    const copyBtn = screen.getByTitle('Copy token');
    fireEvent.click(copyBtn);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('secret-token');
    expect(toast.success).toHaveBeenCalledWith('URL copied to clipboard!'); 
  });

  it('uses fallback URL when import.meta.env is missing', () => {
    vi.unstubAllEnvs();
    render(<WebhookForm {...mockProps} />);
    expect(screen.getByDisplayValue('http://localhost:3001/webhook/test-path')).toBeInTheDocument();
  });

  it('opens and closes WebhookMapperModal', () => {
    render(<WebhookForm {...mockProps} />);
    fireEvent.click(screen.getByText('Input Mappings'));
    const visualMapperBtn = screen.getByText('Visual Mapper');
    fireEvent.click(visualMapperBtn);
    
    expect(screen.getByTestId('webhook-mapper-modal')).toBeInTheDocument();
    
    const doneBtn = screen.getByText('Done');
    fireEvent.click(doneBtn);
    
    expect(screen.queryByTestId('webhook-mapper-modal')).not.toBeInTheDocument();
  });
});
