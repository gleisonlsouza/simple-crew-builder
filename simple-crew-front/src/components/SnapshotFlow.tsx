import React, { useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  BackgroundVariant 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Import our custom nodes and edges to match the Builder visual style
import { AgentNode } from '../nodes/AgentNode';
import { TaskNode } from '../nodes/TaskNode';
import { CrewNode } from '../nodes/CrewNode';
import { ChatNode } from '../nodes/ChatNode';
import { WebhookNode } from '../nodes/WebhookNode';
import { DeletableEdge } from '../nodes/DeletableEdge';
import { useStore } from '../store';
import { CheckCircle2, XCircle } from 'lucide-react';

const withSnapshotBadge = (WrappedComponent: React.ComponentType<any>) => {
  return function BadgeWrapper(props: any) {
    const status = props.data?.executionStatus;
    
    // To ensure the badge is positioned relative to the node bounds, we use a fragment
    // since React Flow's wrapper (.react-flow__node) is already positioned.
    return (
      <>
        <WrappedComponent {...props} />
        {status === 'success' && (
          <div className="absolute -top-3 -right-3 z-50 bg-brand-bg rounded-full p-0.5 shadow-md">
            <CheckCircle2 className="w-6 h-6 text-[#22c55e] animate-pulse fill-[#22c55e]/10" />
          </div>
        )}
        {status === 'error' && (
          <div className="absolute -top-3 -right-3 z-50 bg-brand-bg rounded-full p-0.5 shadow-md">
            <XCircle className="w-6 h-6 text-[#ef4444] animate-pulse fill-[#ef4444]/10" />
          </div>
        )}
      </>
    );
  };
};

const nodeTypes = {
  agent: withSnapshotBadge(AgentNode),
  task: withSnapshotBadge(TaskNode),
  crew: withSnapshotBadge(CrewNode),
  chat: withSnapshotBadge(ChatNode),
  webhook: withSnapshotBadge(WebhookNode),
};

const edgeTypes = {
  deletable: DeletableEdge,
};

interface SnapshotFlowProps {
  nodes: any[];
  edges: any[];
  executionStatus?: string;
  nodeStatuses?: Record<string, string>;
}

export const SnapshotFlow: React.FC<SnapshotFlowProps> = ({ nodes = [], edges = [], executionStatus, nodeStatuses }) => {
  const theme = useStore((state) => state.theme);

  // We memoize the nodes and edges so ReactFlow doesn't constantly re-render
  // unless the actual snapshot data changes.
  const snapshotNodes = useMemo(() => {
    return nodes.map((node) => {
      let nodeState = executionStatus; // fallback

      if (nodeStatuses) {
        if (nodeStatuses[node.id]) {
          nodeState = nodeStatuses[node.id];
        } else if (node.type === 'crew' && executionStatus === 'error') {
          nodeState = 'error'; // explicitly flag crew failure
        } else if (node.type === 'crew' || node.type === 'webhook' || node.type === 'chat') {
          nodeState = 'success'; // starting nodes and overall successful crews get success
        } else {
          nodeState = 'neutral'; // unreached tasks/agents
        }
      }

      const isSuccess = nodeState === 'success';
      const isError = nodeState === 'error';
      const historyStyle = { 
        ...node.style, 
        opacity: nodeState === 'neutral' ? 0.6 : 0.85, 
        filter: nodeState === 'neutral' ? 'grayscale(100%)' : 'grayscale(15%)',
        ...(isSuccess ? { boxShadow: '0 0 0 2px #22c55e', borderRadius: '0.75rem' } : {}),
        ...(isError ? { boxShadow: '0 0 0 2px #ef4444', borderRadius: '0.75rem' } : {}) 
      };

      return {
        ...node,
        draggable: false,      // Prevent dragging
        selectable: false,     // Prevent selection completely
        selected: false,       // Clear selection state
        style: historyStyle,
        data: {
          ...node.data,
          executionStatus: nodeState // Inject status here to be read by the BadgeWrapper
        }
      };
    });
  }, [nodes, executionStatus, nodeStatuses]);

  const snapshotEdges = useMemo(() => {
    return edges.map((edge) => {
      let isSuccessEdge = executionStatus === 'success';

      if (nodeStatuses) {
        const sourceStatus = nodeStatuses[edge.source];
        if (sourceStatus) {
          isSuccessEdge = sourceStatus === 'success';
        } else {
          // If source node is chat/webhook/crew, edge is lit up if execution reached crew
          const sourceNode = nodes.find(n => n.id === edge.source);
          if (sourceNode && (sourceNode.type === 'chat' || sourceNode.type === 'webhook' || sourceNode.type === 'crew')) {
            isSuccessEdge = true; // flow naturally proceeded 
          } else {
            isSuccessEdge = false;
          }
        }
      }

      return {
        ...edge,
        style: { 
          ...edge.style, 
          strokeWidth: isSuccessEdge ? 3 : 2, 
          stroke: isSuccessEdge ? '#22c55e' : (theme === 'dark' ? '#334155' : '#94a3b8'),
          ...(isSuccessEdge ? { filter: 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.4))' } : {})
        },
        animated: isSuccessEdge, // Animate flow path actively taken
      };
    });
  }, [edges, nodes, theme, executionStatus, nodeStatuses]);

  return (
    <div className="w-full h-[400px] border border-brand-border rounded-xl overflow-hidden relative bg-brand-bg">
      {/* ⚠️ READ-ONLY BANNER */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-sm px-4 py-2 flex items-center justify-center gap-2">
        <span className="text-amber-600 dark:text-amber-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <span>⚠️</span> 
          READ-ONLY HISTORY: This is a snapshot of how the workflow looked during this execution.
        </span>
      </div>

      <ReactFlow
        nodes={snapshotNodes}
        edges={snapshotEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.0 }}
        minZoom={0.2}
        maxZoom={4}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false} /* Disabled purely for read-only view */
        panOnDrag={true}
        zoomOnScroll={true}
        preventScrolling={false}
      >
        <Background 
          gap={16} 
          size={1} 
          color="var(--canvas-dots)" 
          style={{ backgroundColor: 'var(--bg-main)' }} 
          variant={BackgroundVariant.Dots} 
        />
        <Controls 
          className="!bg-brand-card !border-brand-border !text-brand-muted hover:!bg-brand-bg !shadow-md !rounded-lg mb-4 ml-4"
          showInteractive={false} // Disable lock/unlock interaction button
        />
        <MiniMap 
          className="!bg-brand-card !border-brand-border !shadow-md !rounded-lg overflow-hidden mb-4 mr-4" 
          zoomable 
          pannable 
          nodeColor={(node) => {
            if (node.type === 'agent') return '#3b82f6';
            if (node.type === 'task') return '#10b981';
            if (node.type === 'crew') return '#8b5cf6';
            if (node.type === 'webhook') return '#f97316';
            if (node.type === 'chat') return '#0ea5e9';
            return '#e2e8f0';
          }} 
        />
      </ReactFlow>
    </div>
  );
};
