import React, { useState, useEffect, useRef } from 'react';
import { Send, Square } from 'lucide-react';
import { useStore } from '../store/index';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const stopExecution = useStore((state) => state.stopExecution);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading) {
      // Small timeout to ensure the panel is visible before focusing
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading]);

  // Auto-resize logic
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollHeight = inputRef.current.scrollHeight;
      const maxHeight = 160;
      inputRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      
      if (scrollHeight > maxHeight) {
        inputRef.current.style.overflowY = 'auto';
      } else {
        inputRef.current.style.overflowY = 'hidden';
      }
    }
  }, [inputText]);

  const handleSubmit = () => {
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex-none p-3 border-t border-brand-border bg-brand-card">
      <div className="relative">
        <textarea
          ref={inputRef}
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={isLoading}
          className="w-full bg-brand-bg border border-brand-border rounded-xl pl-4 pr-12 py-3 text-sm text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all font-medium disabled:opacity-50 resize-none min-h-[46px] max-h-[160px] custom-scrollbar shadow-sm"
        />
        <div className="flex items-center gap-2 absolute right-2.5 bottom-2.5">
          {isLoading && (
            <button
              type="button"
              onClick={() => stopExecution()}
              className="p-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white transition-colors shadow-lg shadow-rose-500/20"
              title="Stop Execution"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          )}
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={!inputText.trim() || isLoading}
            className="p-1.5 rounded-lg bg-brand-accent hover:bg-brand-accent/80 text-white transition-colors disabled:opacity-50 shadow-lg shadow-brand-accent/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
