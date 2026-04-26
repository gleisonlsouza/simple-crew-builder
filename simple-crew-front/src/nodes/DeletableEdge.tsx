import { useState, useMemo, memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../store/index';
import type { NodeStatus } from '../types/store.types';

export const DeletableEdge = memo(({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const deleteEdge = useStore((state) => state.deleteEdge);
  const [hovered, setHovered] = useState(false);

  // Seletor granular para os status dos nós conectados
  const { sourceStatus, targetStatus } = useStore(
    useShallow((state) => ({
      sourceStatus: (state.nodeStatuses[source] as NodeStatus) || 'idle',
      targetStatus: (state.nodeStatuses[target] as NodeStatus) || 'idle',
    }))
  );

  // Lógica de estilização otimizada dentro do componente
  const edgeStyle = useMemo(() => {
    const isRunning = sourceStatus === 'running' || targetStatus === 'running';
    const isSuccess = sourceStatus === 'success' && targetStatus === 'success';

    let strokeColor = (style.stroke as string) || '#94a3b8';
    if (isRunning) strokeColor = '#3b82f6';
    else if (isSuccess) strokeColor = '#10b981';

    const isDimmed = data?.isDimmed;

    return {
      ...style,
      stroke: strokeColor,
      strokeWidth: isRunning ? 4 : (style.strokeWidth as number || 3),
      transition: 'stroke 0.5s ease, stroke-width 0.5s ease, opacity 0.5s ease, filter 0.5s ease',
      opacity: isDimmed ? 0.15 : 1,
      filter: isDimmed ? 'grayscale(1)' : 'none',
    };
  }, [sourceStatus, targetStatus, style, data?.isDimmed]);

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
      {/* Invisible wider path to make hovering easier and more stable */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="transition-all cursor-pointer"
        style={{ pointerEvents: 'stroke' }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {hovered && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                deleteEdge(id);
              }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-md p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-300 transition-[opacity,filter,color,background-color,border-color] cursor-pointer flex items-center justify-center pointer-events-auto translate-y-0 active:scale-90"
              title="Delete connection"
              aria-label="Excluir conexão"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
