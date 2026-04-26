import { X, Trash2, Sparkles, AlertCircle } from 'lucide-react';
import { useNodeConfig } from '../hooks/useNodeConfig';
import { ToolConfigurationModal } from './ToolConfigurationModal';
import { AgentForm } from './node-config/AgentForm';
import { TaskForm } from './node-config/TaskForm';
import { CrewForm } from './node-config/CrewForm';
import { GraphForm } from './node-config/GraphForm';

import { ChatForm } from './node-config/ChatForm';
import { WebhookForm } from './node-config/WebhookForm';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { AppNode, AgentNodeData, TaskNodeData, CrewNodeData, ChatNodeData, WebhookNodeData, LangGraphAgentData, LangGraphTaskData } from '../types/nodes.types';
import { LangGraphAgentForm } from './node-config/LangGraphAgentForm';
import { LangGraphTaskForm } from './node-config/LangGraphTaskForm';
import { VariableAutocomplete } from './node-config/VariableAutocomplete';



export function NodeConfigDrawer() {
  const {
    activeNodeId,
    activeNode,
    nodes,
    setActiveNode,
    updateNodeData,
    deleteNode,
    models,
    mcpServers,
    customTools,
    globalTools,
    skills,
    localName,

    nameError,
    isContextSelectorOpen,
    setIsContextSelectorOpen,
    isMcpSelectorOpen,
    setIsMcpSelectorOpen,
    isCustomToolSelectorOpen,
    setIsCustomToolSelectorOpen,
    isGlobalToolSelectorOpen,
    setIsGlobalToolSelectorOpen,
    isChatMappingSelectorOpen,
    setIsChatMappingSelectorOpen,
    loadingFields,
    isToolConfigModalOpen,
    setIsToolConfigModalOpen,
    toolToConfigure,
    setToolToConfigure,
    suggestionState,
    setSuggestionState,
    isCrew,
    isAgent,
    isTask,
    isChat,
    isWebhook,
    renderableAgents,
    renderableTasks,
    handleAgentDragEnd,
    handleTaskDragEnd,
    handleNameChange,
    handleAiSuggest,
    handleBulkAiSuggest,
    handleSelectSuggestion,
    handleFieldKeyDown,
    handleFieldChange,
    connectedCrewInputs,
    allProjectVariables,
    stateFields,
    stateNodes,
    variables,
    currentProjectFramework,
    updateStateConnection,
    nodeWarnings
  } = useNodeConfig();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!activeNodeId || !activeNode) return null;

  const { type, data } = activeNode;

  return (
    <div 
      data-testid="config-drawer"
      className="absolute right-0 top-0 h-full w-96 bg-brand-card shadow-[-20px_0_50px_rgba(0,0,0,0.1)] dark:shadow-[-20px_0_50px_rgba(0,0,0,0.3)] z-50 flex flex-col border-l border-brand-border transition-all duration-300"
    >
      <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between bg-brand-bg/50">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-brand-text capitalize tracking-tight">
            {type} Configuration
          </h2>
          {(type === 'agent' || type === 'task') && (
            <button
               onClick={handleBulkAiSuggest}
               disabled={
                 type === 'agent' 
                   ? (loadingFields['role'] || loadingFields['goal'] || loadingFields['backstory'])
                   : (loadingFields['description'] || loadingFields['expected_output'])
               }
               className={`p-1.5 rounded-lg transition-all duration-300 ${
                 (type === 'agent' && (loadingFields['role'] || loadingFields['goal'] || loadingFields['backstory'])) ||
                 (type === 'task' && (loadingFields['description'] || loadingFields['expected_output']))
                   ? 'animate-sparkle-shimmer cursor-wait'
                   : 'text-brand-muted hover:text-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20'
               }`}
               title="Fill all fields with AI"
             >
               <Sparkles className="w-5 h-5" />
             </button>
          )}
        </div>
        <button
          id="btn-close-drawer"
          data-testid="btn-close-drawer"
          aria-label="Close configuration"
          onClick={() => setActiveNode(null)}
          className="p-2 hover:bg-brand-bg rounded-lg transition-colors group"
        >
          <X className="w-5 h-5 text-brand-muted group-hover:text-brand-text" />
        </button>
      </div>

      {/* Warnings Banner */}
      {nodeWarnings && nodeWarnings.length > 0 && (
        <div className="mx-4 mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider leading-none">Dependency Warnings</h3>
            <ul className="text-[10px] text-amber-600/90 dark:text-amber-400/80 list-disc list-inside space-y-0.5 leading-tight">
              {nodeWarnings.map((warning: string, i: number) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* -- Advanced Variable Autocomplete -- */}
      <VariableAutocomplete
        isOpen={suggestionState.isOpen}
        filter={suggestionState.filter}
        selectedIndex={suggestionState.selectedIndex}
        anchorRect={suggestionState.anchorRect}
        cursorRect={suggestionState.cursorRect}
        variables={variables}
        onSelect={handleSelectSuggestion}
        setSelectedIndex={(idx) => setSuggestionState(prev => ({ ...prev, selectedIndex: idx }))}
      />

      <div className="p-6 flex-1 overflow-y-auto">
        {(type === 'agent' || type === 'task') && (
          <div className="flex flex-col gap-2 mb-6 pb-6 border-b border-brand-border/50" data-testid="input-node-name">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Name</label>
            <input
              className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
                nameError
                  ? 'border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'border-brand-border focus:ring-blue-500 dark:focus:ring-blue-400 bg-brand-bg text-brand-text'
              }`}
              value={localName}
              onChange={handleNameChange}
              placeholder={type === 'agent' ? 'e.g. Senior Researcher' : 'e.g. SEO Writing Task'}
            />
            {nameError && (
              <span className="text-xs text-red-500 mt-1">
                This name is already in use. It must be unique.
              </span>
            )}
          </div>
        )}

        {isAgent && (
          currentProjectFramework === 'langgraph' ? (
            <LangGraphAgentForm
              data={data as LangGraphAgentData}
              nodeId={activeNode.id}
              updateNodeData={updateNodeData}
              models={models}
              skills={skills}
              loadingFields={loadingFields}

              onAiSuggest={handleAiSuggest}
              onFieldKeyDown={handleFieldKeyDown}
              onFieldChange={handleFieldChange}
              stateNodes={stateNodes}
              updateStateConnection={updateStateConnection}
            />
          ) : (
            <AgentForm
              data={data as AgentNodeData}
              nodeId={activeNode.id}
              updateNodeData={updateNodeData}
              models={models}
              mcpServers={mcpServers}
              globalTools={globalTools}
              customTools={customTools}
              skills={skills}
              loadingFields={loadingFields}

              onAiSuggest={handleAiSuggest}
              onFieldKeyDown={handleFieldKeyDown}
              onFieldChange={handleFieldChange}
              isMcpSelectorOpen={isMcpSelectorOpen}
              setIsMcpSelectorOpen={setIsMcpSelectorOpen}
              isGlobalToolSelectorOpen={isGlobalToolSelectorOpen}
              setIsGlobalToolSelectorOpen={setIsGlobalToolSelectorOpen}
              isCustomToolSelectorOpen={isCustomToolSelectorOpen}
              setIsCustomToolSelectorOpen={setIsCustomToolSelectorOpen}
              setToolToConfigure={setToolToConfigure}
              setIsToolConfigModalOpen={setIsToolConfigModalOpen}
              renderableTasks={renderableTasks}
              handleTaskDragEnd={handleTaskDragEnd}
              sensors={sensors}
            />
          )
        )}

        {isTask && (
          currentProjectFramework === 'langgraph' ? (
            <LangGraphTaskForm
              data={data as LangGraphTaskData}
              nodeId={activeNode.id}
              updateNodeData={updateNodeData}
              loadingFields={loadingFields}
              onAiSuggest={handleAiSuggest}
              onFieldKeyDown={handleFieldKeyDown}
              onFieldChange={handleFieldChange}
            />
          ) : (
            <TaskForm
              data={data as TaskNodeData}
              nodeId={activeNode.id}
              updateNodeData={updateNodeData}
              nodes={nodes as unknown as AppNode[]}
              loadingFields={loadingFields}
              onAiSuggest={handleAiSuggest}
              onFieldKeyDown={handleFieldKeyDown}
              onFieldChange={handleFieldChange}
              isContextSelectorOpen={isContextSelectorOpen}
              setIsContextSelectorOpen={setIsContextSelectorOpen}
            />
          )
        )}

        {isCrew && (
          currentProjectFramework === 'langgraph' ? (
            <GraphForm
              data={data as CrewNodeData}
              nodeId={activeNode.id}
              updateNodeData={updateNodeData}
              localName={localName}
              handleNameChange={handleNameChange}
              nameError={nameError}
              stateFields={stateFields}
              stateNodes={stateNodes}
              updateStateConnection={updateStateConnection}
            />
          ) : (
            <CrewForm
              data={data as CrewNodeData}
              nodeId={activeNode.id}
              updateNodeData={updateNodeData}
              localName={localName}
              handleNameChange={handleNameChange}
              nameError={nameError}
              renderableAgents={renderableAgents}
              renderableTasks={renderableTasks}
              handleAgentDragEnd={handleAgentDragEnd}
              handleTaskDragEnd={handleTaskDragEnd}
              sensors={sensors}
              models={models}
              framework={currentProjectFramework || 'crewai'}
            />
          )
        )}

        {isChat && (
            <ChatForm
              data={data as ChatNodeData}
              nodeId={activeNode.id}
              updateNodeData={updateNodeData}
              connectedCrewInputs={connectedCrewInputs}
              stateFields={stateFields}
              framework={currentProjectFramework || 'crewai'}
              isChatMappingSelectorOpen={isChatMappingSelectorOpen}
              setIsChatMappingSelectorOpen={setIsChatMappingSelectorOpen}
              onFieldKeyDown={handleFieldKeyDown}
              onFieldChange={handleFieldChange}
            />
        )}

        {isWebhook && (
          <WebhookForm
            data={data as WebhookNodeData}
            nodeId={activeNode.id}
            updateNodeData={updateNodeData}
            onFieldKeyDown={handleFieldKeyDown}
            onFieldChange={handleFieldChange}
            allProjectVariables={currentProjectFramework === 'langgraph' ? Array.from(new Set([...allProjectVariables, ...(stateFields || [])])) : allProjectVariables}
          />
        )}
      </div>

      <div className="p-4 border-t border-brand-border bg-brand-bg/50 flex gap-3">
        <button 
          onClick={() => deleteNode(activeNode.id)} 
          data-testid="btn-delete-node"
          className="flex items-center gap-2 text-rose-500 hover:bg-rose-500/10 px-4 py-2 rounded-lg text-sm font-medium transition-all"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
        <button onClick={() => setActiveNode(null)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md">Done</button>
      </div>

      {toolToConfigure && (
        <ToolConfigurationModal
          tool={toolToConfigure}
          isOpen={isToolConfigModalOpen}
          onClose={() => { setIsToolConfigModalOpen(false); setToolToConfigure(null); }}
          onSave={(config) => { const currentIds = (data as AgentNodeData | TaskNodeData).globalToolIds || []; updateNodeData(activeNode.id, { globalToolIds: [...currentIds, { id: toolToConfigure.id, config }] }); }}
        />
      )}
    </div>
  );
}
