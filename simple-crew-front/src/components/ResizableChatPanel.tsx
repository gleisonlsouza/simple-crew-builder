import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useStore } from '../store';
import { X, ChevronDown, ChevronUp, Send } from 'lucide-react';
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: 'Hello! I am connected to your Crew. How can we help you today?'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      const maxHeight = window.innerHeight * 0.5;

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
      const history = messages.slice(-9, -1)
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

  if (!isChatVisible) return null;

  return (
    <div
      ref={panelRef}
      className={`absolute bottom-0 left-64 right-0 z-[50] bg-slate-950 border-t border-slate-800 flex flex-col transition-[height] duration-0 shadow-2xl ${
        isMinimized ? 'h-12' : ''
      }`}
      style={!isMinimized ? { height: `${chatHeight}px` } : undefined}
    >
      {/* Resizer Bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize z-10 bg-transparent hover:bg-cyan-500/50 transition-colors"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
      />

      {/* Header */}
      <div className="flex-none h-12 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <h3 className="text-sm font-bold text-slate-200">Interactive Chat</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsChatVisible(false)}
            className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
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
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-slate-300">AI</span>
                  </div>
                )}
                
                <div 
                  className={`px-4 py-2 max-w-[80%] rounded-2xl border ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 rounded-tr-none border-indigo-500 text-white' 
                      : 'bg-slate-800/80 rounded-tl-none border-slate-700/50 text-slate-200'
                  }`}
                >
                  <div className="text-sm break-words chat-markdown">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        code: ({ children, className }) =>
                          className ? (
                            <code className="block bg-black/30 rounded p-2 mt-1 mb-1 text-xs font-mono whitespace-pre-wrap">{children}</code>
                          ) : (
                            <code className="bg-black/30 rounded px-1 text-xs font-mono">{children}</code>
                          ),
                        pre: ({ children }) => <pre className="bg-black/30 rounded p-2 mt-1 mb-1 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{children}</pre>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-1 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-1 space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li className="ml-2">{children}</li>,
                        h1: ({ children }) => <h1 className="text-base font-bold mb-1">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm font-bold mb-1">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                        blockquote: ({ children }) => <blockquote className="border-l-2 border-slate-500 pl-2 italic opacity-80">{children}</blockquote>,
                        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline opacity-80 hover:opacity-100">{children}</a>,
                        hr: () => <hr className="border-slate-600 my-2" />,
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

          {/* Input Area */}
          <div className="flex-none p-3 border-t border-slate-800 bg-slate-900/50">
            <form 
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-12 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-medium disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}

      {/* Resizing Overlay to prevent iframes/canvas from stealing mouse */}
      {isResizing && (
        <div className="fixed inset-0 z-[100] cursor-ns-resize" />
      )}
    </div>
  );
}
