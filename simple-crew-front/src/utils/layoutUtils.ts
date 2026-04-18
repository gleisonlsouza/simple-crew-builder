import { type AppNode, type AppEdge } from '../types/nodes.types';

export const getLayoutedElements = (nodes: AppNode[], edges: AppEdge[]) => {
  const newNodes: AppNode[] = JSON.parse(JSON.stringify(nodes));
  const processed = new Set();

  const topTypes = ['state']; // Schemas removed from globals
  const spineTypes = ['crew', 'agent', 'router'];
  const toolTypes = ['tool', 'customTool', 'mcp'];
  const taskTypes = ['task'];

  // 1. Top Shelf (Globals like State)
  let topX = 100;
  newNodes.forEach((node: AppNode) => {
    if (topTypes.includes(node.type)) {
      node.position = { x: topX, y: 50 };
      topX += (node.measured?.width || 300) + 50;
      processed.add(node.id);
    }
  });

  // Helper to position Schemas exactly to the RIGHT of the node they configure
  const positionConnectedSchemas = (targetId: string, baseX: number, baseY: number) => {
    const inEdges = edges.filter((e: AppEdge) => e.target === targetId);
    const schemas = inEdges
      .map((e: AppEdge) => newNodes.find((n: AppNode) => n.id === e.source && n.type === 'schema'))
      .filter(Boolean) as AppNode[];
    
    let schemaY = baseY;
    schemas.forEach((schema: AppNode) => {
      if (processed.has(schema.id)) return;
      // Place right of the target node (since target's schema handle is on its right)
      schema.position = { x: baseX + 400, y: schemaY };
      schemaY -= (schema.measured?.height || 150) + 20; // Stack upwards if multiple
      processed.add(schema.id);
    });
  };

  // 2. Find Root for the Spine
  let root: AppNode | undefined = newNodes.find((n: AppNode) => n.type === 'crew');
  if (!root) {
    root = newNodes.find((n: AppNode) =>
      n.type === 'agent' &&
      !edges.some((e: AppEdge) => e.target === n.id && spineTypes.includes(newNodes.find((src: AppNode) => src.id === e.source)?.type || ''))
    );
  }

  // 3. Spine and Ribs Layout (Handle-Aware)
  const CENTER_X = 800;
  let currentY = 250;

  if (root) {
    let queue: AppNode[] = [root];
    
    while (queue.length > 0) {
      const levelNodes = [...queue];
      queue = [];
      
      let maxLevelY = currentY;

      // Fan out multiple spine nodes on the same level
      const startX = CENTER_X - ((levelNodes.length - 1) * 450) / 2;

      levelNodes.forEach((node, index) => {
        if (processed.has(node.id)) return;
        
        const nodeX = startX + (index * 450);
        node.position = { x: nodeX, y: currentY };
        processed.add(node.id);

        // POSITION SCHEMAS FOR THE SPINE NODE
        positionConnectedSchemas(node.id, nodeX, currentY);

        const outEdges = edges.filter((e: AppEdge) => e.source === node.id);
        const children = outEdges
          .map((e: AppEdge) => newNodes.find((n: AppNode) => n.id === e.target))
          .filter(Boolean) as AppNode[];

        const taskChildren = children.filter((c: AppNode) => taskTypes.includes(c.type));
        const toolChildren = children.filter((c: AppNode) => toolTypes.includes(c.type));
        const spineChildren = children.filter((c: AppNode) => spineTypes.includes(c.type));

        const currentChildY = currentY + (node.measured?.height || 200) + 80;

        // MATCHING LEFT-MOST HANDLE: Place Tasks Far-Left
        taskChildren.forEach((child: AppNode, i: number) => {
          if (processed.has(child.id)) return;
          const childX = nodeX - 700;
          const childY = currentChildY + (i * 250);
          child.position = { x: childX, y: childY };
          processed.add(child.id);
          // POSITION SCHEMAS FOR THE TASK
          positionConnectedSchemas(child.id, childX, childY);
        });

        // MATCHING CENTER-LEFT HANDLE: Place Tools Center-Left
        toolChildren.forEach((child: AppNode, i: number) => {
          if (processed.has(child.id)) return;
          const childX = nodeX - 350;
          const childY = currentChildY + (i * 250);
          child.position = { x: childX, y: childY };
          processed.add(child.id);
          // POSITION SCHEMAS FOR THE TOOL (if applicable)
          positionConnectedSchemas(child.id, childX, childY);
        });

        // Queue Spine children
        spineChildren.forEach((child: AppNode) => {
          queue.push(child);
        });

        const tasksMaxY = currentChildY + (taskChildren.length * 250);
        const toolsMaxY = currentChildY + (toolChildren.length * 250);
        const thisLevelMaxY = Math.max(currentChildY, tasksMaxY, toolsMaxY);
        
        if (thisLevelMaxY > maxLevelY) maxLevelY = thisLevelMaxY;
      });

      currentY = maxLevelY + 50; 
    }
  }

  // 4. Fallback for orphans (including unconnected schemas)
  let fallbackX = 100;
  const fallbackY = currentY + 100;
  newNodes.forEach((node: AppNode) => {
    if (!processed.has(node.id)) {
      node.position = { x: fallbackX, y: fallbackY };
      fallbackX += (node.measured?.width || 300) + 50;
      processed.add(node.id);
    }
  });

  return { nodes: newNodes, edges };
};
