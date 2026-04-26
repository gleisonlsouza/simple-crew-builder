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
  footer?: React.ReactNode;
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
  'data-testid': dataTestId,
  footer
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(value);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Sync local value with prop value when prop changes
    // This is critical for external updates like AI suggestions or variable insertions
    if (value !== localValue) {
      setLocalValue(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);


  const handleValueChange = (code: string) => {
    setLocalValue(code);
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
      relative w-full rounded-xl border transition-all duration-200 overflow-hidden bg-brand-bg flex flex-col
      ${isFocused ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-lg shadow-indigo-500/5' : 'border-brand-border'} 
      ${className}
    `}
    data-testid={dataTestId}
    >
      {type === 'textarea' ? (
        <div ref={containerRef} className="flex-1 w-full flex flex-col">
          <Editor
            value={localValue}
            onValueChange={handleValueChange}
            highlight={(code: string) => highlightWithPrism(code)}
            padding={0}
            onKeyDown={onKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={isFocused ? '' : placeholder}
            className="code-editor-wrapper w-full flex-1"
            textareaClassName="code-editor-textarea !p-4 !outline-none !border-none !bg-transparent !shadow-none !ring-0 !min-h-[100px]"
            preClassName="!p-4"
            style={{
              fontSize: 14,
              lineHeight: '1.5rem',
              minHeight: rows ? `${rows * 1.5}rem` : 'inherit',
              width: '100%',
              backgroundColor: 'transparent'
            }}
          />
        </div>
      ) : (
        <div className="relative">
             <input
                ref={inputRef}
                value={localValue}
                onChange={(e) => handleValueChange(e.target.value)}
                onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLInputElement>}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                className="w-full bg-transparent border-none px-4 py-3 text-sm text-brand-text outline-none focus:ring-0"
                spellCheck={false}
             />
        </div>
      )}

      {/* Attachment Footer */}
      {footer && (
        <div className="mt-auto border-t border-brand-border/30 border-dashed bg-brand-bg/50 px-3 pb-3 pt-2">
          {footer}
        </div>
      )}
    </div>
  );
};

export default HighlightedTextField;
