import { useEffect, useState, useId } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid with SVG-only labels for better export compatibility
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'sans-serif',
  flowchart: { htmlLabels: false },
  suppressErrorRendering: true,
});

export const useMermaidRender = (chart: string) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const rawId = useId();
  const containerId = `mermaid-${rawId.replace(/:/g, '')}`;

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

  return { svg, error, containerId };
};
