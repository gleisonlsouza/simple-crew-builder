import React, { useEffect, useRef, useState } from 'react';
import { X, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../store';
import type { Execution } from '../types';

const STATUS_COLORS: Record<Execution['status'], string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  running: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function formatDuration(startedAt?: string, finishedAt?: string): string | null {
  if (!startedAt || !finishedAt) return null;
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function CollapsibleSection({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] text-brand-muted hover:text-brand-text transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {label}
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}

function ExecutionRow({ execution }: { execution: Execution }) {
  const formattedDate = execution.created_at
    ? new Date(execution.created_at).toLocaleString()
    : '—';

  const duration = formatDuration(execution.started_at, execution.finished_at);
  const hasRawPayload = execution.raw_payload && Object.keys(execution.raw_payload).length > 0;
  const hasFieldMappings = execution.field_mappings_used && Object.keys(execution.field_mappings_used).length > 0;
  const hasMappedInputs = Object.keys(execution.inputs_received || {}).length > 0;

  return (
    <div className="border border-brand-border rounded-xl p-3 flex flex-col gap-2 bg-brand-bg/50">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[execution.status]}`}>
            {execution.status.toUpperCase()}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
            execution.trigger_type === 'webhook'
              ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
              : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
          }`}>
            {execution.trigger_type === 'webhook' ? 'webhook' : 'manual'}
          </span>
          {execution.trigger_type === 'webhook' && execution.wait_for_result !== undefined && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
              execution.wait_for_result
                ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }`}>
              {execution.wait_for_result ? 'sync' : 'async'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {duration && (
            <span className="text-[10px] text-brand-muted font-mono">{duration}</span>
          )}
          <span className="text-[10px] text-brand-muted">{formattedDate}</span>
        </div>
      </div>

      {/* Raw payload (body received) */}
      {hasRawPayload && (
        <CollapsibleSection label="Body received">
          <pre className="text-[10px] bg-brand-card border border-brand-border rounded p-2 overflow-x-auto font-mono text-brand-text">
            {JSON.stringify(execution.raw_payload, null, 2)}
          </pre>
        </CollapsibleSection>
      )}

      {/* Field mappings used */}
      {hasFieldMappings && (
        <CollapsibleSection label="Field mappings">
          <div className="flex flex-col gap-1">
            {Object.entries(execution.field_mappings_used!).map(([crewVar, payloadPath]) => (
              <div key={crewVar} className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-violet-400">{crewVar}</span>
                <span className="text-brand-muted">←</span>
                <span className="text-amber-400">{payloadPath}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Mapped inputs (resolved values) */}
      {hasMappedInputs && (
        <CollapsibleSection label="Mapped inputs">
          <pre className="text-[10px] bg-brand-card border border-brand-border rounded p-2 overflow-x-auto font-mono text-brand-text">
            {JSON.stringify(execution.inputs_received, null, 2)}
          </pre>
        </CollapsibleSection>
      )}

      {/* Result */}
      {execution.result && (
        <CollapsibleSection label="Result">
          <div className="text-xs bg-brand-card border border-brand-border rounded p-2 max-h-40 overflow-y-auto custom-scrollbar prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{execution.result}</ReactMarkdown>
          </div>
        </CollapsibleSection>
      )}

      {/* Error */}
      {execution.error && (
        <pre className="text-[10px] text-red-400 bg-red-500/5 border border-red-500/20 rounded p-2 overflow-x-auto font-mono whitespace-pre-wrap">
          {execution.error}
        </pre>
      )}
    </div>
  );
}

type StatusFilter = 'all' | 'success' | 'error';

export function ExecutionsPanel({ fullPage = false }: { fullPage?: boolean }) {
  const { isExecutionsPanelVisible, setIsExecutionsPanelVisible, currentProjectId, executions, fetchExecutions } =
    useStore(
      useShallow((state) => ({
        isExecutionsPanelVisible: state.isExecutionsPanelVisible,
        setIsExecutionsPanelVisible: state.setIsExecutionsPanelVisible,
        currentProjectId: state.currentProjectId,
        executions: state.executions,
        fetchExecutions: state.fetchExecutions,
      }))
    );

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = () => {
    if (currentProjectId) {
      fetchExecutions(currentProjectId);
    }
  };

  const isVisible = fullPage || isExecutionsPanelVisible;

  useEffect(() => {
    if (!isVisible) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, currentProjectId]);

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (!isVisible) return;

    const hasPending = executions.some(
      (e) => e.status === 'pending' || e.status === 'running'
    );
    if (hasPending) {
      pollingRef.current = setInterval(refresh, 5000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, executions]);

  if (!isVisible) return null;

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border bg-brand-bg/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500/10 p-2 rounded-lg">
            <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 16.016c.93-.01 1.81.36 2.45 1.01.64.65.99 1.53.95 2.44-.04.91-.47 1.77-1.17 2.35-.7.58-1.61.85-2.51.74-.9-.11-1.72-.58-2.26-1.3L9 14.5l-1.4 2.5c.2.43.3.9.3 1.37 0 1.7-1.3 3.13-3 3.13S2 20.07 2 18.37c0-1.7 1.3-3.13 3-3.13.53 0 1.02.14 1.45.38L8 13"/>
              <path d="M8 7.984c-.93.01-1.81-.36-2.45-1.01-.64-.65-.99-1.53-.95-2.44.04-.91.47-1.77 1.17-2.35.7-.58 1.61-.85 2.51-.74.9.11 1.72.58 2.26 1.3L15 9.5l1.4-2.5c-.2-.43-.3-.9-.3-1.37 0-1.7 1.3-3.13 3-3.13S22 3.93 22 5.63c0 1.7-1.3 3.13-3 3.13-.53 0-1.02-.14-1.45-.38L16 11"/>
            </svg>
          </div>
          <h2 className="text-sm font-bold text-brand-text">Executions</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-brand-border overflow-hidden text-[11px] font-medium">
            {(['all', 'success', 'error'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-2.5 py-1 transition-colors capitalize ${
                  statusFilter === f
                    ? f === 'success'
                      ? 'bg-green-500/20 text-green-400'
                      : f === 'error'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-orange-500/20 text-orange-400'
                    : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'success' ? 'Sucesso' : 'Erro'}
              </button>
            ))}
          </div>
          <button
            onClick={refresh}
            className="p-1.5 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {!fullPage && (
            <button
              onClick={() => setIsExecutionsPanelVisible(false)}
              className="p-1.5 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-3">
        {(() => {
          const filtered = statusFilter === 'all'
            ? executions
            : executions.filter((e) => e.status === statusFilter);

          if (executions.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-60">
                <p className="text-sm text-brand-muted">No executions yet.</p>
                <p className="text-xs text-brand-muted">
                  Run your crew from the canvas or trigger it via webhook.
                </p>
              </div>
            );
          }

          if (filtered.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-60">
                <p className="text-sm text-brand-muted">Nenhuma execução com esse status.</p>
              </div>
            );
          }

          return filtered.map((exec) => (
            <ExecutionRow key={exec.id} execution={exec} />
          ));
        })()}
      </div>
    </>
  );

  if (fullPage) {
    return (
      <div className="flex-1 h-full flex flex-col bg-brand-card">
        {content}
      </div>
    );
  }

  return (
    <div className="absolute inset-y-0 right-0 w-[420px] z-40 bg-brand-card/95 backdrop-blur-md border-l border-brand-border shadow-2xl flex flex-col transition-all duration-300">
      {content}
    </div>
  );
}
