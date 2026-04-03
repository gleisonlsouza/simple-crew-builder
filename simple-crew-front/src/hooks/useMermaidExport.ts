import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import React from 'react';
import type { AppNode, AppEdge } from '../types/nodes.types';

export const generateMermaidString = (nodes: AppNode[], edges: AppEdge[], direction: 'LR' | 'TD' = 'LR'): string => {
  let mermaid = `flowchart ${direction}\n`;
  
  // 1. Define Nodes with specific shapes
  nodes.forEach((node: any) => {
    const data = node.data as any;
    const name = (data.name || node.type || node.id).replace(/"/g, "'");
    const id = node.id.replace(/-/g, '_');
    
    let shape = `["${name}"]`; // Default
    if (node.type === 'agent') shape = `[["${name}"]]`;
    if (node.type === 'task') shape = `("${name}")`;
    if (node.type === 'crew') shape = `{{ "${name}" }}`;
    if (node.type === 'chat') shape = `[/"${name}"/]`;
    if (node.type === 'webhook') shape = `{{ "${name}" }}`;
    
    mermaid += `    ${id}${shape}\n`;
  });

  mermaid += '\n';

  // 2. Define Edges
  edges.forEach(edge => {
    const sourceId = edge.source.replace(/-/g, '_');
    const targetId = edge.target.replace(/-/g, '_');
    mermaid += `    ${sourceId} --> ${targetId}\n`;
  });

  return mermaid;
};

export const useMermaidExport = () => {
  const exportSvgToCanvas = async (svgElement: SVGSVGElement, bgColor: string = '#ffffff'): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Não foi possível obter o contexto 2D');

        // Lógica: Usar a viewBox para garantir tamanho gigante/real na exportação
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

  return { downloadPNG, downloadPDF, generateMermaidString };
};
