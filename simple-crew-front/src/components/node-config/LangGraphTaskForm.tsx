import React, { memo } from 'react';
import { Sparkles, CheckCircle, FileText } from 'lucide-react';
import HighlightedTextField from '../HighlightedTextField';
import type { LangGraphTaskData } from '../../types/nodes.types';

interface LangGraphTaskFormProps {
  data: LangGraphTaskData;
  nodeId: string;
  updateNodeData: (id: string, data: Partial<LangGraphTaskData>) => void;
  loadingFields: Record<string, boolean>;
  onAiSuggest: (field: string) => void;
  onFieldKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }, field: string, updateFn: (val: string) => void) => void;
}

export const LangGraphTaskForm: React.FC<LangGraphTaskFormProps> = memo(({
  data,
  nodeId,
  updateNodeData,
  loadingFields,
  onAiSuggest,
  onFieldKeyDown,
  onFieldChange,
}) => {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Description / Prompt
          </label>
          <button 
            onClick={() => onAiSuggest('description')}
            disabled={loadingFields['description']}
            className={`p-1 transition-all duration-300 ${loadingFields['description'] ? 'animate-sparkle-shimmer cursor-wait' : 'text-brand-muted hover:text-indigo-500'}`}
            title="Generate with AI"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
        <HighlightedTextField
          type="textarea"
          value={data.description || ''}
          onKeyDown={onFieldKeyDown}
          onChange={(e) => onFieldChange(e, 'description', (val) => updateNodeData(nodeId, { description: val }))}
          placeholder="What should be done?"
          rows={4}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Expected Output
          </label>
          <button 
            onClick={() => onAiSuggest('expected_output')}
            disabled={loadingFields['expected_output']}
            className={`p-1 transition-all duration-300 ${loadingFields['expected_output'] ? 'animate-sparkle-shimmer cursor-wait' : 'text-brand-muted hover:text-indigo-500'}`}
            title="Generate with AI"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
        <HighlightedTextField
          type="textarea"
          value={data.expected_output || ''}
          onKeyDown={onFieldKeyDown}
          onChange={(e) => onFieldChange(e, 'expected_output', (val) => updateNodeData(nodeId, { expected_output: val }))}
          placeholder="What should the result look like?"
          rows={3}
        />
      </div>
    </div>
  );
});
