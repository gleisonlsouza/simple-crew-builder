import { renderHook, act } from '@testing-library/react';
import { useMermaidExport } from '../useMermaidExport';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import toast from 'react-hot-toast';

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

        // Spy on static methods of URL without breaking the constructor
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

        vi.stubGlobal('Image', function(this: any) {
            const self = this;
            setTimeout(() => { if (self.onload) self.onload(); }, 0);
            return self;
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

        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx as any);
        vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,mock');
    });

    it('downloadPNG: triggers the full pipeline', async () => {
        const { result } = renderHook(() => useMermaidExport());
        
        // Use real happy-dom elements
        const container = document.createElement('div');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        container.appendChild(svg);
        
        const mockRef = { current: container } as any;

        await act(async () => {
            await result.current.downloadPNG(mockRef);
        });
        
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('PNG iniciado'), expect.any(Object));
    });

    it('downloadPDF: triggers the pipeline and saves pdf', async () => {
        const { result } = renderHook(() => useMermaidExport());
        
        const container = document.createElement('div');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        container.appendChild(svg);
        
        const mockRef = { current: container } as any;

        await act(async () => {
            await result.current.downloadPDF(mockRef);
        });
        
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('PDF iniciado'), expect.any(Object));
    });

    it('handles missing SVG in downloadPNG', async () => {
        const { result } = renderHook(() => useMermaidExport());
        const mockRef = { current: document.createElement('div') } as any;

        await act(async () => {
            await result.current.downloadPNG(mockRef);
        });
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Diagrama não encontrado'), expect.any(Object));
    });

    it('downloadPDF: handles missing SVG', async () => {
        const { result } = renderHook(() => useMermaidExport());
        const mockRef = { current: document.createElement('div') } as any;

        await act(async () => {
            await result.current.downloadPDF(mockRef);
        });
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Diagrama não encontrado'), expect.any(Object));
    });

    it('downloadPDF: handles errors in the pipeline', async () => {
        const { result } = renderHook(() => useMermaidExport());
        
        const container = document.createElement('div');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        container.appendChild(svg);
        const mockRef = { current: container } as any;

        // Force an error in toDataURL or similar
        vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementationOnce(() => {
            throw new Error('Canvas Fail');
        });

        await act(async () => {
            await result.current.downloadPDF(mockRef);
        });
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Canvas Fail'), expect.any(Object));
    });

    it('downloadPDF: handles large height aspect ratio', async () => {
        const { result } = renderHook(() => useMermaidExport());
        
        const container = document.createElement('div');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 500'); // Very tall
        container.appendChild(svg);
        const mockRef = { current: container } as any;

        // Mock canvas dimensions to trigger finalHeight > pdfHeight logic
        vi.spyOn(HTMLCanvasElement.prototype, 'width', 'get').mockReturnValue(100);
        vi.spyOn(HTMLCanvasElement.prototype, 'height', 'get').mockReturnValue(500);

        await act(async () => {
            await result.current.downloadPDF(mockRef);
        });
        expect(toast.success).toHaveBeenCalled();
    });

    it('generateMermaidString: LR layout and disconnected nodes', () => {
        const { result } = renderHook(() => useMermaidExport());
        const nodes: any[] = [
            { id: 'n1', data: { name: 'Node 1' }, type: 'agent' },
            { id: 'n2', data: { name: 'Disconnected' }, type: 'task' }
        ];
        const edges: any[] = [{ id: 'e1', source: 'n1', target: 'n2' }];
        
        const lr = result.current.generateMermaidString(nodes, edges, 'LR');
        expect(lr).toContain('flowchart LR');
        expect(lr).toContain('Node 1');
        expect(lr).toContain('Disconnected');
    });
});
