import React, { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';
import { Maximize2, X, FileImage, FileText, AlertCircle, Plus, Minus, RefreshCw } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { jsPDF } from 'jspdf';

import toast from 'react-hot-toast';

// Initialize mermaid with SVG-only labels for better export compatibility
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'sans-serif',
  flowchart: { htmlLabels: false },
  suppressErrorRendering: true,
});

interface MermaidRendererProps {
  chart: string;
}

export const MermaidRenderer = React.memo(({ chart }: MermaidRendererProps) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const rawId = useId();
  const containerId = `mermaid-${rawId.replace(/:/g, '')}`;
  const diagramRef = useRef<HTMLDivElement>(null);
  const modalDiagramRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) return;
      try {
        setError(null);
        const { svg: renderedSvg } = await mermaid.render(containerId, chart);
        setSvg(renderedSvg);
      } catch (err: any) {
        console.error('Mermaid rendering failed:', err);
        setError(err.message || String(err));
      }
    };

    renderChart();
  }, [chart, containerId]);

  const exportSvgToCanvas = async (svgElement: SVGSVGElement, bgColor: string = '#ffffff'): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Não foi possível obter o contexto 2D');

        // Lógica NOVA: Usar a viewBox para garantir tamanho gigante/real na exportação
        let width = 800;
        let height = 600;
        const viewBox = svgElement.getAttribute('viewBox');
        
        if (viewBox) {
          const [, , vw, vh] = viewBox.split(' ').map(Number);
          width = vw || 800;
          height = vh || 600;
        } else {
          const bbox = svgElement.getBoundingClientRect();
          width = Math.max(bbox.width, 800); 
          height = Math.max(bbox.height, 600);
        }
        
        const scale = window.devicePixelRatio || 2;
        const padding = 60;
        
        canvas.width = (width + padding) * scale;
        canvas.height = (height + padding) * scale;
        
        ctx.scale(scale, scale);
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width + padding, height + padding);

        const clone = svgElement.cloneNode(true) as SVGSVGElement;
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        
        // 1. Remove imagens externas que causam Taint instantâneo
        const images = clone.querySelectorAll('image');
        images.forEach(img => {
          const href = img.getAttribute('href') || img.getAttribute('xlink:href');
          if (href && href.startsWith('http')) {
            img.remove();
          }
        });

        // 2. Injeta estilos de contraste para exportação (Desenhos Brancos, Fontes Pretas)
        const style = document.createElement('style');
        style.textContent = `
          * { color: #000000 !important; }
          text, tspan, p, div, span, .label, .edgeLabel, .nodeLabel { fill: #000000 !important; color: #000000 !important; }
          .node rect, .node circle, .node polygon, .node path, .cluster rect, .actor, .labelBox { stroke: #000000 !important; fill: #ffffff !important; }
          
          /* Linhas e Conexões (Pretas para fundo branco de exportação) */
          .edgePath .path, .flowchart-link, .messageLine0, .messageLine1 { stroke: #000000 !important; fill: none !important; stroke-width: 2px !important; }
          
          /* Setas e Marcadores */
          .marker, .arrowheadPath, #arrowhead { fill: #000000 !important; stroke: none !important; }
        `;
        clone.appendChild(style);

        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(clone);

        // 3. O GRANDE TRUQUE (Anti-Taint): Remover imports de fontes e URLs externas do CSS do Mermaid
        svgString = svgString.replace(/@import\s+url\([^)]+\);?/gi, '');
        svgString = svgString.replace(/url\(['"]?http[^'"()]+['"]?\)/gi, 'none');

        // Data URI seguro
        const svgDataUri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);

        const img = new Image();
        // Sem crossOrigin, pois o conteúdo já está 100% purificado e em base local
        
        img.onload = () => {
          ctx.drawImage(img, padding / 2, padding / 2, width, height);
          resolve(canvas);
        };
        
        img.onerror = (err) => {
          console.error('Erro ao carregar imagem purificada:', err);
          reject(new Error('Navegador bloqueou a renderização do SVG.'));
        };
        
        img.src = svgDataUri;
      } catch (error) {
        console.error('Erro no exportSvgToCanvas:', error);
        reject(error);
      }
    });
  };

  const downloadPNG = async (ref: React.RefObject<HTMLDivElement | null>) => {
    const loadingToast = toast.loading('Gerando imagem PNG...');
    try {
      const svgEl = ref.current?.querySelector('svg');
      if (!svgEl) {
        toast.error('Diagrama não encontrado.', { id: loadingToast });
        return;
      }
      
      const canvas = await exportSvgToCanvas(svgEl as SVGSVGElement);
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      
      const link = document.createElement('a');
      link.download = `mermaid-diagram-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download do PNG iniciado!', { id: loadingToast });
    } catch (err: any) {
      console.error('Failed to export PNG:', err);
      toast.error(`Falha ao exportar PNG: ${err.message || 'Erro desconhecido'}`, { id: loadingToast });
    }
  };

  const downloadPDF = async (ref: React.RefObject<HTMLDivElement | null>) => {
    const loadingToast = toast.loading('Gerando documento PDF...');
    try {
      const svgEl = ref.current?.querySelector('svg');
      if (!svgEl) {
        toast.error('Diagrama não encontrado.', { id: loadingToast });
        return;
      }
      
      const canvas = await exportSvgToCanvas(svgEl as SVGSVGElement);
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const aspect = imgWidth / imgHeight;

      const orientation = imgWidth > imgHeight ? 'l' : 'p';
      const pdf = new jsPDF(orientation, 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      
      let finalWidth = pdfWidth - (margin * 2);
      let finalHeight = finalWidth / aspect;
      
      if (finalHeight > pdfHeight - (margin * 2)) {
        finalHeight = pdfHeight - (margin * 2);
        finalWidth = finalHeight * aspect;
      }

      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;
      
      pdf.addImage(dataUrl, 'PNG', x, y, finalWidth, finalHeight, undefined, 'FAST');
      pdf.save(`mermaid-diagram-${Date.now()}.pdf`);
      
      toast.success('Download do PDF iniciado!', { id: loadingToast });
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      toast.error(`Falha ao exportar PDF: ${err.message || 'Erro desconhecido'}`, { id: loadingToast });
    }
  };

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
          // Tema Híbrido: Preview usa Texto Branco (Premium Dark Mode)
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
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => downloadPNG(modalDiagramRef)}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-xs font-bold text-brand-text hover:bg-brand-border transition-all active:scale-95 uppercase tracking-wider"
                >
                  <FileImage className="w-4 h-4" />
                  PNG
                </button>
                <button
                  type="button"
                  onClick={() => downloadPDF(modalDiagramRef)}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-brand-accent/20 uppercase tracking-wider"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
                <div className="w-px h-6 bg-brand-border mx-2" />
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-brand-bg rounded-xl text-brand-muted hover:text-brand-text transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
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
                        // Força o SVG interno a usar seu próprio tamanho (viewBox) e ignora restrições do Mermaid
                        // Tema Híbrido: Preview usa Texto Branco para visibilidade no fundo Dark
                        className="bg-transparent flex items-center justify-center p-8 [&>svg]:!max-w-none [&>svg]:!w-full [&>svg]:!h-full [&>svg]:min-w-[600px] [&_text]:!fill-white [&_.label]:!text-white [&_tspan]:!fill-white [&_div]:!text-white"
                        dangerouslySetInnerHTML={{ __html: svg }}
                      />
                    </TransformComponent>
                    
                    {/* Controls Layer */}
                    <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-20">
                      <button 
                        type="button"
                        onClick={() => zoomIn()}
                        className="p-3 bg-brand-bg/80 backdrop-blur-md border border-brand-border rounded-xl text-brand-muted hover:text-brand-text transition-all shadow-xl hover:scale-110 active:scale-90"
                        title="Zoom In"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => zoomOut()}
                        className="p-3 bg-brand-bg/80 backdrop-blur-md border border-brand-border rounded-xl text-brand-muted hover:text-brand-text transition-all shadow-xl hover:scale-110 active:scale-90"
                        title="Zoom Out"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => resetTransform()}
                        className="p-3 bg-brand-bg/80 backdrop-blur-md border border-brand-border rounded-xl text-brand-muted hover:text-brand-text transition-all shadow-xl hover:scale-110 active:scale-90"
                        title="Reset View"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    </div>
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
