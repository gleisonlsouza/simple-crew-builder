import React, { memo } from 'react';
import { MessageCircle } from 'lucide-react';
import { HighlightedTextField } from '../HighlightedTextField';
import type { ChatNodeData } from '../../types/nodes.types';

interface ChatFormProps {
  data: ChatNodeData;
  nodeId: string;
  updateNodeData: (id: string, data: Partial<ChatNodeData>) => void;
  isChatConnected: boolean;
  connectedCrewInputs: string[];
  isChatMappingSelectorOpen: boolean;
  setIsChatMappingSelectorOpen: (open: boolean) => void;
  onFieldKeyDown: (e: React.KeyboardEvent) => void;
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: string, updateFn: (val: string) => void) => void;
}

export const ChatForm: React.FC<ChatFormProps> = memo(({
  data,
  nodeId,
  updateNodeData,
  isChatConnected,
  connectedCrewInputs,
  isChatMappingSelectorOpen,
  setIsChatMappingSelectorOpen,
  onFieldKeyDown,
  onFieldChange
}) => {
  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Description Field */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Description</label>
        <HighlightedTextField
          type="textarea"
          value={data.description || ''}
          onKeyDown={onFieldKeyDown}
          onChange={(e) => onFieldChange(e, 'description', (val) => updateNodeData(nodeId, { description: val }))}
          placeholder="Briefly describe what this chat trigger does..."
          rows={2}
        />
      </div>

      {/* Crew Input Variable Mapping */}
      <div className="flex flex-col gap-2 pt-4 border-t border-brand-border/50">
        <label className="text-xs font-bold text-brand-muted uppercase tracking-wider flex items-center gap-2">
           <MessageCircle className="w-3.5 h-3.5 text-cyan-500" />
           Crew Input Variable
        </label>
        <p className="text-[11px] text-brand-muted opacity-80 mb-1">
          Select which variable in the Crew this chat should provide input for.
        </p>
        <div className="relative">
          <button 
            onClick={() => isChatConnected && setIsChatMappingSelectorOpen(!isChatMappingSelectorOpen)} 
            className={`w-full flex justify-between items-center px-3 py-2.5 rounded-lg border border-dashed transition-all duration-200 ${
              isChatConnected 
                ? 'bg-cyan-500/5 border-cyan-500/30 text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/10' 
                : 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-60'
            }`}
          >
            <span className="font-mono text-xs truncate">
              {!isChatConnected ? 'Connect to a Crew Node first' : (data.inputMapping || '+ Select Input Mapping')}
            </span>
            {isChatConnected && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />}
          </button>
          
          {isChatMappingSelectorOpen && isChatConnected && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsChatMappingSelectorOpen(false)}
              />
              <div className="absolute left-0 right-0 top-full mt-2 bg-brand-card border border-brand-border rounded-xl shadow-2xl z-20 py-2 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 custom-scrollbar">
                {connectedCrewInputs.map(input => (
                  <button 
                    key={input} 
                    onClick={() => { 
                      updateNodeData(nodeId, { inputMapping: input }); 
                      setIsChatMappingSelectorOpen(false); 
                    }} 
                    className={`w-full px-4 py-2 text-xs hover:bg-brand-bg transition-colors text-left font-mono ${
                      data.inputMapping === input ? 'text-cyan-400 bg-cyan-500/5 font-bold' : 'text-brand-text'
                    }`}
                  >
                    {input}
                  </button>
                ))}
                {connectedCrewInputs.length === 0 && (
                  <div className="px-4 py-3 text-center">
                    <p className="text-[10px] text-brand-muted italic">No inputs found in the connected Crew.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Execution Options */}
      <div className="flex flex-col gap-4 pt-4 border-t border-brand-border/50">
        <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wider">Chat Options</h3>
        
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative flex items-center">
            <input 
              type="checkbox" 
              className="sr-only"
              checked={data.includeHistory === true}
              onChange={(e) => updateNodeData(nodeId, { includeHistory: e.target.checked })}
            />
            <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${data.includeHistory ? 'bg-cyan-500/20 border-cyan-500' : ''}`}>
              <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${data.includeHistory ? 'translate-x-4 bg-cyan-500' : 'bg-brand-muted'}`} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-brand-text font-medium group-hover:text-cyan-400 transition-colors tracking-tight">Include History</span>
            <span className="text-[10px] text-brand-muted leading-tight">Send context from previous messages to the Crew.</span>
          </div>
        </label>
      </div>

      {/* System Message / Initial Instructions */}
      <div className="flex flex-col gap-2 pt-4 border-t border-brand-border/50">
        <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">System Message</label>
        <p className="text-[10px] text-brand-muted italic mb-1">
          Initial instructions or context provided to the AI at the start of the chat.
        </p>
        <HighlightedTextField
          type="textarea"
          value={data.systemMessage || ''}
          onKeyDown={onFieldKeyDown}
          onChange={(e) => onFieldChange(e, 'systemMessage', (val) => updateNodeData(nodeId, { systemMessage: val }))}
          placeholder="e.g. You are a helpful assistant specialized in SEO..."
          rows={5}
        />
      </div>
    </div>
  );
});
