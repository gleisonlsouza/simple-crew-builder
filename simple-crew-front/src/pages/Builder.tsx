import React, { useCallback, useRef, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { ReactFlow, Background, Controls, MiniMap, ReactFlowProvider, useReactFlow, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Sparkles, Save, Loader2, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

import { useStore } from '../store';
import { AgentNode } from '../nodes/AgentNode';
import { TaskNode } from '../nodes/TaskNode';
import { CrewNode } from '../nodes/CrewNode';
import { Sidebar } from '../components/Sidebar';

import { NodeConfigDrawer } from '../components/NodeConfigDrawer';
import { DeletableEdge } from '../nodes/DeletableEdge';
import { ExportDropdown } from '../components/ExportDropdown';
import { Toast } from '../components/Toast';
import { ConsoleDrawer } from '../components/ConsoleDrawer';
import { SettingsDrawer } from '../components/SettingsDrawer';

const nodeTypes = {
  agent: AgentNode,
  task: TaskNode,
  crew: CrewNode,
};

const edgeTypes = {
  deletable: DeletableEdge,
};

const getId = () => `dndnode_${crypto.randomUUID()}`;

function FlowBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const setActiveNode = useStore((state) => state.setActiveNode);
  const onNodesChange = useStore((state) => state.onNodesChange);
  const onEdgesChange = useStore((state) => state.onEdgesChange);
  const onConnect = useStore((state) => state.onConnect);
  const addNode = useStore((state) => state.addNode);

  const isExecuting = useStore((state) => state.isExecuting);
  const startRealExecution = useStore((state) => state.startRealExecution);
  const executionResult = useStore((state) => state.executionResult);
  const setIsConsoleExpanded = useStore((state) => state.setIsConsoleExpanded);
  const setIsConsoleOpen = useStore((state) => state.setIsConsoleOpen);
  const nodeStatuses = useStore((state) => state.nodeStatuses);
  const loadProject = useStore((state) => state.loadProject);
  const saveProject = useStore((state) => state.saveProject);
  const currentProjectId = useStore((state) => state.currentProjectId);
  const isSaving = useStore((state) => state.isSaving);
  const theme = useStore((state) => state.theme);
  const resetProject = useStore((state) => state.resetProject);

  const lastLoadedId = useRef<string | null>(null);

  useEffect(() => {
    if (id && id !== 'new') {
      if (lastLoadedId.current !== id) {
        lastLoadedId.current = id;
        loadProject(id);
      }
    } else {
      lastLoadedId.current = null;
      resetProject();
    }
  }, [id, loadProject, resetProject]);


  const validateGraph = useStore((state) => state.validateGraph);
  const showNotification = useStore((state) => state.showNotification);

  const handleRunCrew = () => {
    if (!validateGraph()) {
      showNotification("There are errors in your flow. Fix the nodes marked in red before proceeding.", "error");
      return;
    }
    showNotification("Agent execution started successfully. Follow the execution.", "info");
    startRealExecution();
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let data = {};
      const timestamp = Date.now().toString().slice(-4);
      if (type === 'agent') {
        data = { name: `Novo Agente ${timestamp}`, role: '', goal: '', backstory: '', isCollapsed: false };
      } else if (type === 'task') {
        data = { name: `Nova Tarefa ${timestamp}`, description: '', expected_output: '' };
      } else if (type === 'crew') {
        data = { process: 'sequential', isCollapsed: false };
      }

      const newNode = {
        id: getId(),
        type,
        position,
        data,
      };

      addNode(newNode as any);
      validateGraph();
    },
    [screenToFlowPosition, addNode, validateGraph],
  );

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      setActiveNode(node.id);
    },
    [setActiveNode]
  );

  const edgesWithAnimation = edges.map(e => {
    const sourceStatus = nodeStatuses[e.source];
    const targetStatus = nodeStatuses[e.target];

    const isRunning = sourceStatus === 'running' || targetStatus === 'running';
    const isSuccess = sourceStatus === 'success' && targetStatus === 'success';

    let strokeColor = '#94a3b8';
    if (isRunning) strokeColor = '#3b82f6';
    else if (isSuccess) strokeColor = '#10b981';

    return {
      ...e,
      animated: true,
      style: {
        ...e.style,
        stroke: strokeColor,
        strokeWidth: isRunning ? 3 : 2,
        transition: 'stroke 0.5s ease, stroke-width 0.5s ease'
      }
    };
  });

  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState('');
  const updateProjectMetadata = useStore((state) => state.updateProjectMetadata);
  const currentProject = useStore((state) => state.savedProjects.find(p => p.id === id));

  useEffect(() => {
    if (currentProject) {
      setEditedTitle(currentProject.name);
    }
  }, [currentProject]);

  const handleTitleSave = async () => {
    if (id && id !== 'new' && editedTitle !== currentProject?.name) {
      await updateProjectMetadata(id, editedTitle, currentProject?.description || '');
    }
    setIsEditingTitle(false);
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
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-inner">
              <span className="text-white font-bold text-lg">S</span>
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
                    {currentProject?.name || 'SimpleCrew'}
                  </h1>
                )}
                <span className="text-brand-muted font-normal text-xl">Builder</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {executionResult && (
            <button
              onClick={() => {
                setIsConsoleOpen(true);
                setIsConsoleExpanded(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shadow-sm border border-amber-200 dark:border-amber-800"
            >
              <Sparkles className="w-4 h-4" />
              View Last Result
            </button>
          )}
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

          <button
            onClick={() => {
              saveProject(editedTitle, currentProject?.description);
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

      <div className="flex-1 w-full h-full flex flex-row relative">
        <Sidebar />
        <div className="flex-1 h-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edgesWithAnimation}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={onNodeDoubleClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onDragOver={onDragOver}
            onDrop={onDrop}
            fitView
            minZoom={0.2}
            maxZoom={4}
            defaultEdgeOptions={{
              type: 'deletable',
              style: { strokeWidth: 2, stroke: theme === 'dark' ? '#334155' : '#94a3b8' },
              animated: true
            }}
          >
            <Background
              gap={16}
              size={1}
              color="var(--canvas-dots)"
              style={{ backgroundColor: 'var(--bg-main)' }}
              variant={BackgroundVariant.Dots}
            />
            <Controls className="!bg-brand-card !border-brand-border !text-brand-muted hover:!bg-brand-bg !shadow-md !rounded-lg mb-4 ml-4" />
            <MiniMap
              className="!bg-brand-card !border-brand-border !shadow-md !rounded-lg overflow-hidden mb-4 mr-4"
              zoomable
              pannable
              nodeColor={(node) => {
                switch (node.type) {
                  case 'agent': return '#3b82f6';
                  case 'task': return '#10b981';
                  case 'crew': return '#8b5cf6';
                  default: return '#e2e8f0';
                }
              }}
            />
          </ReactFlow>
        </div>
        <NodeConfigDrawer />
        <ConsoleDrawer />
        <SettingsDrawer />
        <Toast />
        <Toaster position="bottom-right" />
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
