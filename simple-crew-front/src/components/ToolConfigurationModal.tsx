import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings2, Save, AlertCircle, Loader2 } from 'lucide-react';
import type { ToolConfig } from '../types/config.types';
import { CustomSelect } from './CustomSelect';

interface ToolConfigurationModalProps {
  tool: ToolConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: Record<string, any>) => void;
  initialConfig?: Record<string, any>; // Adicionado para edição
}

export const ToolConfigurationModal = ({ tool, isOpen, onClose, onSave, initialConfig }: ToolConfigurationModalProps) => {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Record<string, { label: string; value: string }[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && tool.user_config_schema) {
      // Usa initialConfig se fornecido, senão usa defaults
      const startConfig: Record<string, any> = { ...(initialConfig || {}) };
      
      if (!initialConfig) {
        Object.entries(tool.user_config_schema.fields).forEach(([key, field]) => {
          if (field.type === 'boolean') startConfig[key] = false;
          else startConfig[key] = '';
        });
      }
      
      setConfig(startConfig);
      setErrors({});

      // Fetch dynamic options
      Object.entries(tool.user_config_schema.fields).forEach(([key, field]) => {
        if (field.type === 'select' && field.optionsUrl) {
          fetchOptions(key, field.optionsUrl);
        }
      });
    }
  }, [isOpen, tool]);

  const fetchOptions = async (fieldKey: string, url: string) => {
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}${url}`);
      if (!response.ok) throw new Error(`Failed to fetch options for ${fieldKey}`);
      const data = await response.json();
      
      const transformedOptions = data.map((item: any) => ({
        label: item.name || item.filename || item.label || item.id,
        value: item.id || item.value
      }));
      
      setOptions(prev => ({ ...prev, [fieldKey]: transformedOptions }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (tool.user_config_schema) {
      Object.entries(tool.user_config_schema.fields).forEach(([key, field]) => {
        if (field.required && !config[key]) {
          newErrors[key] = 'This field is required';
        }
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(config);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-brand-card w-full max-w-xl border border-brand-border rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 slide-in-from-bottom-2 duration-300"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-brand-border flex items-center justify-between bg-brand-bg/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Settings2 className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-brand-text">Configure Tool</h3>
              <p className="text-xs text-brand-muted truncate max-w-[300px]">{tool.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-brand-bg rounded-xl transition-colors text-brand-muted hover:text-brand-text"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {tool.user_config_schema && Object.entries(tool.user_config_schema.fields).map(([key, field]) => (
            <div key={key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-brand-muted uppercase tracking-wider flex items-center gap-1.5">
                  {field.label}
                  {field.required && <span className="text-red-500 text-sm">*</span>}
                </label>
              </div>

              {field.type === 'select' ? (
                <div className="relative">
                  <CustomSelect
                    options={options[key] || field.options || []}
                    value={config[key] || ''}
                    onChange={(val) => setConfig(prev => ({ ...prev, [key]: val }))}
                    placeholder={field.placeholder}
                    className={errors[key] ? 'border-red-500 focus:ring-red-500' : ''}
                  />
                  {loading && !options[key] && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-brand-muted animate-spin" />
                    </div>
                  )}
                </div>
              ) : field.type === 'boolean' ? (
                <div 
                  onClick={() => setConfig(prev => ({ ...prev, [key]: !prev[key] }))}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                    config[key] 
                      ? 'bg-indigo-500/10 border-indigo-500/40' 
                      : 'bg-brand-bg border-brand-border hover:border-brand-muted'
                  }`}
                >
                  <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${config[key] ? 'bg-indigo-500' : 'bg-brand-muted/30'}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 shadow-sm ${config[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-sm font-medium text-brand-text">{field.placeholder || field.label}</span>
                </div>
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={config[key] || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className={`w-full bg-brand-bg border rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium ${
                    errors[key] ? 'border-red-500 focus:ring-red-500' : 'border-brand-border'
                  }`}
                />
              )}

              {errors[key] && (
                <div className="flex items-center gap-1.5 text-red-500 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">{errors[key]}</span>
                </div>
              )}
              
              {field.description && (
                <p className="text-[11px] text-brand-muted leading-relaxed opacity-80">
                  {field.description}
                </p>
              )}
            </div>
          ))}
          
          <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0" />
            <p className="text-xs text-brand-muted-700 dark:text-brand-muted leading-relaxed">
              These parameters will be fixed during agent execution. Other parameters will be generated dynamically by the AI.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-brand-border bg-brand-bg/30 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-brand-muted hover:text-brand-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 group"
          >
            <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
