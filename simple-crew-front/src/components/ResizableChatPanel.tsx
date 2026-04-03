import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/index';
import { X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from './ConfirmationModal';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

export function ResizableChatPanel() {
  const isChatVisible = useStore((state) => state.isChatVisible);
  const setIsChatVisible = useStore((state) => state.setIsChatVisible);
  const startRealExecution = useStore((state) => state.startRealExecution);
  const updateNodeData = useStore((state) => state.updateNodeData);
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const messages = useStore((state) => state.messages);
  const setMessages = useStore((state) => state.setMessages);
  const clearChat = useStore((state) => state.clearChat);

  const [chatHeight, setChatHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: text
    };

    setMessages(prev => [...prev, userMessage]);

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
  }, [isLoading, nodes, edges, updateNodeData, startRealExecution, messages, setMessages]);

  const handleClearChat = () => {
    if (messages.length <= 1) return;
    setIsConfirmModalOpen(true);
  };

  const confirmClearChat = () => {
    clearChat();
    toast.success('Conversation cleared');
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
              <ChatMessage key={msg.id} msg={msg} />
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

          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
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
