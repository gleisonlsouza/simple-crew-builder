import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import HighlightedTextField from '../HighlightedTextField';
import Prism from 'prismjs';

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
    render(
      <HighlightedTextField 
        {...defaultProps} 
        type="textarea" 
        value="Hello Textarea"
      />
    );

    const textarea = screen.getByDisplayValue('Hello Textarea');
    expect(textarea).toBeInTheDocument();
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

    expect(container.firstChild).toHaveClass('custom-class');
  });

  describe('Interactions (Input)', () => {
    it('calls onChange when typing in input', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<HighlightedTextField {...defaultProps} type="input" onChange={onChange} />);
      
      const input = screen.getByPlaceholderText('Test Placeholder');
      await user.type(input, 'a');
      
      expect(onChange).toHaveBeenCalled();
    });

    it('calls onKeyDown when key is pressed in input', async () => {
      const user = userEvent.setup();
      const onKeyDown = vi.fn();
      render(<HighlightedTextField {...defaultProps} type="input" onKeyDown={onKeyDown} />);
      
      const input = screen.getByPlaceholderText('Test Placeholder');
      await user.type(input, '{Enter}');
      
      expect(onKeyDown).toHaveBeenCalled();
    });

    it('updates style on focus and blur in input', async () => {
      const user = userEvent.setup();
      const { container } = render(<HighlightedTextField {...defaultProps} type="input" />);
      const wrapper = container.firstChild;
      const input = screen.getByPlaceholderText('Test Placeholder');

      expect(wrapper).not.toHaveClass('border-indigo-500');
      
      await user.click(input);
      expect(wrapper).toHaveClass('border-indigo-500');
      
      await user.tab(); // move focus away
      expect(wrapper).not.toHaveClass('border-indigo-500');
    });
  });

  describe('Interactions (Textarea)', () => {
    it('calls onChange when typing in editor', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<HighlightedTextField {...defaultProps} type="textarea" onChange={onChange} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'h');
      
      // onValueChange in react-simple-code-editor calls onChange with expanded target info
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
        target: expect.objectContaining({ value: 'h' })
      }));
    });

    it('updates style on focus and blur in textarea', async () => {
      const user = userEvent.setup();
      const { container } = render(<HighlightedTextField {...defaultProps} type="textarea" />);
      const wrapper = container.firstChild;
      const textarea = screen.getByRole('textbox');

      await user.click(textarea);
      expect(wrapper).toHaveClass('border-indigo-500');
      
      fireEvent.blur(textarea); // user.tab() might not work as expected with complex editor focus
      expect(wrapper).not.toHaveClass('border-indigo-500');
    });

    it('hides placeholder when focused', async () => {
        const user = userEvent.setup();
        render(<HighlightedTextField {...defaultProps} type="textarea" />);
        
        const textarea = screen.getByPlaceholderText('Test Placeholder');
        expect(textarea).toBeInTheDocument();
        
        await user.click(textarea);
        // When focused, placeholder should be empty string
        expect(textarea).toHaveAttribute('placeholder', '');
    });
  });

  describe('Highlighter (Prism)', () => {
    it('uses python highlighting when language is python', () => {
      // Mock Prism.highlight
      const spy = vi.spyOn(Prism, 'highlight');
      
      render(
        <HighlightedTextField 
          {...defaultProps} 
          type="textarea" 
          value="print('hi')" 
          language="python" 
        />
      );

      // Trigger highlight logic. In HighlightedTextField it's inside the Editor's highlight prop.
      // The render already triggers it if the Editor is functional.
      expect(spy).toHaveBeenCalledWith("print('hi')", expect.anything(), 'python');
      spy.mockRestore();
    });

    it('handles prism errors gracefully (fallback to plain text)', async () => {
      const spy = vi.spyOn(Prism, 'highlight').mockImplementation(() => {
        throw new Error('Prism Fail');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <HighlightedTextField 
          {...defaultProps} 
          type="textarea" 
          value="some code" 
          language="python" 
        />
      );

      expect(consoleSpy).toHaveBeenCalledWith('Prism highlighting error:', expect.any(Error));
      
      spy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('highlights template variables {var} correctly by default', () => {
        const { container } = render(
            <HighlightedTextField 
              {...defaultProps} 
              type="textarea" 
              value="hello {name}" 
            />
        );

        // In the editor, looking for the highlighted span
        const highlighted = container.querySelector('.text-indigo-500');
        expect(highlighted).toBeInTheDocument();
        expect(highlighted?.textContent).toBe('{name}');
    });
  });
});
