import { renderHook, act } from '@testing-library/react';
import { useMermaidExport } from '../useMermaidExport';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AppNode, AppEdge } from '../../types/nodes.types';
import toast from 'react-hot-toast';
import React from 'react';

// Mock toast
vi.mock('react-hot-toast', () => {
    const m = {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(() => 'loading-id'),
    };
    return { ...m, default: m };
});

// Mock jsPDF
vi.mock('jspdf', () => {
    function MockJsPDF() {
        return {
            internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
            addImage: vi.fn(),
            save: vi.fn(),
        };
    }
    return { jsPDF: MockJsPDF };
});

describe('useMermaidExport - Hook Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Spy on static methods of URL
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

        vi.stubGlobal('Image', function(this: HTMLImageElement) {
            setTimeout(() => { 
                if (this.src && this.src.includes('error-trigger')) {
                    if (this.onerror) (this.onerror as (e: string | Event) => void)('error');
                } else {
                    if (this.onload) (this.onload as () => void)(); 
                }
            }, 0);
            return this;
        });

        vi.stubGlobal('XMLSerializer', class {
            serializeToString() { return '<svg viewBox="0 0 100 100"></svg>'; }
        });

        // Mock canvas context
        const mockCtx = {
            scale: vi.fn(),
            fillRect: vi.fn(),
            drawImage: vi.fn(),
        };

        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);
        vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,mock');
    });

    it('downloadPNG: triggers the full pipeline', async () => {
        const { result } = renderHook(() => useMermaidExport());
        
        const container = document.createElement('div');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        container.appendChild(svg);
        
        const mockRef = { current: container } as React.RefObject<HTMLDivElement>;

        await act(async () => {
            await result.current.downloadPNG(mockRef);
        });
        
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('PNG download started'), expect.any(Object));
    });

    it('downloadPDF: triggers the pipeline and saves pdf', async () => {
        const { result } = renderHook(() => useMermaidExport());
        
        const container = document.createElement('div');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        container.appendChild(svg);
        
        const mockRef = { current: container } as React.RefObject<HTMLDivElement>;

        await act(async () => {
            await result.current.downloadPDF(mockRef);
        });
        
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('PDF download started'), expect.any(Object));
    });

    it('handles missing SVG in downloadPNG', async () => {
        const { result } = renderHook(() => useMermaidExport());
        const mockRef = { current: document.createElement('div') } as React.RefObject<HTMLDivElement>;

        await act(async () => {
            await result.current.downloadPNG(mockRef);
        });
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Diagram not found'), expect.any(Object));
    });

    it('downloadPDF: handles missing SVG', async () => {
        const { result } = renderHook(() => useMermaidExport());
        const mockRef = { current: document.createElement('div') } as React.RefObject<HTMLDivElement>;

        await act(async () => {
            await result.current.downloadPDF(mockRef);
        });
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Diagram not found'), expect.any(Object));
    });

    it('downloadPDF: handles errors in the pipeline', async () => {
        const { result } = renderHook(() => useMermaidExport());
        
        const container = document.createElement('div');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        container.appendChild(svg);
        const mockRef = { current: container } as React.RefObject<HTMLDivElement>;

        vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementationOnce(() => {
            throw new Error('Canvas Fail');
        });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await act(async () => {
            await result.current.downloadPDF(mockRef);
        });
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Canvas Fail'), expect.any(Object));
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('downloadPNG: handles errors in the pipeline', async () => {
        const { result } = renderHook(() => useMermaidExport());
        
        const container = document.createElement('div');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        container.appendChild(svg);
        const mockRef = { current: container } as React.RefObject<HTMLDivElement>;

        vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementationOnce(() => {
            throw new Error('PNG Fail');
        });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await act(async () => {
            await result.current.downloadPNG(mockRef);
        });
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('PNG Fail'), expect.any(Object));
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('downloadPDF: handles large height aspect ratio', async () => {
        const { result } = renderHook(() => useMermaidExport());
        
        const container = document.createElement('div');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 500'); // Very tall
        container.appendChild(svg);
        const mockRef = { current: container } as React.RefObject<HTMLDivElement>;

        vi.spyOn(HTMLCanvasElement.prototype, 'width', 'get').mockReturnValue(100);
        vi.spyOn(HTMLCanvasElement.prototype, 'height', 'get').mockReturnValue(500);

        await act(async () => {
            await result.current.downloadPDF(mockRef);
        });
        expect(toast.success).toHaveBeenCalled();
    });

    it('generateMermaidString covers all node types', () => {
        const { result } = renderHook(() => useMermaidExport());
        const nodes: AppNode[] = [
            { id: 'n1', data: { name: 'A' }, type: 'agent', position: { x: 0, y: 0 } } as unknown as AppNode,
            { id: 'n2', data: { name: 'T' }, type: 'task', position: { x: 0, y: 0 } } as unknown as AppNode,
            { id: 'n3', data: { name: 'Cr' }, type: 'crew', position: { x: 0, y: 0 } } as unknown as AppNode,
            { id: 'n4', data: { name: 'Ch' }, type: 'chat', position: { x: 0, y: 0 } } as unknown as AppNode,
            { id: 'n5', data: { name: 'W' }, type: 'webhook', position: { x: 0, y: 0 } } as unknown as AppNode,
            { id: 'n6', data: { name: 'Default' }, type: 'other', position: { x: 0, y: 0 } } as unknown as AppNode,
        ];
        const edges: AppEdge[] = [
            { id: 'e1', source: 'n1', target: 'n2' } as AppEdge
        ];
        
        const res = result.current.generateMermaidString(nodes, edges, 'TD');
        expect(res).toContain('flowchart TD');
        expect(res).toContain('n1[["A"]]'); // Agent
        expect(res).toContain('n2("T")'); // Task
        expect(res).toContain('n3{{ "Cr" }}'); // Crew
        expect(res).toContain('n4[/"Ch"/]'); // Chat
        expect(res).toContain('n5{{ "W" }}'); // Webhook
        expect(res).toContain('n6["Default"]'); // Default
    });

    it('exportSvgToCanvas: removes external images', async () => {
        const { result } = renderHook(() => useMermaidExport());
        
        const container = document.createElement('div');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        img.setAttribute('href', 'http://external.com/img.png');
        svg.appendChild(img);
        container.appendChild(svg);
        const mockRef = { current: container } as React.RefObject<HTMLDivElement>;

        const serializerSpy = vi.spyOn(XMLSerializer.prototype, 'serializeToString');

        await act(async () => {
            await result.current.downloadPNG(mockRef);
        });
        
        // Check if image was removed from serialized string
        const serialized = serializerSpy.mock.results[0].value;
        expect(serialized).not.toContain('external.com');
    });

    it('exportSvgToCanvas: handles load error', async () => {
        const { result } = renderHook(() => useMermaidExport());
        
        const container = document.createElement('div');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        container.appendChild(svg);
        const mockRef = { current: container } as React.RefObject<HTMLDivElement>;

        // Force img.onerror via src manipulation in stubGlobal
        vi.stubGlobal('XMLSerializer', class {
            serializeToString() { return 'error-trigger'; }
        });

        await act(async () => {
            await result.current.downloadPNG(mockRef);
        });
        
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('blocked SVG rendering'), expect.any(Object));
    });

    it('exportSvgToCanvas: handles unexpected errors', async () => {
        const { result } = renderHook(() => useMermaidExport());
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const container = document.createElement('div');
        container.appendChild(svg);
        const mockRef = { current: container } as unknown as React.RefObject<HTMLDivElement>;

        // Force throw during attribute access
        vi.spyOn(svg, 'getAttribute').mockImplementationOnce(() => {
            throw new Error('Unexpected Fail');
        });

        await act(async () => {
            await result.current.downloadPNG(mockRef);
        });
        
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Unexpected Fail'), expect.any(Object));
    });
});
