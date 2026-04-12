import dagre from '@dagrejs/dagre';
import { Position } from '@xyflow/react';
import type { AppNode, AppEdge } from '../types/nodes.types';

// Standard dimensions for nodes in SimpleCrew to ensure proper Dagre bounding box calculations
const NODE_WIDTH = 350; 
const NODE_HEIGHT = 250; 

/**
 * Automatically calculates positions for nodes to create a Top-to-Bottom flow.
 */
export const getLayoutedElements = (nodes: AppNode[], edges: AppEdge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  // Set rank direction: 'TB' is top to bottom
  dagreGraph.setGraph({ 
    rankdir: direction, 
    nodesep: 50, // horizontal gap between sibling nodes
    ranksep: 100, // vertical gap between parent/child
  });

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Left-to-Right order definition
  const getWeight = (nodeType?: string) => {
    if (!nodeType) return 10;
    if (['task', 'taskNode'].includes(nodeType)) return 1;
    if (['tool', 'customTool', 'globalTool'].includes(nodeType)) return 2;
    if (nodeType === 'mcp') return 3;
    return 10;
  };

  // 1. Sort nodes descending to counter Dagre's internal insertion inversion
  const sortedNodes = [...nodes].sort((a, b) => getWeight(b.type) - getWeight(a.type));

  sortedNodes.forEach((node) => {
    const width = node.measured?.width ?? NODE_WIDTH;
    const height = node.measured?.height ?? NODE_HEIGHT;
    dagreGraph.setNode(node.id, { width, height });
  });

  // 2. Sort edges descending so the visual Left-to-Right matches Task -> Tool -> MCP
  const sortedEdges = [...edges].sort((a, b) => {
    const typeA = nodeMap.get(a.target)?.type;
    const typeB = nodeMap.get(b.target)?.type;
    return getWeight(typeB) - getWeight(typeA);
  });

  sortedEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target); // Removed the weight property which incorrectly pulls vertical tightness
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const width = node.measured?.width ?? NODE_WIDTH;
    const height = node.measured?.height ?? NODE_HEIGHT;
    
    // Dagre positions nodes by their center, React Flow uses top-left
    return {
      ...node,
      targetPosition: 'top' as Position,
      sourcePosition: 'bottom' as Position,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  const newEdges = edges.map(edge => ({ ...edge, type: 'deletable' }));

  return { nodes: newNodes as AppNode[], edges: newEdges as AppEdge[] };
};
