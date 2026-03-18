import React from 'react';
// @ts-ignore
import * as EditorModule from 'react-simple-code-editor';
import Prism from 'prismjs';

// Robust way to get the Editor component from various module formats (CJS, ESM, etc.)
let Editor: any = EditorModule;
// Recursive unwrap if there's a .default property (common in Vite/ESM/CJS interop)
while (Editor && Editor.default && Editor !== Editor.default) {
  Editor = Editor.default;
}

// Special case for some builds where it's named 'Editor' specifically
if (!Editor || (typeof Editor !== 'function' && typeof Editor !== 'string' && !(Editor && Editor.$$typeof))) {
  if (EditorModule.Editor) Editor = EditorModule.Editor;
}

// Import all required languages explicitly to avoid missing peer dependency issues in some environments
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup'; // HTML
import 'prismjs/components/prism-bash';

interface HighlightedTextFieldProps {
  type: 'input' | 'textarea';
  value: string;
  onChange: (e: any) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement | any>) => void;
  placeholder?: string;
  className?: string;
  highlightClassName?: string;
  language?: 'none' | 'python';
  rows?: number;
}

export const HighlightedTextField: React.FC<HighlightedTextFieldProps> = ({
  type,
  value,
  onChange,
  onKeyDown,
  placeholder,
  className = '',
  language = 'none',
  rows = 3
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

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

  if (!Editor || (typeof Editor !== 'function' && typeof Editor !== 'string' && !(Editor && Editor.$$typeof))) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500 rounded-xl text-red-500 text-xs font-mono">
        <div>Error: Editor is invalid type: {typeof Editor}</div>
        <div>Keys: {JSON.stringify(Object.keys(EditorModule))}</div>
        <div>Default Keys: {EditorModule.default ? JSON.stringify(Object.keys(EditorModule.default)) : 'null'}</div>
      </div>
    );
  }

  return (
    <div className={`
      relative w-full rounded-xl border transition-all duration-200 overflow-hidden bg-brand-bg/30
      ${isFocused ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-brand-border'} 
      ${className}
    `}>
      {type === 'textarea' ? (
        <Editor
          value={value}
          onValueChange={(code: string) => onChange({ target: { value: code } })}
          highlight={(code: string) => highlightWithPrism(code) as any}
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
      ) : (
        /* For simple input, we still use the manual way but simpler, or just a regular input if highlighting isn't critical */
        <div className="relative">
             <input
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
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
