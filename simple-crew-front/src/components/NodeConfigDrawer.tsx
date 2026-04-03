import { X, Trash2, Plus, Sparkles, AlertCircle } from 'lucide-react';
import { useNodeConfig } from '../hooks/useNodeConfig';
import { ToolConfigurationModal } from './ToolConfigurationModal';
import { AgentForm } from './node-config/AgentForm';
import { TaskForm } from './node-config/TaskForm';
import { CrewForm } from './node-config/CrewForm';
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
import type { AgentNodeData, TaskNodeData, CrewNodeData, ChatNodeData, WebhookNodeData } from '../types/nodes.types';



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
    isChatConnected,
    allProjectVariables,
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
    <div className="absolute right-0 top-0 h-full w-96 bg-brand-card shadow-[-20px_0_50px_rgba(0,0,0,0.1)] dark:shadow-[-20px_0_50px_rgba(0,0,0,0.3)] z-50 flex flex-col border-l border-brand-border transition-all duration-300">
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

      {/* -- Autocomplete Dropdown -- */}
      {suggestionState.isOpen && (
        <div 
          className="fixed z-[100] bg-brand-card border border-brand-border rounded-xl shadow-2xl py-1.5 w-64 overflow-hidden animate-in fade-in zoom-in duration-150"
          style={(() => {
            const rect = suggestionState.anchorRect;
            const spaceBelow = rect ? window.innerHeight - rect.bottom : 0;
            const dropdownHeight = 220;
            if (rect && spaceBelow < dropdownHeight) {
              return { bottom: window.innerHeight - rect.top + 4, left: rect.left, maxHeight: '200px' };
            }
            return { top: (rect?.bottom || 0) + 4, left: rect?.left || 0, maxHeight: '200px' };
          })()}
        >
          <div className="px-3 py-1.5 border-b border-brand-border mb-1">
            <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Crew Input Variables</span>
          </div>
          <div className="overflow-y-auto max-h-[160px] custom-scrollbar">
            {Object.keys((nodes.find(n => n.type === 'crew')?.data as any)?.inputs || {})
              .filter(k => !k.startsWith('input_') && k.toLowerCase().includes(suggestionState.filter.toLowerCase()))
              .map((key, idx) => (
                <button
                  key={key}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(key);
                  }}
                  onMouseEnter={() => setSuggestionState(prev => ({ ...prev, selectedIndex: idx }))}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                    idx === suggestionState.selectedIndex 
                      ? 'bg-blue-500/10 text-blue-500' 
                      : 'text-brand-text hover:bg-brand-bg'
                  }`}
                >
                  <span className="truncate">{key}</span>
                  <Plus className={`w-3 h-3 ${idx === suggestionState.selectedIndex ? 'opacity-100' : 'opacity-0'}`} />
                </button>
              ))}
            {Object.keys((nodes.find(n => n.type === 'crew')?.data as any)?.inputs || {})
              .filter(k => !k.startsWith('input_') && k.toLowerCase().includes(suggestionState.filter.toLowerCase())).length === 0 && (
              <div className="px-3 py-3 text-center">
                <p className="text-[10px] text-brand-muted italic">No matching inputs.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-6 flex-1 overflow-y-auto">
        {(type === 'agent' || type === 'task') && (
          <div className="flex flex-col gap-2 mb-6 pb-6 border-b border-brand-border/50">
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
          <AgentForm
            data={data as AgentNodeData}
            nodeId={activeNode.id}
            updateNodeData={updateNodeData}
            models={models}
            mcpServers={mcpServers}
            globalTools={globalTools}
            customTools={customTools}
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
        )}

        {isTask && (
          <TaskForm
            data={data as TaskNodeData}
            nodeId={activeNode.id}
            updateNodeData={updateNodeData}
            nodes={nodes}
            loadingFields={loadingFields}
            onAiSuggest={handleAiSuggest}
            onFieldKeyDown={handleFieldKeyDown}
            onFieldChange={handleFieldChange}
            isContextSelectorOpen={isContextSelectorOpen}
            setIsContextSelectorOpen={setIsContextSelectorOpen}
          />
        )}

        {isCrew && (
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
          />
        )}

        {isChat && (
          <ChatForm
            data={data as ChatNodeData}
            nodeId={activeNode.id}
            updateNodeData={updateNodeData}
            isChatConnected={isChatConnected}
            connectedCrewInputs={connectedCrewInputs}
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
            allProjectVariables={allProjectVariables}
          />
        )}
      </div>

      <div className="p-4 border-t border-brand-border bg-brand-bg/50 flex gap-3">
        <button onClick={() => deleteNode(activeNode.id)} className="flex items-center gap-2 text-rose-500 hover:bg-rose-500/10 px-4 py-2 rounded-lg text-sm font-medium transition-all"><Trash2 className="w-4 h-4" />Delete</button>
        <button onClick={() => setActiveNode(null)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md">Done</button>
      </div>

      {toolToConfigure && (
        <ToolConfigurationModal
          tool={toolToConfigure}
          isOpen={isToolConfigModalOpen}
          onClose={() => { setIsToolConfigModalOpen(false); setToolToConfigure(null); }}
          onSave={(config) => { const currentIds = (data as any).globalToolIds || []; updateNodeData(activeNode.id, { globalToolIds: [...currentIds, { id: toolToConfigure.id, config }] }); }}
        />
      )}
    </div>
  );
}
