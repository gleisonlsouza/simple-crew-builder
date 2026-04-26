import React, { useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  BackgroundVariant,
  ConnectionLineType,
  type Connection,
  type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useShallow } from 'zustand/shallow';
import { Play, Sparkles, Save, Loader2, ArrowLeft, Wand2, Rows, Columns } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import type { AppNode } from '../types/nodes.types';

import { useStore } from '../store/index';
import logo from '../assets/logo.PNG';

import { AgentNode } from '../nodes/AgentNode';
import { TaskNode } from '../nodes/TaskNode';
import { CrewNode } from '../nodes/CrewNode';
import { ChatNode } from '../nodes/ChatNode';
import { WebhookNode } from '../nodes/WebhookNode';
import { ToolNode } from '../nodes/ToolNode';
import { CustomToolNode } from '../nodes/CustomToolNode';
import { McpNode } from '../nodes/McpNode';
import { StateNode } from '../nodes/StateNode';
import { SchemaNode } from '../nodes/SchemaNode';
import { RouterNode } from '../nodes/RouterNode';
import { Sidebar } from '../components/Sidebar';


import { NodeConfigDrawer } from '../components/NodeConfigDrawer';
import { StateNodeModal } from '../components/modals/StateNodeModal';
import { SchemaNodeModal } from '../components/modals/SchemaNodeModal';
import { RouterNodeModal } from '../components/modals/RouterNodeModal';
import { DeletableEdge } from '../nodes/DeletableEdge';
import { ExportDropdown } from '../components/ExportDropdown';
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
  tool: ToolNode,
  customTool: CustomToolNode,
  mcp: McpNode,
  state: StateNode,
  schema: SchemaNode,
  router: RouterNode,
};

const edgeTypes = {
  deletable: DeletableEdge,
  smoothstep: DeletableEdge,
};

const getId = () => `dndnode_${uuidv4()}`;

// 1. EXTRAÍDO DA MEMÓRIA: Fica fora da função para não recriar 60x por segundo
const FIT_VIEW_OPTIONS = { padding: 0.3, maxZoom: 1.0 };
const getMiniMapNodeColor = (node: AppNode) => {
  if (node.type === 'agent') return '#3b82f6';
  if (node.type === 'task') return '#10b981';
  if (node.type === 'crew') return '#8b5cf6';
  if (node.type === 'webhook') return '#f97316';
  return '#e2e8f0';
};

const FlowCanvas = () => {
  const { screenToFlowPosition, getNode, fitView } = useReactFlow();

  // 2. SELETORES ATÔMICOS: Fim do useShallow gigante. Acesso rápido à memória.
  const nodes = useStore(useShallow((state) => state.nodes));
  const edges = useStore(useShallow((state) => state.edges));
  const onNodesChange = useStore((state) => state.onNodesChange);
  const onEdgesChange = useStore((state) => state.onEdgesChange);
  const onConnect = useStore((state) => state.onConnect);
  const addNode = useStore((state) => state.addNode);
  const validateGraph = useStore((state) => state.validateGraph);
  const theme = useStore((state) => state.theme);
  const isDirty = useStore((state) => state.isDirty);

  // 3. MEMOIZAÇÃO: A linha só é recriada se o tema (dark/light) mudar
  const defaultEdgeOptions = React.useMemo(() => ({
    type: 'deletable',
    style: { strokeWidth: 2, stroke: theme === 'dark' ? '#334155' : '#94a3b8' },
    animated: true
  }), [theme]);

  const focusEdge = useStore((state) => state.focusEdge);

  // CORREÇÃO 1: Memoizando as funções de clique para não quebrar a performance do React Flow
  const handlePaneClick = useCallback(() => focusEdge(null), [focusEdge]);
  const handleNodeClick = useCallback(() => focusEdge(null), [focusEdge]);
  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => focusEdge(edge.id), [focusEdge]);

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    const sourceNode = getNode(connection.source);
    const targetNode = getNode(connection.target);

    if (!sourceNode || !targetNode || !sourceNode.type || !targetNode.type) return false;

    // RULE: State Node connection to Graph (Crew) State Input
    if (targetNode.type === 'crew' && connection.targetHandle === 'state-in') {
      // 1. Only state nodes can connect here
      if (sourceNode.type !== 'state') return false;
      
      // 2. Only ONE state connection allowed per Graph
      const hasStateConnected = edges.some(e => e.target === connection.target && e.targetHandle === 'state-in');
      if (hasStateConnected) return false;

      return true;
    }

    // RULE: Schema Node connection to Agent Input
    if (connection.targetHandle === 'schema-input') {
      // 1. Only schema nodes can connect here
      if (sourceNode.type !== 'schema') return false;
      // 2. Only one schema per agent allowed
      if (targetNode.type === 'agent') {
        const hasSchemaConnected = edges.some(e => e.target === connection.target && e.targetHandle === 'schema-input');
        if (hasSchemaConnected) return false;
        return true;
      }
      // State nodes no longer accept schema edges (schemas are discovered from canvas)
      return false;
    }

    if (['chat', 'webhook'].includes(sourceNode.type) && targetNode.type === 'crew') return true;
    if (sourceNode.type === 'crew' && targetNode.type === 'agent') return connection.targetHandle === 'agent-in';

    if (sourceNode.type === 'agent') {
      if (['task', 'taskNode', 'agentTask'].includes(targetNode.type)) return connection.sourceHandle === 'out-task';
      if (['tool', 'customTool'].includes(targetNode.type)) return connection.sourceHandle === 'out-tool';
      if (targetNode.type === 'mcp') return connection.sourceHandle === 'out-mcp';
      
      // Execution Output Handle connects to other Agents or Routers
      if (connection.sourceHandle === 'agent-out') {
        return ['agent', 'router'].includes(targetNode.type as string);
      }
      
      // Data Output Handle connects directly to a state field map
      if (connection.sourceHandle === 'data-out') {
        return targetNode.type === 'state' && (connection.targetHandle?.startsWith('field-in-') || false);
      }
    }

    if (sourceNode.type === 'task') {
      if (['tool', 'customTool'].includes(targetNode.type)) return connection.sourceHandle === 'out-tool';
      if (targetNode.type === 'state') return connection.sourceHandle === 'data-out';
    }

    // RULE: Router Connections (Source)
    if (sourceNode.type === 'router') {
      // Routers can connect to any agent, task, or other router via their path handles
      if (targetNode.type === 'agent') return connection.targetHandle === 'agent-in';
      return ['task', 'router'].includes(targetNode.type as string);
    }

    // RULE: Execution Flow into Router
    if (targetNode.type === 'router' && connection.targetHandle === 'router-in') {
      // Agents or Crew can trigger a router
      return ['agent', 'crew'].includes(sourceNode.type as string);
    }

    return false;
  }, [getNode, edges]);

  // CORREÇÃO 2: Revisar a lógica do fitView. 
  // Removi o isDirty da dependência para evitar que a câmera tente focar
  // no exato momento em que o usuário arrasta um nó pela primeira vez.
  useEffect(() => {
    // Recomendo ter uma flag no store tipo 'hasLoaded' em vez de usar isDirty para isso
    if (nodes.length > 0 && !isDirty) { 
      setTimeout(() => fitView({ duration: 800, padding: 0.3 }), 100);
    }
  }, [nodes.length, fitView, isDirty]); // Adicionado isDirty para silenciar o lint, mas a lógica de !isDirty garante que só rode no início

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    let data: AppNode['data'];
    const timestamp = Date.now().toString().slice(-4);

    if (type === 'agent') data = { name: `New Agent ${timestamp}`, role: '', goal: '', backstory: '', isCollapsed: false };
    else if (type === 'task') data = { name: `New Task ${timestamp}`, description: '', expected_output: '' };
    else if (type === 'crew') data = { name: 'New Crew', process: 'sequential', memory: false, cache: false, isCollapsed: false } as AppNode['data'];
    else if (type === 'chat') data = { name: 'Chat Trigger', description: 'Start the Crew from a user\'s text message.', isCollapsed: false, inputMapping: 'chat_input' };
    else if (type === 'webhook') data = { name: `Webhook ${timestamp}`, method: 'POST', path: `webhook_${timestamp}`, url: '', isActive: true, waitForResult: false, headers: {}, isCollapsed: false } as unknown as AppNode['data'];
    else if (type === 'tool') data = { name: 'New Tool', toolId: '' };
    else if (type === 'customTool') data = { name: 'New Custom Tool', toolId: '' };
    else if (type === 'mcp') data = { name: 'New MCP Server', serverId: '' };
    else if (type === 'state') data = { name: 'State', fields: [{ id: 'f1', key: 'output', type: 'string', description: 'Main output' }] };
    else if (type === 'schema') data = { name: 'Schema', fields: [] };
    else if (type === 'router') data = { name: 'Conditional Router', conditions: [], defaultRouteLabel: 'Default' };
    else return;

    addNode({ id: getId(), type: type as AppNode['type'], position, data } as AppNode);
    validateGraph();
    useStore.getState().setIsUsabilityDrawerOpen(false);
  }, [screenToFlowPosition, addNode, validateGraph]);


  
    return (
      <ReactFlow
        nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
        onPaneClick={handlePaneClick}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes} edgeTypes={edgeTypes} isValidConnection={isValidConnection}
        onDragOver={onDragOver} onDrop={onDrop}
        fitViewOptions={FIT_VIEW_OPTIONS}
        minZoom={0.2} maxZoom={4}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.SmoothStep}
      >
      <Background gap={16} size={1} color="var(--canvas-dots)" style={{ backgroundColor: 'var(--bg-main)' }} variant={BackgroundVariant.Dots} />
      <Controls className="!bg-brand-card !border-brand-border !text-brand-muted hover:!bg-brand-bg !shadow-md !rounded-lg mb-4 ml-4" />
      <MiniMap className="!bg-brand-card !border-brand-border !shadow-md !rounded-lg overflow-hidden mb-4 mr-4" zoomable pannable nodeColor={getMiniMapNodeColor} />
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
    showNotification, updateProjectMetadata, currentProjectName, currentProjectDescription,
    canvasLayout, setCanvasLayout
  } = useStore(
    useShallow((state) => {
      return {
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
        currentProjectDescription: state.currentProjectDescription,
        canvasLayout: state.canvasLayout,
        setCanvasLayout: state.setCanvasLayout
      };
    })
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
          return;
        }

        // Clean previous workflow state to prevent stale data blinking
        if (storeState.currentProjectId && storeState.currentProjectId !== id) {
          resetProject();
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
      // REMOVED: resetProject(); - This was causing race conditions during navigation resets
    };
  }, [resetUIState]);

  const [activeView, setActiveView] = React.useState<'editor' | 'animation' | 'executions'>('editor');
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState('');

  // Sincroniza o título local com o global sempre que um novo projeto é carregado
  useEffect(() => {
    if (currentProjectName && !isEditingTitle) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditedTitle(currentProjectName);
    }
  }, [currentProjectName, isEditingTitle]);



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
                    onClick={() => {
                      if (id !== 'new') {
                        setEditedTitle(currentProjectName || '');
                        setIsEditingTitle(true);
                      }
                    }}
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
            className={`px-6 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 flex items-center gap-2 ${activeView === 'editor'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md scale-105 px-8'
              : 'text-brand-muted hover:text-indigo-500 hover:bg-brand-card/50'
              }`}
          >
            Editor
          </button>
          <button
            onClick={() => setActiveView('animation')}
            data-testid="tab-view-animation"
            className={`px-6 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 flex items-center gap-2 ${activeView === 'animation'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md scale-105 px-8'
              : 'text-brand-muted hover:text-indigo-500 hover:bg-brand-card/50'
              }`}
          >
            Animation
          </button>
          <button
            onClick={() => setActiveView('executions')}
            data-testid="tab-view-executions"
            className={`px-6 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 flex items-center gap-2 ${activeView === 'executions'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md scale-105 px-8'
              : 'text-brand-muted hover:text-indigo-500 hover:bg-brand-card/50'
              }`}
          >
            Executions
          </button>
        </div>

          <div className="flex items-center gap-2">
            {activeView === 'editor' && (
              <button
                onClick={() => setCanvasLayout(canvasLayout === 'vertical' ? 'horizontal' : 'vertical')}
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-bg/40 border border-brand-border text-brand-muted hover:text-indigo-500 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-300 shadow-sm group"
                title={`Switch to ${canvasLayout === 'vertical' ? 'Horizontal' : 'Vertical'} flow orientation`}
              >
                {canvasLayout === 'vertical' ? (
                  <Columns className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" />
                ) : (
                  <Rows className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" />
                )}
              </button>
            )}

            {activeView === 'editor' && (
            <button
              onClick={() => useStore.getState().applyAutoLayout()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors shadow-sm border border-violet-200 dark:border-violet-800"
              title="Auto-organize nodes vertically"
            >
              <Wand2 className="w-4 h-4" />
              Magic Layout
            </button>
          )}
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
              // Garante que enviamos o nome da UI ou o da Store, nunca uma string vazia acidentalmente
              const finalName = editedTitle.trim() || currentProjectName || 'Untitled Project';
              saveProject(finalName, currentProjectDescription || '');
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
        <div className={`flex-1 h-full ${activeView === 'animation' ? 'flex' : 'hidden'}`}>
          <AnimationView />
        </div>

        {activeView === 'executions' && (
          <div className="flex-1 h-full flex">
            <ExecutionsTab onReRunSuccess={() => setActiveView('editor')} />
          </div>
        )}

        <UsabilityCardsDrawer />
        <NodeConfigDrawer />
        {activeView === 'editor' && !isChatVisible && <ConsoleDrawer />}
        <SettingsDrawer />
        <StateNodeModal />
        <SchemaNodeModal />
        <RouterNodeModal />
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
