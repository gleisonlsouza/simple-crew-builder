import { render, screen, fireEvent } from '@testing-library/react';
import { ChatMessage } from '../ChatMessage';
import { describe, it, expect, vi } from 'vitest';

// Mock MermaidRenderer
vi.mock('../MermaidRenderer', () => ({
  MermaidRenderer: ({ chart }: { chart: string }) => <div data-testid="mock-mermaid">{chart}</div>
}));

// Mock Prism
vi.mock('prismjs', () => ({
  default: {
    highlightAll: vi.fn(),
  }
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('ChatMessage', () => {
  it('renders a user message with correct alignment and style', () => {
    const msg = { id: '1', role: 'user' as const, content: 'Hello AI' };
    render(<ChatMessage msg={msg} />);
    
    const messageContainer = screen.getByTestId('chat-message-user');
    expect(messageContainer).toHaveClass('justify-end');
    expect(screen.getByText('Hello AI')).toBeInTheDocument();
    // User messages don't have the AI avatar
    expect(screen.queryByText('AI')).not.toBeInTheDocument();
  });

  it('renders an assistant message with correct alignment, style and avatar', () => {
    const msg = { id: '2', role: 'assistant' as const, content: 'Hello Human' };
    render(<ChatMessage msg={msg} />);
    
    const messageContainer = screen.getByTestId('chat-message-assistant');
    expect(messageContainer).toHaveClass('justify-start');
    expect(screen.getByText('Hello Human')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('renders markdown content with diverse elements (tables, headers, etc.)', () => {
    const msg = { 
      id: '3', 
      role: 'assistant' as const, 
      content: `
# H1 Title
## H2 Title
### H3 Title
**Bold** and _italic_
- List item 1
- List item 2
1. Ordered 1
2. Ordered 2
> Blockquote
***
| Col1 | Col2 |
|------|------|
| Val1 | Val2 |
[Link](https://example.com)
` 
    };
    render(<ChatMessage msg={msg} />);
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('H1 Title');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('H2 Title');
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('H3 Title');
    
    expect(screen.getByText('Bold')).toBeInTheDocument();
    expect(screen.getByText('italic')).toBeInTheDocument();
    
    expect(screen.getAllByRole('list')).toHaveLength(2); // Unordered and Ordered
    expect(screen.getAllByRole('listitem')).toHaveLength(4); // 2 unordered + 2 ordered
    
    expect(screen.getByText('Blockquote')).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument(); // hr
    
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Col1')).toBeInTheDocument();
    expect(screen.getByText('Val1')).toBeInTheDocument();
    
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders code blocks and handles copying successfully', async () => {
    // Mock clipboard
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    const codeContent = 'const x = 10;';
    const msg = { 
      id: '4', 
      role: 'assistant' as const, 
      content: `\`\`\`javascript\n${codeContent}\n\`\`\`` 
    };
    render(<ChatMessage msg={msg} />);
    
    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText(codeContent)).toBeInTheDocument();

    const copyBtn = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyBtn);

    expect(mockWriteText).toHaveBeenCalledWith(codeContent);
    // Success state
    expect(screen.getByText('Copied!')).toBeInTheDocument();
    
    // Test toast was called
    const toast = (await import('react-hot-toast')).default;
    expect(toast.success).toHaveBeenCalledWith('Code copied to clipboard');
  });

  it('renders mermaid diagrams using the specialized renderer', () => {
    const chart = 'graph TD; A-->B;';
    const msg = { 
      id: '5', 
      role: 'assistant' as const, 
      content: `\`\`\`mermaid\n${chart}\n\`\`\`` 
    };
    render(<ChatMessage msg={msg} />);
    
    const mermaidMock = screen.getByTestId('mock-mermaid');
    expect(mermaidMock).toBeInTheDocument();
    expect(mermaidMock).toHaveTextContent(chart);
  });

  it('renders inline code correctly', () => {
    const msg = { 
      id: '6', 
      role: 'user' as const, 
      content: 'Using `inline code` here' 
    };
    render(<ChatMessage msg={msg} />);
    
    const inlineCode = screen.getByText('inline code');
    expect(inlineCode.tagName).toBe('CODE');
    expect(inlineCode).toHaveClass('bg-brand-bg');
  });
});
