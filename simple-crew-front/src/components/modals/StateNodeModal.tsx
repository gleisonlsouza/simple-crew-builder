import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Plus, Trash2, Database, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../../store/index';
import type { StateNodeData, StateField } from '../../types/nodes.types';

export const StateNodeModal = () => {
  const isOpen = useStore((state) => state.isStateModalOpen);
  const activeStateNodeId = useStore((state) => state.activeStateNodeId);
  const nodes = useStore((state) => state.nodes);
  const updateNodeData = useStore((state) => state.updateNodeData);
  const closeStateModal = useStore((state) => state.closeStateModal);


  const activeNode = nodes.find((n) => n.id === activeStateNodeId);
  const activeData = activeNode?.data as StateNodeData | undefined;

  // Discover schema node names from the canvas (no edge required)
  const schemaTypes = useMemo(() => {
    return nodes
      .filter((n) => n.type === 'schema' && (n.data as Record<string, unknown>)?.name)
      .map((n) => (n.data as Record<string, unknown>).name as string);
  }, [nodes]);


  const [localFields, setLocalFields] = useState<StateField[]>([]);
  const [localName, setLocalName] = useState('');

  useEffect(() => {
    if (isOpen && activeData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalFields(activeData.fields || []);
      setLocalName(activeData.name || 'Application State');
    }
  }, [isOpen, activeData]);

  const addField = () => {
    const newField: StateField = {
      id: uuidv4(),
      key: '',
      type: 'string',
      reducer: 'overwrite',
      defaultValue: '',
    };
    setLocalFields([...localFields, newField]);
  };

  const removeField = (id: string) => {
    setLocalFields(localFields.filter((f) => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<StateField>) => {
    setLocalFields(
      localFields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleSave = () => {
    if (activeStateNodeId) {
      updateNodeData(activeStateNodeId, {
        name: localName,
        fields: localFields,
      });
    }
    closeStateModal();
  };

  if (!isOpen || !activeNode) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-brand-card w-full max-w-3xl border border-brand-border rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-brand-border flex items-center justify-between bg-brand-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <Database className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-brand-text">State Schema Configuration</h3>
              <p className="text-xs text-brand-muted">Define the TypedDict structure for your LangGraph state.</p>
            </div>
          </div>
          <button 
            onClick={closeStateModal}
            className="p-2 hover:bg-brand-bg rounded-xl transition-colors text-brand-muted hover:text-brand-text"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Node Name */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Node Name</label>
            <input
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="e.g. AppState"
              className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-purple-600 transition-all font-medium"
            />
          </div>

          {/* Fields Table */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">State Fields</label>
              <button
                onClick={addField}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/10 text-purple-500 hover:bg-purple-600/20 rounded-lg text-[11px] font-bold uppercase transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Field
              </button>
            </div>

            <div className="border border-brand-border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-bg/50 border-b border-brand-border">
                    <th className="px-4 py-3 text-[10px] font-bold text-brand-muted uppercase tracking-widest">Key</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-brand-muted uppercase tracking-widest w-40">Type</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-brand-muted uppercase tracking-widest w-40">Reducer</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-brand-muted uppercase tracking-widest">Default Value</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {localFields?.map((field) => (
                    <tr key={field.id} className="bg-brand-card hover:bg-brand-bg/30 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={field.key}
                          onChange={(e) => updateField(field.id, { key: e.target.value })}
                          placeholder="messages, context, etc."
                          className="w-full bg-transparent text-sm text-brand-text outline-none focus:text-purple-500 transition-colors font-medium"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={field.type}
                          onChange={(e) => updateField(field.id, { type: e.target.value })}
                          className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-2 py-1.5 text-xs text-brand-text outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                        >
                          <optgroup label="Standard Types">
                            <option value="string">String</option>
                            <option value="integer">Integer</option>
                            <option value="boolean">Boolean</option>
                            <option value="list">List</option>
                            <option value="dict">Dict</option>
                          </optgroup>
                          {schemaTypes?.length > 0 && (
                            <optgroup label="Schema Nodes">
                              {schemaTypes.map((schemaName, idx) => (
                                <option key={`schema-${idx}`} value={schemaName}>
                                  {schemaName}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {/* Fallback for deleted schemas or unknown types */}
                          {!['string', 'integer', 'boolean', 'list', 'dict'].includes(field.type?.toLowerCase()) && !schemaTypes?.includes(field.type) && (
                            <optgroup label="Unknown Type (Missing)">
                              <option value={field.type}>{field.type} (Not Found)</option>
                            </optgroup>
                          )}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={field.reducer}
                          onChange={(e) => updateField(field.id, { reducer: e.target.value as 'overwrite' | 'append' })}
                          className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-2 py-1.5 text-xs text-brand-text outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                        >
                          <option value="overwrite">Overwrite</option>
                          <option value="append">Append (Add)</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={field.defaultValue as string || ''}
                          onChange={(e) => updateField(field.id, { defaultValue: e.target.value })}
                          placeholder="Default value..."
                          className="w-full bg-transparent text-sm text-brand-text outline-none focus:text-purple-500 transition-colors"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => removeField(field.id)}
                          className="p-1.5 text-brand-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!localFields || localFields.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center">
                        <div className="flex flex-col items-center gap-2 opacity-50 grayscale">
                          <Database className="w-8 h-8 text-brand-muted" />
                          <p className="text-xs text-brand-muted italic">No fields defined yet.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-purple-500 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-purple-600 dark:text-purple-400">Important</p>
              <p className="text-[11px] text-brand-muted-700 dark:text-brand-muted leading-relaxed">
                The schema defined here represents the global TypedDict shared among all nodes in the Graph. 
                Using "Append" for lists allows multiple nodes to contribute to the same key (e.g., adding messages).
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-brand-border bg-brand-bg/30 flex items-center justify-end gap-3">
          <button
            onClick={closeStateModal}
            className="px-5 py-2.5 text-sm font-bold text-brand-muted hover:text-brand-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-600/20 transition-all active:scale-95 group"
          >
            <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Save State
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
