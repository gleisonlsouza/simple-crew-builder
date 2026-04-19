import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Plus, Trash2, GitBranch, AlertCircle, ChevronRight, ListTree, Sparkles, Pencil } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { DndContext, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { useStore } from '../../store/index';
import type { AppState } from '../../store/index';
import type { AppNode, AppEdge, RouterNodeData, RouteCondition, RouterOperator, StateNodeData, SchemaNodeData } from '../../types/nodes.types';
import { JsonTree } from '../node-config/JsonVisualMapper';

interface ConditionDropZoneProps {
  id: string;
  value: string;
  onChange: (val: string) => void;
  availableFields: string[];
}

const ConditionDropZone: React.FC<ConditionDropZoneProps> = ({ id, value, onChange, availableFields }) => {
  const { isOver, setNodeRef } = useDroppable({
    id
  });

  return (
    <div 
      ref={setNodeRef}
      className={`relative group transition-all duration-200 ${
        isOver ? 'scale-[1.02]' : ''
      }`}
    >
      <div className={`w-full bg-brand-bg/50 border rounded-lg px-2 py-1.5 text-xs transition-all duration-300 ${
        isOver 
          ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_10px_rgba(99,102,241,0.2)]' 
          : value?.startsWith('{{') 
            ? 'border-indigo-500/30 text-indigo-500 font-mono bg-indigo-500/5' 
            : 'border-brand-border text-brand-text'
      }`}>
        <input
          list={`fields-${id}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Field or Drop JSON path..."
          className="w-full bg-transparent border-none outline-none text-inherit placeholder:italic"
        />
        <datalist id={`fields-${id}`}>
          {availableFields.map(f => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </div>
      {isOver && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg animate-bounce whitespace-nowrap z-10">
          Drop Path Here
        </div>
      )}
    </div>
  );
};

export const RouterNodeModal = () => {
  const isOpen = useStore((state: AppState) => state.isRouterModalOpen);
  const activeRouterNodeId = useStore((state: AppState) => state.activeRouterNodeId);
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
  const updateNodeData = useStore((state: AppState) => state.updateNodeData);
  const closeRouterModal = useStore((state: AppState) => state.closeRouterModal);

  const activeNode = nodes.find((n: AppNode) => n.id === activeRouterNodeId);
  const activeData = activeNode?.data as RouterNodeData | undefined;

  // Source Mode: 'auto' (Schema Discovery) or 'manual' (Pasted JSON)
  const [sourceMode, setSourceMode] = useState<'auto' | 'manual'>('auto');

  // 1. Trace Graph to Auto-Discover Schema
  const discovery = useMemo(() => {
    if (!activeRouterNodeId || !isOpen) return null;

    // A. Find parent Agent (trace backwards from Router)
    const agentEdge = edges.find((e: AppEdge) => {
      if (e.target !== activeRouterNodeId) return false;
      const sourceNode = nodes.find((n: AppNode) => n.id === e.source);
      return sourceNode?.type === 'agent';
    });
    
    if (!agentEdge) return null;
    const agentNode = nodes.find((n: AppNode) => n.id === agentEdge.source);
    if (!agentNode) return null;

    // B. Find grandfather Schema (trace backwards from Agent)
    const schemaEdge = edges.find((e: AppEdge) => {
      if (e.target !== agentNode.id) return false;
      const sourceNode = nodes.find((n: AppNode) => n.id === e.source);
      return sourceNode?.type === 'schema';
    });

    if (!schemaEdge) return { agentName: (agentNode.data as Record<string, unknown>).name as string };
    const schemaNode = nodes.find((n: AppNode) => n.id === schemaEdge.source);
    if (!schemaNode) return { agentName: (agentNode.data as Record<string, unknown>).name as string };
    
    // C. Find which State key is associated with this Schema
    const stateNode = nodes.find((n: AppNode) => n.type === 'state');
    const schemaData = schemaNode.data as SchemaNodeData;
    const schemaName = schemaData.name;
    const stateData = stateNode?.data as StateNodeData | undefined;
    
    // The state field type should match the schema name
    const stateField = stateData?.fields?.find(f => f.type === schemaName);
    const stateKey = stateField?.key || "output";

    // D. Generate Mock JSON
    const mockJson: Record<string, unknown> = {};
    schemaData.fields.forEach(f => {
      let val: unknown = "text";
      if (f.type === 'integer' || f.type === 'float') val = 0;
      else if (f.type === 'boolean') val = true;
      else if (f.type === 'list') val = [];
      else if (f.type === 'dict') val = {};
      mockJson[f.key] = val;
    });

    return {
      agentName: (agentNode.data as Record<string, unknown>).name as string,
      schemaName: schemaData.name,
      stateKey,
      mockData: { [stateKey]: mockJson }
    };
  }, [activeRouterNodeId, nodes, edges, isOpen]);

  // Set default mode based on discovery success when modal opens
  useEffect(() => {
    if (isOpen) {
      if (discovery?.schemaName) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSourceMode('auto');
      } else {
        setSourceMode('manual');
      }
    }
  }, [isOpen, discovery?.schemaName]);

  // Visual Mapper State (Manual Mode)
  const [sampleJson, setSampleJson] = useState('');

  const { manualParsedJson, jsonError } = useMemo(() => {
    if (!sampleJson.trim()) return { manualParsedJson: null, jsonError: null };
    try {
      const parsed = JSON.parse(sampleJson);
      return { manualParsedJson: parsed, jsonError: null };
    } catch (e: unknown) {
      return { 
        manualParsedJson: null, 
        jsonError: e instanceof Error ? e.message : 'Invalid JSON' 
      };
    }
  }, [sampleJson]);

  // Combined data for the tree
  const activeJsonData = sourceMode === 'auto' ? discovery?.mockData : manualParsedJson;

  // Get all available state fields from any state node in the graph
  const availableFields = useMemo(() => {
    const stateNodes = nodes.filter((n: AppNode) => n.type === 'state');
    const fields = new Set<string>();
    stateNodes.forEach((n: AppNode) => {
      const data = n.data as StateNodeData;
      data.fields?.forEach(f => {
        if (f.key) fields.add(f.key);
      });
    });
    return Array.from(fields);
  }, [nodes]);

  const [localConditions, setLocalConditions] = useState<RouteCondition[]>([]);
  const [localName, setLocalName] = useState('');
  const [localDefaultRoute, setLocalDefaultRoute] = useState('Default');

  useEffect(() => {
    if (isOpen && activeData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalConditions(activeData.conditions || []);
      setLocalName(activeData.name || 'Conditional Router');
      setLocalDefaultRoute(activeData.defaultRouteLabel || 'Default');
    }
  }, [isOpen, activeData]);

  const addCondition = () => {
    const newCondition: RouteCondition = {
      id: uuidv4(),
      label: `Path ${localConditions.length + 1}`,
      field: availableFields[0] || '',
      operator: 'is_equal',
      value: '',
    };
    setLocalConditions([...localConditions, newCondition]);
  };

  const removeCondition = (id: string) => {
    setLocalConditions(localConditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<RouteCondition>) => {
    setLocalConditions(
      localConditions.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.data.current?.path) {
      const conditionId = over.id as string;
      const sourcePath = active.data.current.path as string;
      const formattedPath = `{{ $json.${sourcePath} }}`;
      
      setLocalConditions(prev => 
        prev.map(c => c.id === conditionId ? { ...c, field: formattedPath } : c)
      );
    }
  }, []);

  const handleSave = () => {
    if (activeRouterNodeId) {
      updateNodeData(activeRouterNodeId, {
        name: localName,
        conditions: localConditions,
        defaultRouteLabel: localDefaultRoute,
      });
    }
    closeRouterModal();
  };

  if (!isOpen || !activeNode) return null;

  return createPortal(
    <DndContext onDragEnd={handleDragEnd}>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-brand-card w-full max-w-6xl h-[90vh] border border-brand-border rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between bg-brand-bg/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <GitBranch className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-brand-text leading-tight">Router Configuration</h3>
                <p className="text-xs text-brand-muted">Define conditional paths and map fields visually.</p>
              </div>
            </div>
            <button 
              onClick={closeRouterModal}
              className="p-2 hover:bg-brand-bg rounded-xl transition-colors text-brand-muted hover:text-brand-text"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Content Areas */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel: Visual Mapper */}
            <div className="w-[350px] border-r border-brand-border flex flex-col bg-brand-bg/20">
              {/* Source Mode Toggle */}
              <div className="p-4 border-b border-brand-border bg-brand-bg/40">
                <div className="flex p-1 bg-brand-bg/50 rounded-xl border border-brand-border/50">
                  <button
                    onClick={() => setSourceMode('auto')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      sourceMode === 'auto' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-brand-muted hover:text-brand-text'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    Auto-Discover
                  </button>
                  <button
                    onClick={() => setSourceMode('manual')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      sourceMode === 'manual' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-brand-muted hover:text-brand-text'
                    }`}
                  >
                    <Pencil className="w-3 h-3" />
                    Manual Paste
                  </button>
                </div>
              </div>

              {/* Discovery Summary or Manual Input */}
              <div className="p-4 border-b border-brand-border bg-brand-bg/30">
                {sourceMode === 'auto' ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Source Context</label>
                      <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 text-[9px] font-bold rounded border border-indigo-500/20">AGENT OUTPUT</span>
                    </div>
                    {discovery?.agentName ? (
                      <div className="bg-brand-bg/50 border border-brand-border/40 rounded-xl p-3 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[11px] font-medium text-brand-text truncate">Agent: {discovery.agentName}</span>
                        </div>
                        {discovery.schemaName && (
                          <div className="flex items-center gap-2 text-indigo-500">
                             <ListTree className="w-3 h-3" />
                             <span className="text-[10px] font-bold">Schema: {discovery.schemaName}</span>
                          </div>
                        )}
                        {!discovery.schemaName && (
                          <p className="text-[9px] text-amber-500 italic mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            No schema connected to this agent.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3 text-[10px] text-rose-500 italic">
                        No parent agent found. Connect an Agent to this Router first!
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Manual JSON Sample</label>
                      <button 
                        onClick={() => setSampleJson('')} 
                        className="text-[9px] font-bold text-rose-500 hover:underline uppercase"
                      >
                        Clear
                      </button>
                    </div>
                    <textarea
                      className={`w-full h-24 bg-brand-bg border rounded-xl p-2.5 text-[10px] font-mono focus:ring-2 focus:ring-indigo-500 transition-all ${
                        jsonError ? 'border-rose-500 focus:ring-rose-500' : 'border-brand-border'
                      }`}
                      placeholder='{ "result": "OK" }'
                      value={sampleJson}
                      onChange={(e) => setSampleJson(e.target.value)}
                    />
                    {jsonError && <p className="text-[9px] text-rose-500 font-medium italic">Invalid JSON</p>}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {!activeJsonData ? (
                  <div className="h-full flex flex-col items-center justify-center text-brand-muted gap-3 opacity-40">
                    <ListTree className="w-10 h-10" />
                    <p className="text-[10px] font-medium italic text-center max-w-[150px]">
                      {sourceMode === 'auto' 
                        ? 'Connect a Schema node to see fields here.' 
                        : 'Paste a sample JSON above to map fields.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                       <span className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Available Fields</span>
                       {sourceMode === 'auto' && <Sparkles className="w-3 h-3 text-indigo-500" />}
                    </div>
                    <JsonTree data={activeJsonData} label={sourceMode === 'auto' ? "state" : "output"} />
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Logic Builder */}
            <div className="flex-1 flex flex-col overflow-hidden bg-brand-bg/5">
              <div className="p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar flex-1">
                {/* Node Settings Group */}
                <div className="grid grid-cols-2 gap-6 p-4 bg-brand-bg/20 border border-brand-border/40 rounded-2xl">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Router Name</label>
                    <input
                      type="text"
                      value={localName}
                      onChange={(e) => setLocalName(e.target.value)}
                      placeholder="e.g. Lead Qualification"
                      className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Fallback Route Name</label>
                    <input
                      type="text"
                      value={localDefaultRoute}
                      onChange={(e) => setLocalDefaultRoute(e.target.value)}
                      placeholder="e.g. Fallback"
                      className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Conditions Table */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Routing Rules</label>
                    <button
                      onClick={addCondition}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-[10px] font-bold uppercase transition-all shadow-md active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Rule
                    </button>
                  </div>

                  <div className="border border-brand-border rounded-xl overflow-hidden shadow-lg bg-brand-card">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-brand-bg/50 border-b border-brand-border">
                          <th className="px-4 py-3 text-[10px] font-bold text-brand-muted uppercase tracking-widest w-1/4">Path Label</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-brand-muted uppercase tracking-widest w-[30%]">Field to Check</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-brand-muted uppercase tracking-widest w-1/5">Operator</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-brand-muted uppercase tracking-widest">Expected Value</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border text-sm">
                        {localConditions.map((condition) => (
                          <tr key={condition.id} className="bg-brand-card hover:bg-brand-bg/10 transition-colors group/row">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <ChevronRight className="w-3.5 h-3.5 text-indigo-500 opacity-50" />
                                <input
                                  type="text"
                                  value={condition.label}
                                  onChange={(e) => updateCondition(condition.id, { label: e.target.value })}
                                  placeholder="Rule Name"
                                  className="bg-transparent border-none p-0 outline-none text-brand-text focus:text-indigo-500 transition-colors font-medium w-full"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <ConditionDropZone 
                                id={condition.id}
                                value={condition.field}
                                availableFields={availableFields}
                                onChange={(val) => updateCondition(condition.id, { field: val })}
                              />
                            </td>
                            <td className="px-4 py-3">
                          <select
                            value={condition.operator}
                            onChange={(e) => updateCondition(condition.id, { operator: e.target.value as RouterOperator })}
                            className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-2 py-1.5 text-xs text-brand-text outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="is_equal">Is Equal To</option>
                            <option value="is_not_equal">Is Not Equal To</option>
                            <option value="contains">Contains</option>
                            <option value="is_true">Is True</option>
                            <option value="is_false">Is False</option>
                            <option value="is_empty">Is Empty</option>
                            <option value="greater_than">Greater Than</option>
                            <option value="less_than">Less Than</option>
                          </select>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {!['is_true', 'is_false', 'is_empty'].includes(condition.operator) && (
                                <input
                                  type="text"
                                  value={condition.value as string || ''}
                                  onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                                  placeholder="Value"
                                  className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-2 py-1.5 text-brand-text outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => removeCondition(condition.id)}
                                className="p-1.5 text-brand-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover/row:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {localConditions.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-12 text-center">
                              <div className="flex flex-col items-center gap-2 opacity-50">
                                <ListTree className="w-8 h-8 text-indigo-500/40" />
                                <p className="text-xs text-brand-muted italic">Click "Add Rule" and drag fields to define logic.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-2xl p-4 flex gap-4">
                  <div className="p-2 bg-indigo-500/10 rounded-xl h-fit">
                    <AlertCircle className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Execution Logic</p>
                    <p className="text-[11px] text-brand-muted leading-relaxed">
                      Conditions are evaluated top-to-bottom. The first matching path determines the flow. <br/>
                      {sourceMode === 'auto' 
                        ? (<span>✨ Fields above are auto-generated from your <strong>connected schema</strong>.</span>)
                        : (<span>Pro tip: Drag keys from the <strong>JSON tree</strong> on the left and drop them into the <strong>Field to Check</strong> column.</span>)
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-brand-border bg-brand-bg/30 flex items-center justify-end gap-4 shrink-0">
                <button
                  onClick={closeRouterModal}
                  className="px-6 py-2.5 text-sm font-bold text-brand-muted hover:text-brand-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 group"
                >
                  <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Apply Routing Logic
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DndContext>,
    document.body
  );
};
