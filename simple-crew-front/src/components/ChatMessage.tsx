import React, { useMemo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Copy, Check } from 'lucide-react';
import Prism from 'prismjs';
import toast from 'react-hot-toast';
import { MermaidRenderer } from './MermaidRenderer';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const MarkdownCodeBlock = ({ children, className }: { children: string; className?: string }) => {
  const [copied, setCopied] = useState(false);
  const language = className ? className.replace('language-', '') : 'text';

  useEffect(() => {
    Prism.highlightAll();
  }, [children]);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-200 dark:border-brand-border bg-[#0d1117] group/code shadow-lg shadow-black/5 dark:shadow-black/20">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/50 dark:bg-slate-800/40 border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{language}</span>
        </div>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all active:scale-95 border border-white/5"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-[10px] font-bold">Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="relative">
        <pre className={`!bg-transparent !p-4 !m-0 !text-[11px] font-mono leading-relaxed overflow-x-auto custom-scrollbar language-${language}`}>
          <code className={`language-${language} text-slate-200`}>{children}</code>
        </pre>
      </div>
    </div>
  );
};

export const ChatMessage = React.memo(({ msg }: { msg: Message }) => {
  const markdownComponents = useMemo(() => ({
    p: ({ children }: any) => <p className="mb-3 last:mb-0 leading-relaxed text-[13px]">{children}</p>,
    strong: ({ children }: any) => <strong className="font-bold text-brand-text">{children}</strong>,
    em: ({ children }: any) => <em className="italic opacity-90">{children}</em>,
    code: ({ children, className }: any) => {
      const isBlock = className?.includes('language-') || (children && String(children).includes('\n'));
      if (isBlock) {
        if (className?.includes('language-mermaid')) {
          return <MermaidRenderer chart={children ? String(children).replace(/\n$/, '') : ''} />;
        }
        return <MarkdownCodeBlock className={className}>{String(children).replace(/\n$/, '')}</MarkdownCodeBlock>;
      }
      return (
        <code className="bg-brand-bg rounded px-1.5 py-0.5 text-[11px] font-mono border border-brand-border text-brand-accent">
          {children}
        </code>
      );
    },
    pre: ({ children }: any) => <>{children}</>,
    ul: ({ children }: any) => <ul className="list-disc list-outside mb-3 ml-4 space-y-1.5 text-[13px]">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal list-outside mb-3 ml-4 space-y-1.5 text-[13px]">{children}</ol>,
    li: ({ children }: any) => <li className="pl-1 marker:text-brand-accent">{children}</li>,
    h1: ({ children }: any) => <h1 className="text-lg font-black mb-3 mt-4 text-brand-text transition-colors">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-base font-black mb-2 mt-3 text-brand-text/90 italic">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-sm font-bold mb-2 mt-2 text-brand-text/80">{children}</h3>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-brand-accent/30 bg-brand-accent/5 pl-4 py-2 my-4 italic rounded-r-lg text-brand-muted">
        {children}
      </blockquote>
    ),
    a: ({ href, children }: any) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-brand-accent underline decoration-brand-accent/30 underline-offset-4 hover:text-brand-accent/80 transition-all font-medium"
      >
        {children}
      </a>
    ),
    hr: () => <hr className="border-brand-border my-6" />,
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-4 rounded-xl border border-brand-border shadow-inner bg-brand-bg/50">
        <table className="w-full text-left text-xs border-collapse">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => <thead className="bg-brand-bg text-brand-muted font-bold">{children}</thead>,
    th: ({ children }: any) => <th className="px-4 py-2 border-b border-brand-border">{children}</th>,
    td: ({ children }: any) => <td className="px-4 py-2 border-b border-brand-border text-brand-text/80">{children}</td>,
  }), []);

  return (
    <div 
      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
      data-testid={`chat-message-${msg.role}`}
    >
      {msg.role === 'assistant' && (
        <div className="w-8 h-8 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-brand-muted">AI</span>
        </div>
      )}
      
      <div 
        className={`px-4 py-2 max-w-[80%] rounded-2xl border ${
          msg.role === 'user' 
            ? 'bg-brand-accent/10 rounded-tr-none border-brand-accent/30 text-brand-text shadow-sm' 
            : 'bg-brand-card rounded-tl-none border-brand-border text-brand-text'
        }`}
      >
        <div className="text-sm break-words chat-markdown">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
});
