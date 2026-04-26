import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessageSquare, ArrowRightFromLine,
  ChevronRight, ChevronDown, Database, Check, X, Layers, Server
} from 'lucide-react';
import type { CrewNodeData, StateFieldInfo, StateNodeInfo } from '../../types/nodes.types';

interface GraphFormProps {
  data: CrewNodeData;
  nodeId: string;
  updateNodeData: (id: string, data: Partial<CrewNodeData>) => void;
  localName: string;
  handleNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  nameError: boolean;
  stateFields?: string[];
  stateNodes?: StateNodeInfo[];
  updateStateConnection: (nodeId: string, stateId: string | null, showLine: boolean, fieldKey?: string | null) => void;
}

// ─── Sub-key row ──────────────────────────────────────────────────────────────
interface SubKeyRowProps {
  path: string;         // e.g. 'response.result'
  label: string;        // right-hand part, e.g. 'result'
  isSelected: boolean;
  onSelect: (path: string) => void;
}

const SubKeyRow: React.FC<SubKeyRowProps> = ({ path, label, isSelected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(path)}
    className={`w-full flex items-center gap-2 pl-8 pr-3 py-1.5 transition-colors text-left ${
      isSelected
        ? 'bg-indigo-500/10 text-indigo-400'
        : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg/50'
    }`}
  >
    <div className="w-px h-3 bg-brand-border/40 shrink-0 -ml-1" />
    <ArrowRightFromLine className="w-3 h-3 shrink-0 opacity-60" />
    <span className="flex-1 text-[11px] font-mono">{label}</span>
    {isSelected && <Check className="w-3 h-3 shrink-0" />}
  </button>
);

// ─── State field row (top-level) ──────────────────────────────────────────────
interface FieldRowProps {
  field: StateFieldInfo;
  selectedKey: string | undefined;
  onSelect: (key: string) => void;
}

const FieldRow: React.FC<FieldRowProps> = ({ field, selectedKey, onSelect }) => {
  const hasSchema = !!field.subKeys;
  // Auto-expand if any sub-key under this field is currently selected
  const anySubSelected = !!field.subKeys?.includes(selectedKey ?? '');
  const [expanded, setExpanded] = useState(anySubSelected);

  const isDirectlySelected = selectedKey === field.key;

  return (
    <div>
      {/* Top-level field */}
      <div className="flex items-center">
        {/* Expand toggle — only when field maps to a Schema */}
        {hasSchema ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-1 ml-1 text-brand-muted hover:text-brand-text transition-colors shrink-0"
          >
            {expanded
              ? <ChevronDown className="w-3 h-3" />
              : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <div className="w-5 shrink-0" />
        )}

        <button
          type="button"
          onClick={() => {
            if (hasSchema) {
              // Clicking a schema field just toggles expand (don't select the parent object)
              setExpanded((v) => !v);
            } else {
              onSelect(field.key);
            }
          }}
          className={`flex-1 flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-left ${
            !hasSchema && isDirectlySelected
              ? 'bg-indigo-500/10 text-indigo-400'
              : 'text-brand-text hover:bg-brand-bg/50'
          }`}
        >
          {hasSchema
            ? <Layers className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            : <Database className="w-3.5 h-3.5 text-indigo-300 shrink-0" />}
          <span className="flex-1 text-[12px] font-mono">{field.key}</span>
          {hasSchema && (
            <span className="text-[9px] text-brand-muted/70 font-sans">{field.type}</span>
          )}
          {!hasSchema && isDirectlySelected && <Check className="w-3.5 h-3.5 shrink-0" />}
        </button>
      </div>

      {/* Schema sub-keys */}
      {hasSchema && expanded && (
        <div className="ml-5 border-l border-brand-border/40 animate-in fade-in slide-in-from-top-1 duration-150">
          {field.subKeys!.length === 0 ? (
            <p className="pl-4 py-1.5 text-[10px] text-brand-muted italic">No fields in schema.</p>
          ) : (
            field.subKeys!.map((path) => {
              const label = path.split('.').slice(1).join('.');
              return (
                <SubKeyRow
                  key={path}
                  path={path}
                  label={label}
                  isSelected={selectedKey === path}
                  onSelect={onSelect}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// ─── Popup ────────────────────────────────────────────────────────────────────
interface OutputPickerPopupProps {
  stateNodes: StateNodeInfo[];
  selectedKey: string | undefined;
  onSelect: (key: string | undefined) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

const OutputPickerPopup: React.FC<OutputPickerPopupProps> = ({
  stateNodes,
  selectedKey,
  onSelect,
  onClose,
  anchorRef,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);

  // Auto-expand single state node
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(
    stateNodes.length === 1 ? stateNodes[0].id : null
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) { onClose(); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSelect = (key: string) => {
    onSelect(selectedKey === key ? undefined : key);
    onClose();
  };

  return (
    <div
      ref={popupRef}
      className="absolute left-0 right-0 z-50 mt-2 bg-brand-card border border-brand-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-brand-border bg-brand-bg/50">
        <span className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Select Output Key</span>
        <div className="flex items-center gap-2">
          {selectedKey && (
            <button
              type="button"
              onClick={() => { onSelect(undefined); onClose(); }}
              className="text-[9px] font-bold text-rose-500 hover:underline uppercase"
            >
              Clear
            </button>
          )}
          <button type="button" onClick={onClose} className="p-0.5 text-brand-muted hover:text-brand-text rounded transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* No state nodes */}
      {stateNodes.length === 0 && (
        <div className="px-4 py-5 text-center">
          <p className="text-[11px] text-brand-muted italic">No <span className="font-semibold">State</span> node found.</p>
          <p className="text-[10px] text-brand-muted/60 mt-1">Add one to unlock key selection.</p>
        </div>
      )}

      {/* State nodes */}
      <div className="max-h-72 overflow-y-auto custom-scrollbar">
        {stateNodes.map((sNode) => {
          const isExpanded = expandedNodeId === sNode.id;
          return (
            <div key={sNode.id} className="border-b border-brand-border/40 last:border-0">
              {/* State node header */}
              <button
                type="button"
                onClick={() => setExpandedNodeId(isExpanded ? null : sNode.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-brand-bg/50 transition-colors group"
              >
                <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="flex-1 text-left text-[12px] font-semibold text-brand-text">{sNode.name}</span>
                <span className="text-[9px] text-brand-muted/60 font-mono mr-1">{sNode.fields.length} fields</span>
                {isExpanded
                  ? <ChevronDown className="w-3.5 h-3.5 text-brand-muted" />
                  : <ChevronRight className="w-3.5 h-3.5 text-brand-muted" />}
              </button>

              {/* Field rows */}
              {isExpanded && (
                <div className="pb-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {sNode.fields.length === 0 ? (
                    <p className="px-8 py-2 text-[10px] text-brand-muted italic">No fields defined.</p>
                  ) : (
                    sNode.fields.map((field) => (
                      <FieldRow
                        key={field.key}
                        field={field}
                        selectedKey={selectedKey}
                        onSelect={handleSelect}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Form ────────────────────────────────────────────────────────────────
export const GraphForm: React.FC<GraphFormProps> = ({
  data,
  nodeId,
  updateNodeData,
  localName,
  handleNameChange,
  nameError,
  stateNodes = [],
  updateStateConnection
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedKey = data.outputKey as string | undefined;

  const setOutputKey = useCallback(
    (key: string | undefined) => updateNodeData(nodeId, { outputKey: key }),
    [nodeId, updateNodeData]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Nav */}
      <div className="flex flex-wrap border-b border-brand-border/50 -mx-6 px-4">
        <button className="flex items-center gap-2 py-2 px-3 text-[10px] font-bold uppercase tracking-wider transition-all rounded-lg mb-2 text-blue-500 bg-blue-500/10 border border-blue-500/20">
          <MessageSquare className="w-3.5 h-3.5" />
          Basic
        </button>
      </div>

      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

        {/* Graph Name */}
        <div className="flex flex-col gap-2">
          <label htmlFor="graph-name-input" className="text-xs font-bold text-brand-muted uppercase tracking-wider">Graph Name</label>
          <input
            id="graph-name-input"
            className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
              nameError
                ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 focus:ring-red-500'
                : 'border-brand-border bg-brand-bg text-brand-text focus:ring-blue-500'
            }`}
            value={localName}
            onChange={handleNameChange}
            placeholder="e.g. Content Generation Graph"
          />
        </div>



        {/* ── State Connection (LangGraph only) ───────────────────────────── */}
        <div className="flex flex-col gap-3 pt-4 border-t border-brand-border/30">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-purple-500" />
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">State Connection</label>
          </div>
          
          <div className="space-y-3">
             <select
               value={data.selectedStateId ? `${data.selectedStateId}${(data as { selectedStateKey?: string }).selectedStateKey ? `:${(data as { selectedStateKey?: string }).selectedStateKey}` : ''}` : ''}
               onChange={(e) => {
                 const val = e.target.value;
                 if (!val) {
                   updateStateConnection(nodeId, null, data.showStateConnections ?? true);
                 } else {
                   const [stateId, key] = val.split(':');
                   updateStateConnection(nodeId, stateId, data.showStateConnections ?? true, key || null);
                 }
               }}
               className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
             >
               <option value="">No State Connected</option>
               {stateNodes.flatMap(stateNode => {
                   const fields = stateNode.fields || [];
                   const options = [
                     <option key={stateNode.id} value={stateNode.id}>{stateNode.name} (Entire State)</option>
                   ];
                   if (fields.length > 0) {
                     options.push(...fields.map((f: StateFieldInfo) => (
                       <option key={`${stateNode.id}-${f.key}`} value={`${stateNode.id}:${f.key}`}>
                         {stateNode.name} &gt; {f.key}
                       </option>
                     )));
                   }
                   return options;
                 })
               }
             </select>

             <label className="flex items-center gap-2 cursor-pointer group/toggle">
                <input
                  type="checkbox"
                  checked={data.showStateConnections ?? true}
                  onChange={(e) => updateStateConnection(nodeId, data.selectedStateId || null, e.target.checked)}
                  className="w-4 h-4 rounded border-brand-border text-purple-600 focus:ring-purple-500 cursor-pointer bg-brand-bg"
                />
                <span className="text-xs font-medium text-brand-muted group-hover/toggle:text-brand-text transition-colors">
                  Show Connection Line on Canvas
                </span>
              </label>
          </div>
          
          <p className="text-[10px] text-brand-muted px-0.5 leading-relaxed italic">
            Connecting to a State node allows this Graph to read/write shared data. 
            You can hide the manual line to reduce visual pollution.
          </p>
        </div>

        {/* ── Final Output Mapping (LangGraph only) ───────────────────────── */}
        <div className="flex flex-col gap-2 pt-4 border-t border-brand-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowRightFromLine className="w-3.5 h-3.5 text-indigo-400" />
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Select Output</label>
            </div>
            {selectedKey && (
              <button
                type="button"
                onClick={() => setOutputKey(undefined)}
                className="text-[10px] font-bold text-rose-500 hover:underline uppercase"
              >
                Reset
              </button>
            )}
          </div>

          {/* Trigger — dashed border, mirroring the "current output" style */}
          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              id="btn-select-output-key"
              data-testid="btn-select-output-key"
              onClick={() => setIsPickerOpen((v) => !v)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-3 rounded-xl border-2 border-dashed transition-all duration-200 group ${
                isPickerOpen
                  ? 'border-indigo-500 bg-indigo-500/8'
                  : selectedKey
                  ? 'border-indigo-500/50 bg-indigo-500/5 hover:border-indigo-500/70'
                  : 'border-brand-border/60 bg-brand-bg/30 hover:border-indigo-500/40 hover:bg-indigo-500/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {selectedKey ? (
                  <>
                    <ArrowRightFromLine className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-[12px] font-mono font-semibold text-indigo-400">{selectedKey}</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 text-brand-muted/50 shrink-0" />
                    <span className="text-[11px] text-brand-muted italic">Entire Graph State (default)</span>
                  </>
                )}
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-brand-muted transition-transform duration-200 ${isPickerOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Floating Popup */}
            {isPickerOpen && (
              <OutputPickerPopup
                stateNodes={stateNodes}
                selectedKey={selectedKey}
                onSelect={setOutputKey}
                onClose={() => setIsPickerOpen(false)}
                anchorRef={triggerRef}
              />
            )}
          </div>

          <p className="text-[10px] text-brand-muted px-0.5 leading-relaxed">
            Choose a state key, or a{' '}
            <span className="font-semibold text-violet-400">Schema sub-field</span>{' '}
            (e.g. <span className="font-mono">response.result</span>) to expose as the final output.
            Leave as default to pass the entire state to downstream nodes.
          </p>
        </div>

      </div>
    </div>
  );
};
