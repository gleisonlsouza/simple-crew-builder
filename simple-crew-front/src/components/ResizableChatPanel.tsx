import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/index';
import type { AppState } from '../store/index';
import type { AppNode, AppEdge } from '../types/nodes.types';
import { X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from './ConfirmationModal';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

export function ResizableChatPanel() {
  const isChatVisible = useStore((state: AppState) => state.isChatVisible);
  const setIsChatVisible = useStore((state: AppState) => state.setIsChatVisible);
  const startRealExecution = useStore((state: AppState) => state.startRealExecution);
  const updateNodeData = useStore((state: AppState) => state.updateNodeData);
  const nodes = useStore((state: AppState) => state.nodes, (oldNodes: AppNode[], newNodes: AppNode[]) => {
    if (oldNodes.length !== newNodes.length) return false;
    for (let i = 0; i < oldNodes.length; i++) {
        if (oldNodes[i].id !== newNodes[i].id) return false;
        if (oldNodes[i].type !== newNodes[i].type) return false;
        if (JSON.stringify(oldNodes[i].data) !== JSON.stringify(newNodes[i].data)) return false;
    }
    return true;
  });
  const edges = useStore((state: AppState) => state.edges, (oldEdges: AppEdge[], newEdges: AppEdge[]) => JSON.stringify(oldEdges) === JSON.stringify(newEdges));
  const messages = useStore((state: AppState) => state.messages);
  const setMessages = useStore((state: AppState) => state.setMessages);
  const clearChat = useStore((state: AppState) => state.clearChat);

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

    // Find the Chat node
    const chatNode = nodes.find((n: AppNode) => n.type === 'chat');
    if (!chatNode) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'No Chat Trigger found on the canvas.' }]);
      return;
    }

    // Find the connected Crew/Graph node
    const edgeToCrew = edges.find((e: AppEdge) => e.source === chatNode.id);
    if (!edgeToCrew) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Chat Trigger is disconnected. Connect it to a Crew or Graph node.' }]);
      return;
    }
    const crewNode = nodes.find((n: AppNode) => n.id === edgeToCrew.target);
    if (!crewNode || crewNode.type !== 'crew') {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Chat Trigger is not connected to a valid Crew/Graph node.' }]);
      return;
    }

    const chatData = chatNode.data as Record<string, unknown>;
    const inputMapping = chatData.inputMapping as string | undefined;
    const isLangGraph = (nodes.some((n: AppNode) => n.type === 'state')); // LangGraph has a State node

    // ── LangGraph path ────────────────────────────────────────────────────────
    if (isLangGraph) {
      // inputMapping is the stateKey where the user message goes (optional).
      // If not configured, we still run — the graph may handle the input differently.
      if (inputMapping) {
        // Inject user text into the crew inputs under the mapped state key
        const crewData = crewNode.data as Record<string, unknown>;
        const currentInputs = (crewData.inputs as Record<string, unknown>) || {};
        updateNodeData(crewNode.id, {
          inputs: { ...currentInputs, [inputMapping]: text }
        });
      }

      setIsLoading(true);
      try {
        // startRealExecution returns the final_result string which is already
        // the correct extracted value (based on outputKey configured on the Graph node).
        const finalResult = await startRealExecution();

        // Display the result. If outputKey was a single field, this is already
        // a clean string (e.g. the poem text). If it was the full state, it's JSON.
        const displayContent = finalResult
          ? finalResult
          : 'Graph execution finished with no output.';

        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: displayContent
        }]);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Execution failed: ${errorMessage}`
        }]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // ── CrewAI path (original behaviour) ─────────────────────────────────────
    if (!inputMapping) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Chat Trigger is not mapped to any Crew variable. Please configure it in node settings.' }]);
      return;
    }

    const includeHistory = (chatData.includeHistory as boolean) ?? false;
    const systemMessage = (chatData.systemMessage as string)?.trim() || null;

    const payload: { role: string; content: string }[] = [];
    if (systemMessage) payload.push({ role: 'system', content: systemMessage });
    if (includeHistory) {
      const history = messages.slice(-8).map(m => ({ role: m.role as string, content: m.content }));
      payload.push(...history);
    }
    payload.push({ role: 'user', content: userMessage.content });

    const crewData = crewNode.data as Record<string, unknown>;
    const currentInputs = (crewData.inputs as Record<string, unknown>) || {};
    updateNodeData(crewNode.id, { inputs: { ...currentInputs, [inputMapping]: payload } });

    setIsLoading(true);
    try {
      const finalResult = await startRealExecution();
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: finalResult || 'Crew execution finished with no explicit payload.'
      }]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Execution failed: ${errorMessage}`
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


  const isSidebarCollapsed = useStore((state: AppState) => state.isSidebarCollapsed);

  if (!isChatVisible) return null;

  return (
    <div
      ref={panelRef}
      className={`absolute bottom-0 ${isSidebarCollapsed ? 'left-20' : 'left-64'} right-0 z-[50] bg-brand-bg border-t border-brand-border flex flex-col ${
        !isResizing && !isMinimized ? 'transition-[left] duration-300 ease-in-out' : ''
      } shadow-2xl ${
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
