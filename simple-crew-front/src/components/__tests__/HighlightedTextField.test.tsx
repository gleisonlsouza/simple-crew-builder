import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HighlightedTextField from '../HighlightedTextField';

describe('HighlightedTextField', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    placeholder: 'Test Placeholder',
  };

  it('renders as an input when type is "input"', () => {
    render(
      <HighlightedTextField 
        {...defaultProps} 
        type="input" 
        value="Hello Input"
      />
    );

    const input = screen.getByDisplayValue('Hello Input');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('renders as a textarea/editor when type is "textarea"', () => {
    // This test is crucial to verify that the Editor component (react-simple-code-editor)
    // is being loaded correctly without the "Element type is invalid" error.
    render(
      <HighlightedTextField 
        {...defaultProps} 
        type="textarea" 
        value="Hello Textarea"
      />
    );

    // The editor usually renders a textarea inside.
    const textarea = screen.getByDisplayValue('Hello Textarea');
    expect(textarea).toBeInTheDocument();
    
    // Check if the placeholder is visible (when focused or if logic allows)
    // In our component, placeholder shows when not focused and code is empty.
  });

  it('displays the placeholder when value is empty', () => {
    render(
      <HighlightedTextField 
        {...defaultProps} 
        type="input" 
        value="" 
      />
    );

    expect(screen.getByPlaceholderText('Test Placeholder')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <HighlightedTextField 
        {...defaultProps} 
        type="input" 
        className="custom-class"
      />
    );

    // The root div should have the custom class
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
