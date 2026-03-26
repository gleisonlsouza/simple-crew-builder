import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStore } from '../store';
import { X, ChevronDown, ChevronUp, Send, Copy, Check, FileText, Trash2 } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';
import toast from 'react-hot-toast';
import { ConfirmationModal } from './ConfirmationModal';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const MarkdownCodeBlock = ({ children, className }: { children: string; className?: string }) => {
  const [copied, setCopied] = useState(false);
  const language = className ? className.replace('language-', '') : 'text';

  useEffect(() => {
    Prism.highlightAll();
  }, [children]);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-200 dark:border-brand-border bg-[#0d1117] group/code shadow-lg shadow-black/5 dark:shadow-black/20">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/50 dark:bg-slate-800/40 border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{language}</span>
        </div>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all active:scale-95 border border-white/5"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-[10px] font-bold">Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="relative">
        <pre className={`!bg-transparent !p-4 !m-0 !text-[11px] font-mono leading-relaxed overflow-x-auto custom-scrollbar language-${language}`}>
          <code className={`language-${language} text-slate-200`}>{children}</code>
        </pre>
      </div>
    </div>
  );
};

export function ResizableChatPanel() {
  const isChatVisible = useStore((state) => state.isChatVisible);
  const setIsChatVisible = useStore((state) => state.setIsChatVisible);
  const startRealExecution = useStore((state) => state.startRealExecution);
  const updateNodeData = useStore((state) => state.updateNodeData);
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);

  const [chatHeight, setChatHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const initialMessages: Message[] = [
    {
      id: 'welcome-1',
      role: 'assistant',
      content: 'Hello! I am connected to your Crew. How can we help you today?'
    }
  ];

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isMinimized, isChatVisible]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newHeight = window.innerHeight - e.clientY;
      const minHeight = 200;
      const maxHeight = window.innerHeight * 0.8;

      setChatHeight(Math.max(minHeight, Math.min(newHeight, maxHeight)));
      // Auto expand if user drags up
      if (isMinimized && newHeight > 50) {
        setIsMinimized(false);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isMinimized]);

  useEffect(() => {
    if (!isLoading && isChatVisible && !isMinimized) {
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading, isChatVisible, isMinimized]);
  
  // Auto-resize logic
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollHeight = inputRef.current.scrollHeight;
      // Define a max height (e.g., 5-6 lines, ~150px)
      const maxHeight = 160;
      inputRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      
      // Toggle scrollbar visibility
      if (scrollHeight > maxHeight) {
        inputRef.current.style.overflowY = 'auto';
      } else {
        inputRef.current.style.overflowY = 'hidden';
      }
    }
  }, [inputText]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Locating the Chat Node and its target Crew to map exactly
    const chatNode = nodes.find(n => n.type === 'chat');
    if (!chatNode) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'No Chat Trigger found on the canvas.' }]);
      return;
    }

    const inputMapping = (chatNode.data as any).inputMapping;
    if (!inputMapping) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Chat Trigger is not mapped to any Crew variable. Please configure it in node settings.' }]);
      return;
    }

    const edgeToCrew = edges.find(e => e.source === chatNode.id);
    if (!edgeToCrew) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Chat Trigger is disconnected. Connect it to a Crew.' }]);
      return;
    }

    const crewNode = nodes.find(n => n.id === edgeToCrew.target);
    if (!crewNode || crewNode.type !== 'crew') {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Chat Trigger is not connected to a valid Crew Node.' }]);
      return;
    }

    // Build the OpenAI-format payload: system → history → current
    const chatData = chatNode.data as any;
    const includeHistory = chatData.includeHistory ?? false;
    const systemMessage = chatData.systemMessage?.trim() || null;
    const currentMessage = { role: 'user' as const, content: userMessage.content };

    // Build ordered payload
    const payload: { role: string; content: string }[] = [];

    // 1. System message at the top (if present)
    if (systemMessage) {
      payload.push({ role: 'system', content: systemMessage });
    }

    // 2. Conversation history (up to last 8 messages, excluding the one just added)
    if (includeHistory) {
      const history = messages.slice(-8)
        .map(m => ({ role: m.role as string, content: m.content }));
      payload.push(...history);
    }

    // 3. Current user message
    payload.push(currentMessage);

    // Update Crew's inputs dict globally before executing
    const currentInputs = (crewNode.data as any).inputs || {};
    updateNodeData(crewNode.id, {
      inputs: {
        ...currentInputs,
        [inputMapping]: payload
      }
    });

    // Run the Crew
    setIsLoading(true);
    try {
      const finalResult = await startRealExecution();
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: finalResult || 'Crew execution finished with no explicit payload.'
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Execution failed: ${err.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (messages.length <= 1) return;
    setIsConfirmModalOpen(true);
  };

  const confirmClearChat = () => {
    setMessages(initialMessages);
    toast.success('Conversation cleared');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isChatVisible) return null;

  return (
    <div
      ref={panelRef}
      className={`absolute bottom-0 left-64 right-0 z-[50] bg-brand-bg border-t border-brand-border flex flex-col transition-[height] duration-0 shadow-2xl ${
        isMinimized ? 'h-12' : ''
      }`}
      style={!isMinimized ? { height: `${chatHeight}px` } : undefined}
    >
      {/* Resizer Bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize z-10 bg-transparent hover:bg-brand-accent/50 transition-colors"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
      />

      {/* Header */}
      <div className="flex-none h-12 flex items-center justify-between px-4 border-b border-brand-border bg-brand-card">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
          <h3 className="text-sm font-bold text-brand-text">Interactive Chat</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClearChat}
            disabled={messages.length <= 1 || isLoading}
            className="p-1.5 rounded-md hover:bg-red-500/10 text-brand-muted hover:text-red-500 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-md hover:bg-brand-bg text-brand-muted hover:text-brand-text transition-colors"
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsChatVisible(false)}
            className="p-1.5 rounded-md hover:bg-red-500/10 text-brand-muted hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body & Footer (Hidden when minimized) */}
      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <div className="text-center mt-4">
              <span className="text-xs text-slate-500 font-medium">Crew is ready. Send a message to wake up the agents.</span>
            </div>
            
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                data-testid={`chat-message-${msg.role}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-brand-muted">AI</span>
                  </div>
                )}
                
                <div 
                  className={`px-4 py-2 max-w-[80%] rounded-2xl border ${
                    msg.role === 'user' 
                      ? 'bg-brand-accent/10 rounded-tr-none border-brand-accent/30 text-brand-text shadow-sm' 
                      : 'bg-brand-card rounded-tl-none border-brand-border text-brand-text'
                  }`}
                >
                  <div className="text-sm break-words chat-markdown">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-[13px]">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold text-brand-text">{children}</strong>,
                        em: ({ children }) => <em className="italic opacity-90">{children}</em>,
                        code: ({ children, className }) => {
                          const isBlock = className?.includes('language-') || (children && String(children).includes('\n'));
                          if (isBlock) {
                            return <MarkdownCodeBlock className={className}>{String(children).replace(/\n$/, '')}</MarkdownCodeBlock>;
                          }
                          return (
                            <code className="bg-brand-bg rounded px-1.5 py-0.5 text-[11px] font-mono border border-brand-border text-brand-accent">
                              {children}
                            </code>
                          );
                        },
                        pre: ({ children }) => <>{children}</>,
                        ul: ({ children }) => <ul className="list-disc list-outside mb-3 ml-4 space-y-1.5 text-[13px]">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-outside mb-3 ml-4 space-y-1.5 text-[13px]">{children}</ol>,
                        li: ({ children }) => <li className="pl-1 marker:text-brand-accent">{children}</li>,
                        h1: ({ children }) => <h1 className="text-lg font-black mb-3 mt-4 text-brand-text transition-colors">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-black mb-2 mt-3 text-brand-text/90 italic">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-bold mb-2 mt-2 text-brand-text/80">{children}</h3>,
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-brand-accent/30 bg-brand-accent/5 pl-4 py-2 my-4 italic rounded-r-lg text-brand-muted">
                            {children}
                          </blockquote>
                        ),
                        a: ({ href, children }) => (
                          <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-brand-accent underline decoration-brand-accent/30 underline-offset-4 hover:text-brand-accent/80 transition-all font-medium"
                          >
                            {children}
                          </a>
                        ),
                        hr: () => <hr className="border-brand-border my-6" />,
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-4 rounded-xl border border-brand-border shadow-inner bg-brand-bg/50">
                            <table className="w-full text-left text-xs border-collapse">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => <thead className="bg-brand-bg text-brand-muted font-bold">{children}</thead>,
                        th: ({ children }) => <th className="px-4 py-2 border-b border-brand-border">{children}</th>,
                        td: ({ children }) => <td className="px-4 py-2 border-b border-brand-border text-brand-text/80">{children}</td>,
                      }}
                    >{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3" data-testid="chat-typing-indicator">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-slate-300">AI</span>
                </div>
                <div className="bg-slate-800/80 rounded-2xl rounded-tl-none px-4 py-3.5 max-w-[80%] border border-slate-700/50 flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse delay-75" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse delay-150" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

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
              <button 
                type="button"
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isLoading}
                className="absolute right-2.5 bottom-2.5 p-1.5 rounded-lg bg-brand-accent hover:bg-brand-accent/80 text-white transition-colors disabled:opacity-50 shadow-lg shadow-brand-accent/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Resizing Overlay to prevent iframes/canvas from stealing mouse */}
      {isResizing && (
        <div className="fixed inset-0 z-[100] cursor-ns-resize" />
      )}

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmClearChat}
        title="Clear Conversation"
        message="Are you sure you want to clear the entire chat history? This action cannot be undone."
        variant="warning"
        confirmText="Yes, clear it"
      />
    </div>
  );
}
