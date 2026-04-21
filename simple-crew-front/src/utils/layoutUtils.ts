import { type AppNode, type AppEdge } from '../types/nodes.types';

export const getLayoutedElements = (nodes: AppNode[], edges: AppEdge[], direction: 'vertical' | 'horizontal' = 'vertical') => {
  const isHorizontal = direction === 'horizontal';
  const newNodes: AppNode[] = JSON.parse(JSON.stringify(nodes));
  const processed = new Set();

  const topTypes = ['state']; // Schemas removed from globals
  const spineTypes = ['crew', 'agent', 'router'];
  const toolTypes = ['tool', 'customTool', 'mcp'];
  const taskTypes = ['task'];

  // 1. Top Shelf (Globals like State)
  let topX = 100;
  let topY = 50;
  newNodes.forEach((node: AppNode) => {
    if (topTypes.includes(node.type)) {
      node.position = { x: topX, y: topY };
      if (isHorizontal) {
        topY += (node.measured?.height || 150) + 50;
      } else {
        topX += (node.measured?.width || 300) + 50;
      }
      processed.add(node.id);
    }
  });

  // Helper to position Schemas exactly to the RIGHT/BOTTOM of the node they configure
  const positionConnectedSchemas = (targetId: string, baseX: number, baseY: number) => {
    const inEdges = edges.filter((e: AppEdge) => e.target === targetId);
    const schemas = inEdges
      .map((e: AppEdge) => newNodes.find((n: AppNode) => n.id === e.source && n.type === 'schema'))
      .filter(Boolean) as AppNode[];
    
    let schemaOffset = 0;
    schemas.forEach((schema: AppNode) => {
      if (processed.has(schema.id)) return;
      if (isHorizontal) {
        // Place above or below? Let's say right and offset
        schema.position = { x: baseX + 400, y: baseY + schemaOffset };
        schemaOffset += (schema.measured?.height || 150) + 20;
      } else {
        // Place right of the target node
        schema.position = { x: baseX + 400, y: baseY + schemaOffset };
        schemaOffset -= (schema.measured?.height || 150) + 20;
      }
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
  const CENTER_X = isHorizontal ? 250 : 800;
  const CENTER_Y = isHorizontal ? 400 : 250;
  let currentSpinePos = isHorizontal ? CENTER_X : CENTER_Y;

  if (root) {
    let queue: AppNode[] = [root];
    
    while (queue.length > 0) {
      const levelNodes = [...queue];
      queue = [];
      
      let maxLevelOffset = currentSpinePos;

      // Fan out multiple spine nodes on the same level
      const startingCrossPos = isHorizontal 
        ? CENTER_Y - ((levelNodes.length - 1) * 450) / 2
        : CENTER_X - ((levelNodes.length - 1) * 450) / 2;

      levelNodes.forEach((node, index) => {
        if (processed.has(node.id)) return;
        
        const crossPos = startingCrossPos + (index * 450);
        
        if (isHorizontal) {
          node.position = { x: currentSpinePos, y: crossPos };
        } else {
          node.position = { x: crossPos, y: currentSpinePos };
        }
        processed.add(node.id);

        // POSITION SCHEMAS
        positionConnectedSchemas(node.id, node.position.x, node.position.y);

        const outEdges = edges.filter((e: AppEdge) => e.source === node.id);
        const children = outEdges
          .map((e: AppEdge) => newNodes.find((n: AppNode) => n.id === e.target))
          .filter(Boolean) as AppNode[];

        const taskChildren = children.filter((c: AppNode) => taskTypes.includes(c.type));
        const toolChildren = children.filter((c: AppNode) => toolTypes.includes(c.type));
        const spineChildren = children.filter((c: AppNode) => spineTypes.includes(c.type));

        if (isHorizontal) {
          // In Horizontal, Ribs (Tasks/Tools) go to the right but on different Y
          const ribsBaseX = currentSpinePos + (node.measured?.width || 250) + 150;
          
          taskChildren.forEach((child: AppNode, i: number) => {
            if (processed.has(child.id)) return;
            child.position = { x: ribsBaseX, y: crossPos - 300 - (i * 250) };
            processed.add(child.id);
            positionConnectedSchemas(child.id, child.position.x, child.position.y);
          });

          toolChildren.forEach((child: AppNode, i: number) => {
            if (processed.has(child.id)) return;
            child.position = { x: ribsBaseX, y: crossPos + 300 + (i * 250) };
            processed.add(child.id);
            positionConnectedSchemas(child.id, child.position.x, child.position.y);
          });
        } else {
          // Vertical layout logic (Original)
          const currentChildY = currentSpinePos + (node.measured?.height || 200) + 80;
          
          taskChildren.forEach((child: AppNode, i: number) => {
            if (processed.has(child.id)) return;
            child.position = { x: crossPos - 700, y: currentChildY + (i * 250) };
            processed.add(child.id);
            positionConnectedSchemas(child.id, child.position.x, child.position.y);
          });

          toolChildren.forEach((child: AppNode, i: number) => {
            if (processed.has(child.id)) return;
            child.position = { x: crossPos - 350, y: currentChildY + (i * 250) };
            processed.add(child.id);
            positionConnectedSchemas(child.id, child.position.x, child.position.y);
          });
        }

        // Queue Spine children
        spineChildren.forEach((child: AppNode) => {
          queue.push(child);
        });

        // Calculate max offset for NEXT level
        if (isHorizontal) {
          const thisNodeLevelMaxX = currentSpinePos + (node.measured?.width || 250) + 600; // 600 allows space for ribs
          if (thisNodeLevelMaxX > maxLevelOffset) maxLevelOffset = thisNodeLevelMaxX;
        } else {
          const tasksMaxY = currentSpinePos + (node.measured?.height || 200) + 80 + (taskChildren.length * 250);
          const toolsMaxY = currentSpinePos + (node.measured?.height || 200) + 80 + (toolChildren.length * 250);
          const spineMaxY = currentSpinePos + (node.measured?.height || 200) + 300;
          const thisLevelMaxY = Math.max(spineMaxY, tasksMaxY, toolsMaxY);
          if (thisLevelMaxY > maxLevelOffset) maxLevelOffset = thisLevelMaxY;
        }
      });

      currentSpinePos = maxLevelOffset + 50; 
    }
  }

  // 4. Fallback for orphans
  let fallbackX = 100;
  const fallbackY = currentSpinePos + 100;
  newNodes.forEach((node: AppNode) => {
    if (!processed.has(node.id)) {
      node.position = { x: fallbackX, y: fallbackY };
      fallbackX += (node.measured?.width || 300) + 50;
      processed.add(node.id);
    }
  });

  return { nodes: newNodes, edges };
};

