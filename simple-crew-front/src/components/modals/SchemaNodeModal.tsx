import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Plus, Trash2, FileJson, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../../store/index';
import type { AppState } from '../../store/index';
import type { AppNode, SchemaNodeData, SchemaField } from '../../types/nodes.types';

export const SchemaNodeModal = () => {
  const isOpen = useStore((state: AppState) => state.isSchemaModalOpen);
  const activeNodeId = useStore((state: AppState) => state.activeSchemaNodeId);
  const nodes = useStore((state: AppState) => state.nodes, (oldNodes: AppNode[], newNodes: AppNode[]) => {
    if (oldNodes.length !== newNodes.length) return false;
    for (let i = 0; i < oldNodes.length; i++) {
        if (oldNodes[i].id !== newNodes[i].id) return false;
        if (oldNodes[i].type !== newNodes[i].type) return false;
        if (JSON.stringify(oldNodes[i].data) !== JSON.stringify(newNodes[i].data)) return false;
    }
    return true;
  });
  const updateNodeData = useStore((state: AppState) => state.updateNodeData);
  const closeSchemaModal = useStore((state: AppState) => state.closeSchemaModal);

  const activeNode = nodes.find((n: AppNode) => n.id === activeNodeId);
  const activeData = activeNode?.data as SchemaNodeData | undefined;

  const [localFields, setLocalFields] = useState<SchemaField[]>([]);
  const [localName, setLocalName] = useState('');

  useEffect(() => {
    if (isOpen && activeData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalFields(activeData.fields || []);
      setLocalName(activeData.name || 'Output Schema');
    }
  }, [isOpen, activeData]);

  const addField = () => {
    const newField: SchemaField = {
      id: uuidv4(),
      key: '',
      type: 'string',
      description: '',
      defaultValue: '',
    };
    setLocalFields([...localFields, newField]);
  };

  const removeField = (id: string) => {
    setLocalFields(localFields.filter((f) => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<SchemaField>) => {
    setLocalFields(
      localFields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleSave = () => {
    if (activeNodeId) {
      updateNodeData(activeNodeId, {
        name: localName,
        fields: localFields,
      });
    }
    closeSchemaModal();
  };

  if (!isOpen || !activeNode) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-brand-card w-full max-w-4xl border border-brand-border rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-brand-border flex items-center justify-between bg-brand-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
              <FileJson className="w-5 h-5 text-teal-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-brand-text">Extraction Schema (Pydantic)</h3>
              <p className="text-xs text-brand-muted">Define the structured data model for LLM extraction and validation.</p>
            </div>
          </div>
          <button 
            onClick={closeSchemaModal}
            className="p-2 hover:bg-brand-bg rounded-xl transition-colors text-brand-muted hover:text-brand-text"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Node Name */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Model Name</label>
            <input
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="e.g. ScrapedData"
              className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium"
            />
          </div>

          {/* Fields Table */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Attributes</label>
              <button
                onClick={addField}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600/10 text-teal-600 hover:bg-teal-600/20 rounded-lg text-[11px] font-bold uppercase transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Attribute
              </button>
            </div>

            <div className="border border-brand-border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-bg/50 border-b border-brand-border">
                    <th className="px-4 py-3 text-[10px] font-bold text-brand-muted uppercase tracking-widest w-48">Key</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-brand-muted uppercase tracking-widest w-32">Type</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-brand-muted uppercase tracking-widest">Description (Docstring)</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-brand-muted uppercase tracking-widest w-40">Default Value</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {localFields.map((field) => (
                    <tr key={field.id} className="bg-brand-card hover:bg-brand-bg/30 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={field.key}
                          onChange={(e) => updateField(field.id, { key: e.target.value })}
                          placeholder="e.g. user_intent"
                          className="w-full bg-transparent text-sm text-brand-text outline-none focus:text-teal-600 transition-colors font-medium font-mono"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={field.type}
                          onChange={(e) => updateField(field.id, { type: e.target.value as 'string' | 'integer' | 'boolean' | 'float' | 'list' | 'dict' })}
                          className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-2 py-1.5 text-xs text-brand-text outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                        >
                          <option value="string">String</option>
                          <option value="integer">Integer</option>
                          <option value="float">Float</option>
                          <option value="boolean">Boolean</option>
                          <option value="list">List</option>
                          <option value="dict">Dict</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={field.description}
                          onChange={(e) => updateField(field.id, { description: e.target.value })}
                          placeholder="Explain to the LLM what this field represents..."
                          className="w-full bg-transparent text-sm text-brand-text/80 outline-none focus:text-brand-text transition-colors italic"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={field.defaultValue as string || ''}
                          onChange={(e) => updateField(field.id, { defaultValue: e.target.value })}
                          placeholder="Default value..."
                          className="w-full bg-transparent text-sm text-brand-text outline-none focus:text-teal-600 transition-colors"
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
                  {localFields.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center">
                        <div className="flex flex-col items-center gap-2 opacity-50 grayscale">
                          <FileJson className="w-8 h-8 text-brand-muted" />
                          <p className="text-xs text-brand-muted italic">No attributes defined yet.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-teal-500/5 border border-teal-500/15 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-teal-600 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-teal-700 dark:text-teal-400">LLM Guidance</p>
              <p className="text-[11px] text-brand-muted-700 dark:text-brand-muted leading-relaxed">
                The key and description will be used as field metadata in the generated Pydantic model. 
                Clear descriptions significantly improve the accuracy of structured data extraction.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-brand-border bg-brand-bg/30 flex items-center justify-end gap-3">
          <button
            onClick={closeSchemaModal}
            className="px-5 py-2.5 text-sm font-bold text-brand-muted hover:text-brand-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-teal-600/20 transition-all active:scale-95 group"
          >
            <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Save Schema
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
