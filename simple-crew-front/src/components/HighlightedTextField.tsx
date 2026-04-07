import React from 'react';
import EditorModule from 'react-simple-code-editor';
import PrismModule from 'prismjs';

// Fix for Vite ESM/CommonJS interop
const Editor = (EditorModule as unknown as { default: React.ElementType })?.default || (EditorModule as unknown as React.ElementType);
const Prism = (PrismModule as unknown as { default: typeof import('prismjs') })?.default || (PrismModule as unknown as typeof import('prismjs'));





// Import all required languages explicitly to avoid missing peer dependency issues in some environments
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup'; // HTML
import 'prismjs/components/prism-bash';
import { getCursorCoordinates } from '../utils/getCursorCoordinates';

interface HighlightedTextFieldProps {
  type: 'input' | 'textarea';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement> | { target: { value: string, selectionStart?: number, cursorRect?: { top: number, left: number, height: number } } }) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement | HTMLInputElement | HTMLDivElement>;
  placeholder?: string;
  className?: string;
  highlightClassName?: string;
  language?: 'none' | 'python';
  rows?: number;
  'data-testid'?: string;
}

const HighlightedTextField: React.FC<HighlightedTextFieldProps> = ({
  type,
  value,
  onChange,
  onKeyDown,
  placeholder,
  className = '',
  language = 'none',
  rows = 3,
  'data-testid': dataTestId
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleValueChange = (code: string) => {
    let textarea: HTMLTextAreaElement | HTMLInputElement | null = null;
    
    if (type === 'textarea' && containerRef.current) {
      textarea = containerRef.current.querySelector('textarea');
    } else if (type === 'input' && inputRef.current) {
      textarea = inputRef.current;
    }

    if (textarea) {
      const cursorPos = textarea.selectionStart || code.length;
      const coords = getCursorCoordinates(textarea, cursorPos);
      onChange({ 
        target: { 
          value: code, 
          selectionStart: cursorPos,
          cursorRect: coords
        } 
      });
    } else {
      onChange({ target: { value: code } });
    }
  };

  const highlightWithPrism = (code: string) => {
    if (!code && !isFocused) return ''; // Let placeholder show
    if (!code) return '';

    try {
      if (language === 'python' && Prism.languages.python) {
        return Prism.highlight(code, Prism.languages.python, 'python');
      }

      // Default template variable highlighting
      const escapedCode = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
        
      return escapedCode.replace(/(\{[^}]+\})/g, '<span class="text-indigo-500 font-bold">$1</span>');
    } catch (e) {
      console.error('Prism highlighting error:', e);
      return code; // Fallback to plain text
    }
  };

  if (!Editor) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500 rounded-xl text-red-500 text-xs font-mono">
        <div>Error: Editor could not be loaded</div>
      </div>
    );
  }

  return (
    <div className={`
      relative w-full rounded-xl border transition-all duration-200 overflow-hidden bg-brand-bg/30
      ${isFocused ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-brand-border'} 
      ${className}
    `}
    data-testid={dataTestId}
    >
      {type === 'textarea' ? (
        <div ref={containerRef} className="min-h-full">
          <Editor
            value={value}
            onValueChange={handleValueChange}
            highlight={(code: string) => highlightWithPrism(code)}
          padding={16}
          onKeyDown={onKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isFocused ? '' : placeholder}
          className="code-editor-wrapper min-h-full"
          textareaClassName="code-editor-textarea"
          style={{
            fontSize: 14,
            lineHeight: '1.5rem',
            minHeight: rows ? `${rows * 1.5}rem` : 'inherit',
          }}
        />
        </div>
      ) : (
        /* For simple input, we still use the manual way but simpler, or just a regular input if highlighting isn't critical */
        <div className="relative">
             <input
                ref={inputRef}
                value={value}
                onChange={(e) => handleValueChange(e.target.value)}
                onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLInputElement>}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                className="w-full bg-transparent border-none px-4 py-3 text-sm text-brand-text outline-none focus:ring-0"
                spellCheck={false}
             />
             {/* Simple inputs usually don't need complex highlighting for code, but if we need it for {vars}, we can add it back later */}
        </div>
      )}
    </div>
  );
};

export default HighlightedTextField;
