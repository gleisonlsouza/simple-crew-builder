import React, { memo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Globe, Lock, Settings, Copy, RefreshCw, Plus, X, Sparkles, Zap } from 'lucide-react';
import { HighlightedTextField } from '../HighlightedTextField';
import type { WebhookNodeData } from '../../types/nodes.types';
import toast from 'react-hot-toast';
import { WebhookMapperModal } from './WebhookMapperModal';

interface WebhookFormProps {
  data: WebhookNodeData;
  nodeId: string;
  updateNodeData: (id: string, data: Partial<WebhookNodeData>) => void;
  onFieldKeyDown: (e: React.KeyboardEvent) => void;
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: string, updateFn: (val: string) => void) => void;
  allProjectVariables: string[];
}

export const WebhookForm: React.FC<WebhookFormProps> = memo(({
  data,
  nodeId,
  updateNodeData,
  onFieldKeyDown,
  onFieldChange,
  allProjectVariables
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'security' | 'mappings'>('basic');
  const [isMapperOpen, setIsMapperOpen] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('URL copied to clipboard!');
  };

  const handleGenerateToken = () => {
    const newToken = uuidv4().replace(/-/g, '');
    updateNodeData(nodeId, { token: newToken });
    toast.success('Token generated! Remember to save the project.');
  };

  const sluggify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  };

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const slug = sluggify(rawValue);
    updateNodeData(nodeId, { path: slug });
  };

  const getBackendUrl = () => {
    try {
      if (import.meta.env?.VITE_API_URL) return import.meta.env.VITE_API_URL;
    } catch (e) {
      // Fallback for environments where import.meta is restricted
    }
    return (window as any).VITE_API_URL || 'http://localhost:3001';
  };

  const backendUrl = getBackendUrl();
  const displayUrl = `${backendUrl}/webhook/${data.path || ''}`;
  const placeholderUrl = `${backendUrl}/webhook/your-slug-here`;

  const addHeader = () => {
    const headers = { ...(data.headers || {}) } as Record<string, string>;
    headers[''] = '';
    updateNodeData(nodeId, { headers });
  };

  const updateHeader = (oldKey: string, newKey: string, value: string) => {
    const headers = { ...(data.headers || {}) } as Record<string, string>;
    if (oldKey !== newKey) {
      delete headers[oldKey];
    }
    headers[newKey] = value;
    updateNodeData(nodeId, { headers });
  };

  const removeHeader = (key: string) => {
    const headers = { ...(data.headers || {}) } as Record<string, string>;
    delete headers[key];
    updateNodeData(nodeId, { headers });
  };

  const addMapping = () => {
    const mappings = { ...(data.fieldMappings || {}) } as Record<string, string>;
    mappings[''] = '';
    updateNodeData(nodeId, { fieldMappings: mappings });
  };

  const updateMapping = (oldKey: string, newKey: string, value: string) => {
    const mappings = { ...(data.fieldMappings || {}) } as Record<string, string>;
    if (oldKey !== newKey) {
      delete mappings[oldKey];
    }
    mappings[newKey] = value;
    updateNodeData(nodeId, { fieldMappings: mappings });
  };

  const removeMapping = (key: string) => {
    const mappings = { ...(data.fieldMappings || {}) } as Record<string, string>;
    delete mappings[key];
    updateNodeData(nodeId, { fieldMappings: mappings });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* -- Basic Settings -- */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Name</label>
          <HighlightedTextField
            type="input"
            value={data.name || ''}
            onKeyDown={onFieldKeyDown}
            onChange={(e) => onFieldChange(e, 'name', (val) => updateNodeData(nodeId, { name: val }))}
            placeholder="e.g. Stripe Webhook"
          />
        </div>
      </div>

      {/* -- Endpoint Config -- */}
      <div className="flex flex-col gap-4 bg-brand-bg/20 p-4 rounded-xl border border-brand-border/30">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">Webhook Path</label>
          <HighlightedTextField
            type="input"
            value={data.path || ''}
            onKeyDown={onFieldKeyDown}
            onChange={handlePathChange}
            placeholder="e.g. stripe-payment-success"
          />
          <p className="text-[9px] text-brand-muted">
            The unique identifier for this webhook. No spaces or special characters.
          </p>
        </div>

        <div className="h-px bg-brand-border/30 my-1" />

        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">HTTP Method</label>
          <div className="flex bg-brand-bg rounded-lg p-1 border border-brand-border">
            {['POST', 'GET'].map((m) => (
              <button
                key={m}
                onClick={() => updateNodeData(nodeId, { method: m as 'POST' | 'GET' })}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                  (data.method || 'POST') === m
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-brand-muted hover:text-brand-text'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-brand-muted uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-orange-500" />
            Endpoint URL
          </label>
          <div className="relative group">
            <input
              type="text"
              readOnly
              value={data.path ? displayUrl : placeholderUrl}
              className={`w-full bg-brand-bg border border-brand-border rounded-lg pl-3 pr-10 py-2 text-xs font-mono transition-colors ${
                data.path ? 'text-brand-text border-orange-500/30' : 'text-brand-muted italic'
              }`}
            />
            {data.path && (
              <button
                onClick={() => copyToClipboard(displayUrl)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-orange-500/10 text-orange-500 rounded-md transition-colors"
                title="Copy URL"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-brand-muted italic">
            Use this URL to trigger your crew execution externally.
          </p>
        </div>
      </div>

      {/* -- Tabs -- */}
      <div className="flex items-center gap-1 border-b border-brand-border/50 pb-2">
        {[
          { id: 'basic', label: 'Basic', icon: Settings },
          { id: 'security', label: 'Security', icon: Lock },
          { id: 'mappings', label: 'Input Mappings', icon: Sparkles },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              activeTab === tab.id
                ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-sm'
                : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg border border-transparent'
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* -- Basic Tab -- */}
      {activeTab === 'basic' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
           <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    className="sr-only"
                    checked={data.isActive !== false}
                    onChange={(e) => updateNodeData(nodeId, { isActive: e.target.checked })}
                  />
                  <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${data.isActive !== false ? 'bg-orange-500/20 border-orange-500' : ''}`}>
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${data.isActive !== false ? 'translate-x-4 bg-orange-500' : 'bg-brand-muted'}`} />
                  </div>
                </div>
                <span className="text-[10px] text-brand-text uppercase font-bold group-hover:text-orange-500 transition-colors">Active</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    className="sr-only"
                    checked={data.waitForResult === true}
                    onChange={(e) => updateNodeData(nodeId, { waitForResult: e.target.checked })}
                  />
                  <div className={`w-8 h-4 bg-brand-bg border border-brand-border rounded-full transition-colors ${data.waitForResult === true ? 'bg-orange-500/20 border-orange-500' : ''}`}>
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${data.waitForResult === true ? 'translate-x-4 bg-orange-500' : 'bg-brand-muted'}`} />
                  </div>
                </div>
                <span className="text-[10px] text-brand-text uppercase font-bold group-hover:text-orange-500 transition-colors" title="Sync mode: Wait for completion and return output">Wait Result</span>
              </label>
           </div>

           <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Custom Headers (Validation)</label>
                <button onClick={addHeader} className="p-1 hover:bg-brand-bg rounded-full text-orange-500">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {Object.entries((data.headers || {}) as Record<string, string>).map(([key, value], idx) => (
                  <div key={idx} className="flex items-center gap-2 min-w-0">
                    <input
                      className="flex-1 min-w-0 bg-brand-bg border border-brand-border rounded-lg px-2 py-1.5 text-xs text-brand-text outline-none focus:ring-1 focus:ring-orange-500"
                      value={key}
                      onChange={(e) => updateHeader(key, e.target.value, value)}
                      placeholder="Header Name"
                    />
                    <input
                      className="flex-1 min-w-0 bg-brand-bg border border-brand-border rounded-lg px-2 py-1.5 text-xs text-brand-text outline-none focus:ring-1 focus:ring-orange-500"
                      value={value}
                      onChange={(e) => updateHeader(key, key, e.target.value)}
                      placeholder="Expected Value"
                    />
                    <button onClick={() => removeHeader(key)} className="flex-shrink-0 p-1 text-brand-muted hover:text-rose-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {Object.entries((data.headers || {}) as Record<string, string>).length === 0 && (
                   <div className="text-[10px] text-brand-muted italic bg-brand-bg/30 p-3 rounded-lg border border-dashed border-brand-border text-center">
                      No custom validation headers defined.
                   </div>
                )}
              </div>
           </div>
        </div>
      )}

      {/* -- Security Tab -- */}
      {activeTab === 'security' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-brand-text uppercase">Bearer Token</label>
                <span className="text-[10px] text-brand-muted">Protect your endpoint with token authentication</span>
              </div>
              <button
                onClick={handleGenerateToken}
                className="flex items-center gap-1.5 text-[10px] font-bold text-orange-500 hover:text-orange-600 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                {data.token ? 'Rotate Token' : 'Generate Token'}
              </button>
            </div>

            {data.token ? (
              <div className="flex flex-col gap-2">
                <div className="relative group">
                  <input
                    type="password"
                    readOnly
                    value={data.token}
                    className="w-full bg-brand-bg border border-brand-border rounded-lg pl-3 pr-10 py-2 text-xs text-brand-text font-mono"
                  />
                  <button
                    onClick={() => { copyToClipboard(data.token!); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-orange-500/10 text-orange-500 rounded-md transition-colors"
                    title="Copy token"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[9px] text-brand-muted leading-relaxed">
                  Send the token in the <code className="bg-brand-bg px-1 rounded text-orange-500">Authorization: Bearer &lt;token&gt;</code> header.
                </p>
              </div>
            ) : (
              <div className="text-[10px] text-brand-muted italic bg-brand-bg/30 p-3 rounded-lg border border-dashed border-brand-border text-center">
                No token configured. Endpoint is publicly accessible.
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- Mappings Tab -- */}
      {activeTab === 'mappings' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
           <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                 <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Payload Mapping</label>
                    <span className="text-[9px] text-brand-muted">Map JSON payload keys to Crew inputs</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsMapperOpen(true)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 text-[9px] font-bold uppercase transition-all"
                    >
                      <Zap className="w-3 h-3" />
                      Visual Mapper
                    </button>
                    <button onClick={addMapping} className="p-1 hover:bg-brand-bg rounded-full text-orange-500">
                       <Plus className="w-3.5 h-3.5" />
                    </button>
                 </div>
              </div>

              <div className="flex flex-col gap-2">
                 {Object.entries((data.fieldMappings || {}) as Record<string, string>).map(([key, value], idx) => (
                    <div key={idx} className="flex items-center gap-2 min-w-0">
                       <input
                          className="flex-1 min-w-0 bg-brand-bg border border-brand-border rounded-lg px-2 py-1.5 text-xs text-brand-text outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                          value={key}
                          onChange={(e) => updateMapping(key, e.target.value, value)}
                          placeholder="Crew Input (e.g. city)"
                       />
                       <div className="flex-shrink-0 text-brand-muted text-xs">→</div>
                       <input
                          className="flex-1 min-w-0 bg-brand-bg border border-brand-border rounded-lg px-2 py-1.5 text-xs text-brand-text outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                          value={value}
                          onChange={(e) => updateMapping(key, key, e.target.value)}
                          placeholder="JSON Path (e.g. data.geo.city)"
                       />
                       <button onClick={() => removeMapping(key)} className="flex-shrink-0 p-1 text-brand-muted hover:text-rose-500">
                          <X className="w-3.5 h-3.5" />
                       </button>
                    </div>
                 ))}
                 {Object.entries((data.fieldMappings || {}) as Record<string, string>).length === 0 && (
                    <div className="text-[10px] text-brand-muted italic bg-brand-bg/30 p-4 rounded-lg border border-dashed border-brand-border text-center">
                       No field mappings defined.
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      <WebhookMapperModal
        isOpen={isMapperOpen}
        onClose={() => setIsMapperOpen(false)}
        data={data}
        nodeId={nodeId}
        updateNodeData={updateNodeData}
        allProjectVariables={allProjectVariables}
      />
    </div>
  );
});
