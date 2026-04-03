import React, { useEffect, useRef, useState } from 'react';
import { X, LayoutTemplate, Search, MessageCircle, Plus, Globe } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useStore } from '../store/index';

export function UsabilityCardsDrawer() {
  const isUsabilityDrawerOpen = useStore((state) => state.isUsabilityDrawerOpen);
  const setIsUsabilityDrawerOpen = useStore((state) => state.setIsUsabilityDrawerOpen);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const { fitView } = useReactFlow();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isUsabilityDrawerOpen) {
        setIsUsabilityDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUsabilityDrawerOpen, setIsUsabilityDrawerOpen]);

  // Prevent event propagation so clicking inside doesn't trigger outer listeners
  const handleDrawerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* Overlay: Closes drawer when clicked outside */}
      {isUsabilityDrawerOpen && (
        <div
          className={`absolute inset-y-0 left-64 right-0 z-30 bg-black/20 backdrop-blur-[1px] transition-opacity ${isDragging ? 'pointer-events-none' : ''}`}
          onClick={() => setIsUsabilityDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        data-testid="usability-drawer"
        className={`absolute inset-y-0 left-64 w-[450px] z-40 bg-brand-card/95 backdrop-blur-md border-r border-brand-border shadow-2xl rounded-r-xl transition-all duration-300 ease-in-out flex flex-col ${isUsabilityDrawerOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-8 opacity-0 pointer-events-none'
          }`}
        onClick={handleDrawerClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-brand-border bg-brand-bg/50">
          <div className="flex items-center gap-3">
            <div className="bg-fuchsia-100 dark:bg-fuchsia-900/30 p-2 rounded-lg">
              <LayoutTemplate className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-brand-text tracking-tight">Usability Cards Gallery</h2>
              <p className="text-xs text-brand-muted">Pre-configured templates for your crew</p>
            </div>
          </div>
          <button
            data-testid="btn-close-usability-drawer"
            onClick={() => setIsUsabilityDrawerOpen(false)}
            className="p-2 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-5 py-3 border-b border-brand-border bg-brand-bg/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-brand-card border border-brand-border rounded-lg pl-9 pr-4 py-2 text-sm text-brand-text placeholder-brand-muted focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all font-medium"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">

            {/* Chat Trigger Card */}
            <div
              className="group relative flex flex-col gap-3 p-4 bg-brand-bg/50 border border-brand-border rounded-xl hover:border-cyan-500/50 hover:bg-brand-card transition-all cursor-grab active:cursor-grabbing"
              data-testid="drag-card-chat-trigger"
              onDragStart={(event) => {
                setIsDragging(true);
                event.dataTransfer.setData('application/reactflow', 'chat');
                event.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => setIsDragging(false)}
              draggable
            >
              <button
                data-testid="btn-add-chat-trigger"
                onClick={(e) => {
                  e.stopPropagation();
                  const state = useStore.getState();
                  state.addNodeWithAutoPosition('chat', {
                    name: 'Chat Trigger',
                    description: "Start the Crew from a user's text message.",
                    isCollapsed: false,
                    inputMapping: 'chat_input'
                  });
                  setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
                  setIsUsabilityDrawerOpen(false);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-cyan-500 transition-all z-10"
                title="Add to canvas"
              >
                <Plus className="w-4 h-4" />
              </button>

              <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                <MessageCircle className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-brand-text">Chat Trigger</h3>
                <p className="text-[10px] text-brand-muted leading-tight">Start the Crew from a user's text message.</p>
              </div>
            </div>

            {/* Webhook Trigger Card */}
            <div
              className="group relative flex flex-col gap-3 p-4 bg-brand-bg/50 border border-brand-border rounded-xl hover:border-orange-500/50 hover:bg-brand-card transition-all cursor-grab active:cursor-grabbing"
              data-testid="drag-card-webhook-trigger"
              onDragStart={(event) => {
                setIsDragging(true);
                event.dataTransfer.setData('application/reactflow', 'webhook');
                event.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => setIsDragging(false)}
              draggable
            >
              <button
                data-testid="btn-add-webhook-trigger"
                onClick={(e) => {
                  e.stopPropagation();
                  const state = useStore.getState();
                  const timestamp = Date.now().toString().slice(-4);
                  state.addNodeWithAutoPosition('webhook', {
                    name: `Webhook ${timestamp}`,
                    method: 'POST',
                    isActive: true,
                    waitForResult: false,
                    headers: {},
                    fieldMappings: {},
                    isCollapsed: false
                  });
                  setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
                  setIsUsabilityDrawerOpen(false);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-orange-500 transition-all z-10"
                title="Add to canvas"
              >
                <Plus className="w-4 h-4" />
              </button>

              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                <Globe className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-brand-text">Webhook Trigger</h3>
                <p className="text-[10px] text-brand-muted leading-tight">Trigger the Crew via external HTTP requests.</p>
              </div>
            </div>

            {/* Placeholder cards */}
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="group relative flex flex-col gap-3 p-4 bg-brand-bg/50 border border-brand-border rounded-xl hover:border-fuchsia-500/50 hover:bg-brand-card transition-all cursor-pointer"
              >
                <div className="w-full h-24 bg-brand-border/30 rounded-lg group-hover:bg-brand-border/50 transition-colors animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-3/4 bg-brand-border/30 rounded animate-pulse" />
                  <div className="h-3 w-full bg-brand-border/30 rounded animate-pulse" />
                  <div className="h-3 w-5/6 bg-brand-border/30 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
