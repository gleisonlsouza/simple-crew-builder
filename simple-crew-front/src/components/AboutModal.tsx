import React from 'react';
import {
  X,
  Github,
  Linkedin,
  Heart,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import logo from '../assets/logo.PNG';
import { PatchNotesModal } from './PatchNotesModal';


interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [isPatchNotesOpen, setIsPatchNotesOpen] = React.useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop with heavy blur */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-500"
        onClick={onClose}
      />

      {/* Modal Card with premium styling */}
      <div className="bg-brand-card w-full max-w-lg rounded-[2.5rem] border border-brand-border shadow-[0_0_50px_rgba(79,70,229,0.1)] relative z-10 animate-in fade-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Decorative Top Gradient */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />

        <div className="relative flex-1 overflow-y-auto custom-scrollbar p-10 pt-16 min-h-0">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-8 right-8 p-2 hover:bg-brand-bg rounded-2xl text-brand-muted hover:text-brand-text transition-all active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-24 h-24 bg-brand-bg/50 rounded-[2.5rem] flex items-center justify-center shadow-xl shadow-indigo-500/10 mb-6 group transition-transform hover:scale-105 duration-300 border border-brand-border overflow-hidden p-4">
              <img src={logo} alt="Simple Crew Builder Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-3xl font-black text-brand-text tracking-tight mb-2">
              Simple Crew <span className="text-indigo-600">Builder</span>
            </h2>
            <div className="flex items-center gap-2 group/version">
              <button
                data-testid="badge-version-about"
                onClick={() => setIsPatchNotesOpen(true)}
                title="Click to see what's new"
                className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-500/20 cursor-pointer hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
              >
                Beta v0.0.5
                <Sparkles className="w-3 h-3 transition-transform group-hover/version:rotate-12" />
              </button>
            </div>
          </div>

          {/* Description & Quote */}
          <div className="space-y-6 mb-10">
            <p className="text-brand-text text-lg font-medium leading-relaxed italic text-center px-4">
              "Create multi-agents easily and intuitively. Let your imagination run wild."
            </p>

            <div className="relative p-6 bg-brand-bg/50 rounded-3xl border border-brand-border border-dashed">
              <Sparkles className="absolute -top-3 -left-3 w-6 h-6 text-brand-accent opacity-50" />
              <p className="text-brand-muted text-sm italic text-center leading-relaxed">
                "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle."
                <span className="block mt-2 font-bold text-brand-text not-italic opacity-60 text-[10px] uppercase tracking-tighter">— Steve Jobs</span>
              </p>
            </div>
          </div>

          {/* Author & Contribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            <div className="p-6 bg-brand-bg rounded-3xl border border-brand-border group hover:border-indigo-500/30 transition-all">
              <h4 className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-3">Architect & Creator</h4>
              <p className="text-brand-text font-bold text-lg mb-4">Gleison Souza</p>
              <div className="flex gap-3">
                <a
                  href="https://www.linkedin.com/in/gleisonlsouza/"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 bg-brand-card border border-brand-border rounded-xl text-brand-muted hover:text-indigo-600 hover:border-indigo-500/30 transition-all"
                  title="LinkedIn Profile"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
                <a
                  href="https://github.com/gleisonlsouza/simple-crew-builder"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 bg-brand-card border border-brand-border rounded-xl text-brand-muted hover:text-brand-text hover:border-brand-text/30 transition-all"
                  title="GitHub Repository"
                >
                  <Github className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div className="p-6 bg-indigo-600 rounded-3xl shadow-lg shadow-indigo-600/20 flex flex-col justify-center items-center text-center group cursor-pointer active:scale-[0.98] transition-all">
              <Heart className="w-6 h-6 text-white mb-3 animate-pulse" />
              <h4 className="text-white font-bold mb-1">Contribute</h4>
              <p className="text-indigo-100 text-[10px] leading-tight px-2">
                Join our journey and help shape the future of AI workflows.
              </p>
              <a
                href="https://github.com/gleisonlsouza/simple-crew-builder"
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center gap-1.5 text-[10px] font-black uppercase bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all"
              >
                Go to Repo <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex items-center justify-center gap-2 text-brand-muted text-[10px] font-bold uppercase tracking-widest opacity-40">
            <span>Built with Love</span>
            <div className="w-1 h-1 rounded-full bg-brand-muted" />
            <span>2026</span>
          </div>
        </div>
      </div>

      <PatchNotesModal
        isOpen={isPatchNotesOpen}
        onClose={() => setIsPatchNotesOpen(false)}
      />
    </div>
  );
};
