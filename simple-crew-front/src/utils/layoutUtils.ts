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

  // Helper to position Schemas exactly to the LEFT/TOP of the node they configure
  const positionConnectedSchemas = (targetId: string, baseX: number, baseY: number) => {
    const inEdges = edges.filter((e: AppEdge) => e.target === targetId);
    const schemas = inEdges
      .map((e: AppEdge) => newNodes.find((n: AppNode) => n.id === e.source && n.type === 'schema'))
      .filter(Boolean) as AppNode[];
    
    let schemaOffset = 0;
    schemas.forEach((schema: AppNode) => {
      if (processed.has(schema.id)) return;
      if (isHorizontal) {
        // Horizontal: Flow is Left->Right. Inputs are on the Left.
        // Place schema to the LEFT of the target
        const schemaWidth = schema.measured?.width || 240;
        schema.position = { x: baseX - schemaWidth - 100, y: baseY + schemaOffset };
        schemaOffset += (schema.measured?.height || 150) + 20;
      } else {
        // Vertical: Flow is Top->Bottom. Inputs are on the Top.
        // Place schema ABOVE the target, slightly shifted to the right
        const schemaHeight = schema.measured?.height || 150;
        schema.position = { x: baseX + 300, y: baseY - schemaHeight - 100 + schemaOffset };
        schemaOffset += (schema.measured?.height || 150) + 20;
      }
      processed.add(schema.id);
    });
  };

  // 2. Find Root for the Spine
  let root: AppNode | undefined = newNodes.find((n: AppNode) => n.type === 'crew');
  if (!root) {
    root = newNodes.find((n: AppNode) =>
      spineTypes.includes(n.type) &&
      !edges.some((e: AppEdge) => e.target === n.id && spineTypes.includes(newNodes.find((src: AppNode) => src.id === e.source)?.type || ''))
    );
  }

  // 3. Spine and Ribs Layout (Handle-Aware)
  const CENTER_X = isHorizontal ? 200 : 800;
  const CENTER_Y = isHorizontal ? 400 : 150;
  let currentSpinePos = isHorizontal ? CENTER_X : CENTER_Y;

  if (root) {
    let queue: AppNode[] = [root];
    
    while (queue.length > 0) {
      const levelNodes = [...queue];
      queue = [];
      
      let maxLevelOffset = currentSpinePos;

      // Fan out multiple spine nodes on the same level
      const crossSpacing = 500;
      const startingCrossPos = isHorizontal 
        ? CENTER_Y - ((levelNodes.length - 1) * crossSpacing) / 2
        : CENTER_X - ((levelNodes.length - 1) * crossSpacing) / 2;

      levelNodes.forEach((node, index) => {
        if (processed.has(node.id)) return;
        
        const crossPos = startingCrossPos + (index * crossSpacing);
        
        if (isHorizontal) {
          node.position = { x: currentSpinePos, y: crossPos };
        } else {
          node.position = { x: crossPos, y: currentSpinePos };
        }
        processed.add(node.id);

        // POSITION SCHEMAS (Inputs to this node)
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
          const nodeWidth = node.measured?.width || 250;
          const ribsBaseX = currentSpinePos + nodeWidth + 150;
          
          // Tasks go ABOVE the node center
          taskChildren.forEach((child: AppNode, i: number) => {
            if (processed.has(child.id)) return;
            child.position = { x: ribsBaseX, y: crossPos - 300 - (i * 250) };
            processed.add(child.id);
            positionConnectedSchemas(child.id, child.position.x, child.position.y);
          });

          // Tools go BELOW the node center
          toolChildren.forEach((child: AppNode, i: number) => {
            if (processed.has(child.id)) return;
            child.position = { x: ribsBaseX, y: crossPos + 300 + (i * 250) };
            processed.add(child.id);
            positionConnectedSchemas(child.id, child.position.x, child.position.y);
          });
        } else {
          // Vertical layout logic
          const nodeHeight = node.measured?.height || 200;
          const currentChildY = currentSpinePos + nodeHeight + 100;
          
          // In Vertical, tasks and tools go to the LEFT side of the spine
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

        // Queue Spine children for next level
        spineChildren.forEach((child: AppNode) => {
          if (!processed.has(child.id)) {
            queue.push(child);
          }
        });

        // Calculate max offset for NEXT level to avoid overlap
        if (isHorizontal) {
          const nodeWidth = node.measured?.width || 250;
          const hasRibs = taskChildren.length > 0 || toolChildren.length > 0;
          const thisNodeLevelMaxX = currentSpinePos + nodeWidth + (hasRibs ? 700 : 400); 
          if (thisNodeLevelMaxX > maxLevelOffset) maxLevelOffset = thisNodeLevelMaxX;
        } else {
          const nodeHeight = node.measured?.height || 200;
          const tasksMaxY = currentSpinePos + nodeHeight + 100 + (taskChildren.length * 250);
          const toolsMaxY = currentSpinePos + nodeHeight + 100 + (toolChildren.length * 250);
          const spineMaxY = currentSpinePos + nodeHeight + 400;
          const thisLevelMaxY = Math.max(spineMaxY, tasksMaxY, toolsMaxY);
          if (thisLevelMaxY > maxLevelOffset) maxLevelOffset = thisLevelMaxY;
        }
      });

      currentSpinePos = maxLevelOffset + 100; 
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

