import React, { useCallback, useRef, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { ReactFlow, Background, Controls, MiniMap, ReactFlowProvider, useReactFlow, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useShallow } from 'zustand/shallow';
import { Play, Sparkles, Save, Loader2, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

import { useStore } from '../store/index';
import logo from '../assets/logo.PNG';

import { AgentNode } from '../nodes/AgentNode';
import { TaskNode } from '../nodes/TaskNode';
import { CrewNode } from '../nodes/CrewNode';
import { ChatNode } from '../nodes/ChatNode';
import { WebhookNode } from '../nodes/WebhookNode';
import { Sidebar } from '../components/Sidebar';

import { NodeConfigDrawer } from '../components/NodeConfigDrawer';
import { DeletableEdge } from '../nodes/DeletableEdge';
import { ExportDropdown } from '../components/ExportDropdown';
import { Toast } from '../components/Toast';
import { ConsoleDrawer } from '../components/ConsoleDrawer';
import { SettingsDrawer } from '../components/SettingsDrawer';
import { UsabilityCardsDrawer } from '../components/UsabilityCardsDrawer';
import { ResizableChatPanel } from '../components/ResizableChatPanel';
import AnimationView from './AnimationView';
import ExecutionsTab from '../components/ExecutionsTab';

const nodeTypes = {
  agent: AgentNode,
  task: TaskNode,
  crew: CrewNode,
  chat: ChatNode,
  webhook: WebhookNode,
};

const edgeTypes = {
  deletable: DeletableEdge,
};

const getId = () => `dndnode_${crypto.randomUUID()}`;

// 1. O Canvas Isolado (Re-renderiza 60x/seg no drag de forma ultra-leve)
const FlowCanvas = () => {
  const { screenToFlowPosition } = useReactFlow();
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, validateGraph, theme, isDirty } = useStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
      onConnect: state.onConnect,
      addNode: state.addNode,
      validateGraph: state.validateGraph,
      theme: state.theme,
      isDirty: state.isDirty
    }))
  );

  const { fitView } = useReactFlow();

  // Force fitView on hydrate to ensure the graph comes into view
  useEffect(() => {
    if (isDirty && nodes.length > 0) {
      setTimeout(() => {
        fitView({ duration: 800, padding: 0.3 });
      }, 100);
    }
  }, [isDirty, nodes.length, fitView]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      let data = {};
      const timestamp = Date.now().toString().slice(-4);
      if (type === 'agent') data = { name: `New Agent ${timestamp}`, role: '', goal: '', backstory: '', isCollapsed: false };
      else if (type === 'task') data = { name: `New Task ${timestamp}`, description: '', expected_output: '' };
      else if (type === 'crew') data = { process: 'sequential', isCollapsed: false };
      else if (type === 'chat') {
        data = { name: 'Chat Trigger', description: 'Start the Crew from a user\'s text message.', isCollapsed: false, inputMapping: 'chat_input' };
      } else if (type === 'webhook') {
        data = { 
          name: `Webhook ${timestamp}`, 
          method: 'POST', 
          isActive: true, 
          waitForResult: false, 
          headers: {}, 
          fieldMappings: {}, 
          isCollapsed: false 
        };
      }

      addNode({ id: getId(), type, position, data } as any);
      validateGraph();
      useStore.getState().setIsUsabilityDrawerOpen(false);
  }, [screenToFlowPosition, addNode, validateGraph]);


  return (
    <ReactFlow
      nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
      nodeTypes={nodeTypes} edgeTypes={edgeTypes}
      onDragOver={onDragOver} onDrop={onDrop} fitView 
      fitViewOptions={{ padding: 0.3, maxZoom: 1.0 }}
      minZoom={0.2} maxZoom={4}
      defaultEdgeOptions={{ type: 'deletable', style: { strokeWidth: 2, stroke: theme === 'dark' ? '#334155' : '#94a3b8' }, animated: true }}
    >
      <Background gap={16} size={1} color="var(--canvas-dots)" style={{ backgroundColor: 'var(--bg-main)' }} variant={BackgroundVariant.Dots} />
      <Controls className="!bg-brand-card !border-brand-border !text-brand-muted hover:!bg-brand-bg !shadow-md !rounded-lg mb-4 ml-4" />
      <MiniMap className="!bg-brand-card !border-brand-border !shadow-md !rounded-lg overflow-hidden mb-4 mr-4" zoomable pannable 
        nodeColor={(node) => {
          if (node.type === 'agent') return '#3b82f6';
          if (node.type === 'task') return '#10b981';
          if (node.type === 'crew') return '#8b5cf6';
          if (node.type === 'webhook') return '#f97316';
          return '#e2e8f0';
        }} />
    </ReactFlow>
  );
};

// 2. Componente Pai (Fica 100% estático durante o drag)
function FlowBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const { 
    isExecuting, startRealExecution, executionResult, setIsConsoleExpanded, setIsConsoleOpen,
    isChatVisible, setIsChatVisible, resetUIState,
    loadProject, saveProject, currentProjectId, isSaving, resetProject, validateGraph, 
    showNotification, updateProjectMetadata, currentProjectName, currentProjectDescription
  } = useStore(
    useShallow((state) => ({
      isExecuting: state.isExecuting,
      startRealExecution: state.startRealExecution,
      executionResult: state.executionResult,
      setIsConsoleExpanded: state.setIsConsoleExpanded,
      setIsConsoleOpen: state.setIsConsoleOpen,
      isChatVisible: state.isChatVisible,
      setIsChatVisible: state.setIsChatVisible,
      resetUIState: state.resetUIState,
      loadProject: state.loadProject,
      saveProject: state.saveProject,
      currentProjectId: state.currentProjectId,
      isSaving: state.isSaving,
      resetProject: state.resetProject,
      validateGraph: state.validateGraph,
      showNotification: state.showNotification,
      updateProjectMetadata: state.updateProjectMetadata,
      currentProjectName: state.currentProjectName,
      currentProjectDescription: state.currentProjectDescription
    }))
  );

  const lastLoadedId = useRef<string | null>(null);

  useEffect(() => {
    if (id && id !== 'new') {
      if (lastLoadedId.current !== id) {
        lastLoadedId.current = id;
        
        // GUARD CLAUSE FOR HYDRATION
        // Se isDirty for true e nós já estiverem preenchidos (Snapshot carregou),
        // NÃO busque do backend e deixe o React Flow usar o state atual.
        const storeState = useStore.getState();
        if (storeState.isDirty && storeState.nodes.length > 0 && storeState.currentProjectId === id) {
          console.log(`[Builder] Skipping initial fetch. Hydrating with ${storeState.nodes.length} nodes from Snapshot.`);
          return;
        }

        loadProject(id);
      }
    } else {
      lastLoadedId.current = null;
      resetProject();
    }
  }, [id, loadProject, resetProject]);

  useEffect(() => {
    return () => {
      resetUIState();
    };
  }, [resetUIState]);

  const [activeView, setActiveView] = React.useState<'editor' | 'animation' | 'executions'>('editor');
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState('');
  
  useEffect(() => {
    if (currentProjectName) {
      setEditedTitle(currentProjectName);
    }
  }, [currentProjectName]);

  const handleTitleSave = async () => {
    if (id && id !== 'new' && editedTitle !== currentProjectName) {
      await updateProjectMetadata(id, editedTitle, currentProjectDescription || '');
    }
    setIsEditingTitle(false);
  };

  const handleRunCrew = () => {
    if (!validateGraph()) {
      showNotification("There are errors in your flow. Fix the nodes marked in red before proceeding.", "error");
      return;
    }
    showNotification("Agent execution started successfully. Follow the execution.", "info");
    startRealExecution();
  };

  return (
    <div className="w-screen h-screen bg-brand-bg flex flex-col font-sans overflow-hidden transition-colors duration-300">
      <header className="h-16 bg-brand-card border-b border-brand-border flex items-center justify-between px-6 z-10 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-brand-bg rounded-full transition-colors text-brand-muted hover:text-brand-text"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 overflow-hidden">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <input
                    autoFocus
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                    className="bg-brand-bg border border-brand-border rounded px-2 py-0.5 text-lg font-bold text-brand-text outline-none focus:border-indigo-500"
                  />
                ) : (
                  <h1
                    onClick={() => id !== 'new' && setIsEditingTitle(true)}
                    className={`text-xl font-bold text-brand-text tracking-tight ${id !== 'new' ? 'cursor-pointer hover:text-indigo-500 border-b border-transparent hover:border-indigo-500/30' : ''}`}
                  >
                    {currentProjectName || 'SimpleCrew'}
                  </h1>
                )}
                <span className="text-brand-muted font-normal text-xl">Builder</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- SEGMENTED CONTROL TABS --- */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-brand-bg/40 p-1 rounded-xl border border-dashed border-brand-border dark:border-slate-700 transition-all duration-300 backdrop-blur-sm">
          <button
            onClick={() => setActiveView('editor')}
            data-testid="tab-view-editor"
            className={`px-6 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 flex items-center gap-2 ${
              activeView === 'editor'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md scale-105 px-8'
                : 'text-brand-muted hover:text-indigo-500 hover:bg-brand-card/50'
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setActiveView('animation')}
            data-testid="tab-view-animation"
            className={`px-6 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 flex items-center gap-2 ${
              activeView === 'animation'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md scale-105 px-8'
                : 'text-brand-muted hover:text-indigo-500 hover:bg-brand-card/50'
            }`}
          >
            Animation
          </button>
          <button
            onClick={() => setActiveView('executions')}
            data-testid="tab-view-executions"
            className={`px-6 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 flex items-center gap-2 ${
              activeView === 'executions'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md scale-105 px-8'
                : 'text-brand-muted hover:text-indigo-500 hover:bg-brand-card/50'
            }`}
          >
            Executions
          </button>
        </div>

        <div className="flex items-center gap-3">
          {executionResult && activeView === 'editor' && (
          <button
              onClick={() => {
                setIsConsoleOpen(true);
                setIsConsoleExpanded(true);
                setIsChatVisible(false);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shadow-sm border border-amber-200 dark:border-amber-800"
            >
              <Sparkles className="w-4 h-4" />
              View Last Result
            </button>
          )}
          {activeView === 'editor' && (
            <button
              onClick={handleRunCrew}
              disabled={isExecuting}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${isExecuting
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow'
                }`}
            >
              <Play className="w-4 h-4 fill-current" />
              {isExecuting ? 'Running...' : 'Run Crew'}
            </button>
          )}

          <button
            onClick={() => {
              saveProject(editedTitle, currentProjectDescription || '');
            }}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${isSaving
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-500 hover:bg-indigo-600 text-white hover:shadow'
              }`}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving...' : currentProjectId ? 'Update Project' : 'Quick Save'}
          </button>

          <ExportDropdown />
        </div>
      </header>

      <div className="flex-1 w-full h-full flex flex-row relative overflow-hidden">
        <Sidebar />
        
        {/* Editor View - Preserved in DOM via 'hidden' */}
        <div className={`flex-1 h-full relative ${activeView === 'editor' ? 'flex' : 'hidden'}`} ref={reactFlowWrapper}>
          <FlowCanvas />
        </div>

        {/* Animation View - Live Simulation */}
        {activeView === 'animation' && (
          <AnimationView />
        )}
        
        {activeView === 'executions' && (
          <ExecutionsTab onReRunSuccess={() => setActiveView('editor')} />
        )}

        <UsabilityCardsDrawer />
        <NodeConfigDrawer />
        {activeView === 'editor' && !isChatVisible && <ConsoleDrawer />}
        <SettingsDrawer />
        <Toast />
        <Toaster position="bottom-right" />
        <ResizableChatPanel />
      </div>
    </div>
  );
}

const Builder = () => (
  <ReactFlowProvider>
    <FlowBuilder />
  </ReactFlowProvider>
);

export default Builder;
