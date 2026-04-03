import React, { useRef, useState } from 'react';
import { Maximize2, AlertCircle } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useMermaidRender } from '../hooks/useMermaidRender';
import { useMermaidExport } from '../hooks/useMermaidExport';
import { ExportButtons } from './mermaid/ExportButtons';
import { ZoomControls } from './mermaid/ZoomControls';

interface MermaidRendererProps {
  chart: string;
}

export const MermaidRenderer = React.memo(({ chart }: MermaidRendererProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const diagramRef = useRef<HTMLDivElement>(null);
  const modalDiagramRef = useRef<HTMLDivElement>(null);

  const { svg, error } = useMermaidRender(chart);
  const { downloadPNG, downloadPDF } = useMermaidExport();

  return (
    <div className="my-6 group/mermaid relative">
      {error ? (
        <div className="bg-[#0d1117] rounded-xl border border-red-500/30 p-6 overflow-hidden flex flex-col gap-4 min-h-[100px] shadow-lg">
          <div className="flex items-center gap-2 text-red-400 font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">Erro na renderização do Mermaid</span>
          </div>
          <div className="text-[11px] text-red-400/80 font-mono bg-red-500/5 p-3 rounded-lg border border-red-500/10 overflow-x-auto whitespace-pre-wrap">
            {error}
          </div>
          <div className="mt-2">
            <p className="text-[10px] uppercase tracking-wider text-brand-muted mb-2 font-bold opacity-70">Código Original:</p>
            <pre className="text-xs text-brand-text bg-brand-bg/50 p-4 rounded-xl border border-brand-border overflow-x-auto custom-scrollbar font-mono leading-relaxed max-h-[200px]">
              {chart && chart !== 'undefined' ? chart : 'Código não disponível'}
            </pre>
          </div>
        </div>
      ) : (
        <div 
          ref={diagramRef}
          className="bg-[#0d1117] rounded-xl border border-brand-border p-6 overflow-hidden flex justify-center items-center min-h-[100px] shadow-lg [&_text]:!fill-white [&_.label]:!text-white [&_tspan]:!fill-white [&_div]:!text-white"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
      
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="absolute top-4 right-4 p-2 bg-brand-bg/80 backdrop-blur-md border border-brand-border rounded-lg text-brand-muted hover:text-brand-text opacity-0 group-hover/mermaid:opacity-100 transition-all hover:scale-105 active:scale-95 shadow-xl z-10 disabled:hidden"
        title="Full Screen"
        disabled={!!error}
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300"
            onClick={() => setIsModalOpen(false)}
          />
          
          <div className="bg-brand-card w-full max-w-6xl h-[85vh] rounded-[2.5rem] border border-brand-border shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-8 py-6 border-b border-brand-border shrink-0 bg-brand-card/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-accent/10 rounded-2xl flex items-center justify-center border border-brand-accent/20">
                  <Maximize2 className="w-5 h-5 text-brand-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-text">Diagram Preview</h3>
                  <p className="text-xs text-brand-muted">View and export your diagram</p>
                </div>
              </div>
              
              <ExportButtons 
                onDownloadPNG={downloadPNG}
                onDownloadPDF={downloadPDF}
                onClose={() => setIsModalOpen(false)}
                diagramRef={modalDiagramRef}
              />
            </div>

            <div className="flex-1 overflow-hidden bg-[#0d1117] relative">
              <TransformWrapper
                initialScale={1}
                minScale={0.05}
                maxScale={20}
                centerOnInit={true}
                limitToBounds={false}
                wheel={{ step: 0.1 }}
                panning={{ 
                  velocityDisabled: false,
                  allowLeftClickPan: true,
                  allowRightClickPan: true 
                }}
              >
                {({ zoomIn, zoomOut, resetTransform }: any) => (
                  <>
                    <TransformComponent
                      wrapperStyle={{ width: '100%', height: '100%' }}
                      contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <div 
                        ref={modalDiagramRef}
                        className="bg-transparent flex items-center justify-center p-8 [&>svg]:!max-w-none [&>svg]:!w-full [&>svg]:!h-full [&>svg]:min-w-[600px] [&_text]:!fill-white [&_.label]:!text-white [&_tspan]:!fill-white [&_div]:!text-white"
                        dangerouslySetInnerHTML={{ __html: svg }}
                      />
                    </TransformComponent>
                    
                    <ZoomControls 
                      onZoomIn={zoomIn}
                      onZoomOut={zoomOut}
                      onReset={resetTransform}
                    />
                  </>
                )}
              </TransformWrapper>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default MermaidRenderer;
