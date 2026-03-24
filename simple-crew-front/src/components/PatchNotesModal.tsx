import React from 'react';
import { X, Sparkles, RefreshCw, AlertCircle, ExternalLink, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useFetchLatestRelease } from '../hooks/useFetchLatestRelease';

interface PatchNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PatchNotesModal: React.FC<PatchNotesModalProps> = ({ isOpen, onClose }) => {
  const { release, loading, error, refetch } = useFetchLatestRelease();

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div 
        data-testid="modal-patch-notes"
        className="bg-brand-card w-full max-w-2xl rounded-[2.5rem] border border-brand-border shadow-[0_0_50px_rgba(79,70,229,0.15)] relative z-10 animate-in fade-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Decorative Top Gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none sticky top-0 z-20" />

        <div className="relative flex flex-col min-h-0 h-full">
          {/* Header */}
          <div className="p-8 pb-4 flex items-start justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                <Sparkles className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-brand-text tracking-tight">What's New</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-brand-muted text-[10px] font-bold uppercase tracking-widest opacity-60">Simple Crew Builder</span>
                  {release && (
                    <span className="bg-indigo-500/10 text-indigo-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                      {release.tag_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-brand-bg rounded-xl text-brand-muted hover:text-brand-text transition-all active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-8 pb-10 custom-scrollbar relative z-10 min-h-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin opacity-50" />
                <p className="text-brand-muted text-sm font-medium animate-pulse">Fetching latest updates...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-brand-text font-bold text-lg">Failed to load releases</h3>
                  <p className="text-brand-muted text-sm max-w-xs">{error}</p>
                </div>
                <button
                  onClick={refetch}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  Try Again
                </button>
              </div>
            ) : release ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between py-4 border-b border-brand-border/50">
                  <div className="flex items-center gap-2 text-brand-muted">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest opacity-60">
                      {formatDate(release.published_at)}
                    </span>
                  </div>
                  <a 
                    href={release.html_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-indigo-500 hover:text-indigo-400 text-[10px] font-black uppercase transition-colors"
                  >
                    View on GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="prose prose-invert prose-indigo max-w-none">
                  <style dangerouslySetInnerHTML={{ __html: `
                    .patch-notes-content h1, .patch-notes-content h2, .patch-notes-content h3 { color: var(--brand-text); font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem; margin-top: 2rem; }
                    .patch-notes-content p { color: var(--brand-muted); line-height: 1.8; margin-bottom: 1.5rem; font-size: 0.95rem; }
                    .patch-notes-content ul { list-style-type: none; padding-left: 0.5rem; }
                    .patch-notes-content li { position: relative; padding-left: 1.5rem; color: var(--brand-muted); margin-bottom: 0.75rem; }
                    .patch-notes-content li::before { content: "→"; position: absolute; left: 0; color: #6366f1; font-weight: bold; opacity: 0.7; }
                    .patch-notes-content code { background: rgba(99, 102, 241, 0.1); color: #818cf8; padding: 0.2rem 0.4rem; rounded: 0.4rem; font-size: 0.85rem; font-family: monospace; border: 1px solid rgba(99, 102, 241, 0.1); }
                    .patch-notes-content blockquote { border-left: 4px solid #6366f1; padding: 1rem 1.5rem; background: rgba(99, 102, 241, 0.03); border-radius: 0 1rem 1rem 0; font-style: italic; color: var(--brand-text); opacity: 0.8; }
                  `}} />
                  <div className="patch-notes-content">
                    <ReactMarkdown>{release.body}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer with Glow Effect */}
          <div className="p-8 pt-4 flex justify-end bg-brand-bg/30 relative z-10 border-t border-brand-border/50">
             <button
              onClick={onClose}
              className="px-8 py-3 bg-brand-bg hover:bg-indigo-600/10 border border-brand-border hover:border-indigo-500/30 text-brand-text rounded-2xl text-sm font-bold transition-all active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
