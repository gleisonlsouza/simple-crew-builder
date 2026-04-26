import type { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { 
  type Connection, 
  type EdgeChange, 
  type NodeChange, 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges,
  MarkerType
} from '@xyflow/react';
import type { 
  AppNode, 
  AppEdge, 
  AgentNodeData, 
  TaskNodeData, 
  CrewNodeData, 
  WebhookNodeData 
} from '../../types/nodes.types';
import type { NodeStatus, AppState, GraphSlice, ChatMessage } from '../../types/store.types';
import { getLayoutedElements } from '../../utils/layoutUtils';


// Helper functions for collapsing logic
function getDescendantsToHide(nodeId: string, edges: AppEdge[], allowedHandles?: string[]): string[] {
  const descendants: string[] = [];
  const queue = [nodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const children = edges
      .filter((edge) => {
        if (edge.source !== currentId) return false;
        if (currentId === nodeId && allowedHandles) {
          return allowedHandles.includes(edge.sourceHandle || '');
        }
        return true;
      })
      .map((edge) => edge.target);

    for (const childId of children) {
      if (!visited.has(childId)) {
        descendants.push(childId);
        queue.push(childId);
      }
    }
  }
  return descendants;
}

function getDescendantsToShow(nodeId: string, nodes: AppNode[], edges: AppEdge[], allowedHandles?: string[]): string[] {
  const descendants: string[] = [];
  const queue = [nodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const childrenIds = edges
      .filter((edge) => {
        if (edge.source !== currentId) return false;
        if (currentId === nodeId && allowedHandles) {
          return allowedHandles.includes(edge.sourceHandle || '');
        }
        return true;
      })
      .map((edge) => edge.target);

    for (const childId of childrenIds) {
      if (!visited.has(childId)) {
        descendants.push(childId);
        const childNode = nodes.find(n => n.id === childId);
        const isChildCollapsed = childNode?.data?.isCollapsed ?? false;
        if (!isChildCollapsed) {
          queue.push(childId);
        }
      }
    }
  }
  return descendants;
}

const initialNodes: AppNode[] = [
  {
    id: 'crew-1',
    type: 'crew',
    position: { x: 50, y: 50 },
    data: { name: 'New Crew', process: 'sequential', isCollapsed: false } as CrewNodeData,
  },
  {
    id: 'agent-1',
    type: 'agent',
    position: { x: 50, y: 200 },
    data: {
      name: 'Senior Writer',
      role: 'Senior Writer',
      goal: 'Write compelling copy',
      backstory: 'Expert in persuasive writing.',
      isCollapsed: false,
    },
  },
  {
    id: 'task-1',
    type: 'task',
    position: { x: 450, y: 200 },
    data: {
      name: 'SEO Writing Task',
      description: 'Escrever descrições persuasivas para os produtos da Glaad Store',
      expected_output: '3 parágrafos de texto otimizado para SEO'
    },
  }
];

const initialEdges: AppEdge[] = [
  { 
    id: 'e1-2', 
    source: 'agent-1', 
    target: 'task-1', 
    type: 'deletable', 
    sourceHandle: 'out-task', 
    targetHandle: 'left-target',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    animated: true 
  }
];

export const INITIAL_CHAT_MESSAGES: AppState['messages'] = [
  {
    id: 'welcome-1',
    role: 'assistant',
    content: 'Hello! I am connected to your Crew. How can we help you today?'
  }
];

export const createGraphSlice: StateCreator<AppState, [], [], GraphSlice> = (set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  nodeStatuses: {},
  nodeErrors: {},
  nodeWarnings: {},
  executionResult: null,
  messages: INITIAL_CHAT_MESSAGES,
  activeNodeId: null,
  focusedTreeRootId: null,

  onNodesChange: (changes: NodeChange<AppNode>[]) => {
    const { nodes } = get();
    const nextNodes = applyNodeChanges(changes, nodes);
    
    // O SEGREDO DO FPS: Checa se é apenas drag (posição). Se for, pula todo o código pesado.
    const hasRemoval = changes.some(c => c.type === 'remove');
    
    if (hasRemoval) {
      const removedTaskIds = changes
        .filter((c): c is { type: 'remove'; id: string } => c.type === 'remove')
        .map((c) => c.id);

      if (removedTaskIds.length > 0) {
        set({
          nodes: nextNodes.map((node: AppNode) => {
            if (node.type === 'agent') {
              const data = node.data as AgentNodeData;
              const taskOrder = data.taskOrder || [];
              const newTaskOrder = taskOrder.filter((id: string) => !removedTaskIds.includes(id));
              if (newTaskOrder.length !== taskOrder.length) {
                  return { ...node, data: { ...node.data, taskOrder: newTaskOrder } } as AppNode;
              }
            }
            if (node.type === 'crew') {
              const data = node.data as CrewNodeData;
              const agentOrder = data.agentOrder || [];
              const taskOrder = data.taskOrder || [];
              const newAgentOrder = agentOrder.filter((id: string) => !removedTaskIds.includes(id));
              const newTaskOrder = taskOrder.filter((id: string) => !removedTaskIds.includes(id));
              if (newAgentOrder.length !== agentOrder.length || newTaskOrder.length !== taskOrder.length) {
                return { ...node, data: { ...node.data, agentOrder: newAgentOrder, taskOrder: newTaskOrder } } as AppNode;
              }
            }
            return node;
          })
        });
        return; // Previne o set duplo
      }
    } 
    
    // Caminho rápido para quando você está apenas arrastando um card (60 frames por segundo)
    set({ nodes: nextNodes });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    const { nodes, edges } = get();
    const nextEdges = applyEdgeChanges(changes, edges);

    const removedEdges = changes.filter((c: EdgeChange) => c.type === 'remove');
    if (removedEdges.length > 0) {
      let updatedNodes = [...nodes];
      removedEdges.forEach((change: EdgeChange) => {
        if (change.type === 'remove') {
          const edge = edges.find((e: AppEdge) => e.id === change.id);
          if (edge) {
            const sourceNode = nodes.find((n: AppNode) => n.id === edge.source);
            const targetNode = nodes.find((n: AppNode) => n.id === edge.target);
            
            if (sourceNode?.type === 'agent' && targetNode?.type === 'task') {
              updatedNodes = updatedNodes.map((node: AppNode) => {
                if (node.id === sourceNode.id && node.type === 'agent') {
                  const data = node.data as AgentNodeData;
                  const taskOrder = data.taskOrder || [];
                  return { ...node, data: { ...node.data, taskOrder: taskOrder.filter((id: string) => id !== targetNode.id) } } as AppNode;
                }
                // Also remove from Crew if applicable
                if (node.type === 'crew') {
                  const data = node.data as CrewNodeData;
                  const taskOrder = data.taskOrder || [];
                  if (taskOrder.includes(targetNode.id)) {
                    return { ...node, data: { ...node.data, taskOrder: taskOrder.filter((id: string) => id !== targetNode.id) } } as AppNode;
                  }
                }
                return node;
              });
            }

            if (sourceNode?.type === 'crew' && targetNode?.type === 'agent') {
              updatedNodes = updatedNodes.map((node: AppNode) => {
                if (node.id === sourceNode.id && node.type === 'crew') {
                  const data = node.data as CrewNodeData;
                  const agentOrder = data.agentOrder || [];
                  // When removing an agent, also remove all its tasks from the crew's taskOrder
                  let crewTaskOrder = data.taskOrder || [];
                  const agentTasks = edges
                    .filter(e => e.source === targetNode.id)
                    .map(e => e.target);
                  
                  crewTaskOrder = crewTaskOrder.filter((tid: string) => !agentTasks.includes(tid));

                  return { 
                    ...node, 
                    data: { 
                      ...node.data, 
                      agentOrder: agentOrder.filter((id: string) => id !== targetNode.id),
                      taskOrder: crewTaskOrder
                    } 
                  } as AppNode;
                }
                return node;
              });
            }
          }
        }
      });
      set({ nodes: updatedNodes, edges: nextEdges });
    } else {
      set({ edges: nextEdges });
    }
  },

  onConnect: (connection: Connection) => {
    set((state) => {
      if (!connection.source || !connection.target) return state;

      const sourceNode = state.nodes.find((n) => n.id === connection.source);
      const targetNode = state.nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return state;

      const isCrewToAgent = sourceNode.type === 'crew' && targetNode.type === 'agent';
      const isAgentToTask = sourceNode.type === 'agent' && ['task', 'taskNode', 'agentTask'].includes(targetNode.type);
      const isChatToCrew = sourceNode.type === 'chat' && targetNode.type === 'crew';
      const isWebhookToCrew = sourceNode.type === 'webhook' && targetNode.type === 'crew';
      const isAgentToTool = sourceNode.type === 'agent' && ['tool', 'customTool', 'toolNode', 'customToolNode', 'globalTool'].includes(targetNode.type);
      const isTaskToTool = sourceNode.type === 'task' && ['tool', 'customTool', 'toolNode', 'customToolNode', 'globalTool'].includes(targetNode.type);
      const isAgentToMcp = sourceNode.type === 'agent' && targetNode.type === 'mcp';
      const isTaskToMcp = sourceNode.type === 'task' && targetNode.type === 'mcp';
      const isStateToCrew = sourceNode.type === 'state' && targetNode.type === 'crew';
      const isSchemaToAgent = sourceNode.type === 'schema' && targetNode.type === 'agent';
      const isSchemaToState = sourceNode.type === 'schema' && targetNode.type === 'state';
      const isRouterToAgent = sourceNode.type === 'router' && targetNode.type === 'agent';
      const isRouterToTask = sourceNode.type === 'router' && targetNode.type === 'task';
      const isRouterToRouter = sourceNode.type === 'router' && targetNode.type === 'router';
      const isAgentToRouter = sourceNode.type === 'agent' && targetNode.type === 'router';
      const isCrewToRouter = sourceNode.type === 'crew' && targetNode.type === 'router';
      const isAgentToAgent = sourceNode.type === 'agent' && targetNode.type === 'agent';
      const isAgentToState = sourceNode.type === 'agent' && targetNode.type === 'state';
      const isTaskToState = sourceNode.type === 'task' && targetNode.type === 'state';

      if (!isCrewToAgent && !isAgentToTask && !isChatToCrew && !isWebhookToCrew && !isAgentToTool && !isTaskToTool && !isAgentToMcp && !isTaskToMcp && !isStateToCrew && !isSchemaToAgent && !isSchemaToState && !isRouterToAgent && !isRouterToTask && !isRouterToRouter && !isAgentToRouter && !isCrewToRouter && !isAgentToAgent && !isAgentToState && !isTaskToState) {
        return state;
      }

      const isDuplicate = state.edges.some(
        (edge) => edge.source === connection.source && edge.target === connection.target
      );
      if (isDuplicate) return state;

      let newEdges = [...state.edges];

      if (targetNode.type === 'task' || targetNode.type === 'agent' || targetNode.type === 'crew' || targetNode.type === 'state') {
        newEdges = newEdges.filter((edge) => {
          // Rule: An edge should only be replaced if it targets the same handle on the same node
          const isSameTarget = edge.target === connection.target;
          const isSameHandle = edge.targetHandle === connection.targetHandle;
          
          // LANGGRAPH EXCEPTION: agent-in can have multiple inputs (cycles/fallback)
          if (targetNode.type === 'agent' && connection.targetHandle === 'agent-in') {
            return true;
          }

          return !(isSameTarget && isSameHandle);
        });
      }

      let newConnection: AppEdge = { 
        ...connection, 
        id: uuidv4(), 
        type: 'deletable',
        // IDLE STATE: Blue Dashed + Arrow
        style: { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
        animated: true
      } as AppEdge;

      if (isChatToCrew) {
        newConnection = {
          ...newConnection,
          animated: true,
          sourceHandle: 'right-source',
          targetHandle: 'trigger-in',
          style: { stroke: '#22d3ee', strokeWidth: 2, strokeDasharray: '5 5' }
        };
        // This action triggers UI change:
        setTimeout(() => get().setIsChatVisible(true), 0);
      }

      if (isWebhookToCrew) {
        newConnection = {
          ...newConnection,
          animated: true,
          sourceHandle: 'right-source',
          targetHandle: 'trigger-in',
          style: { stroke: '#f97316', strokeWidth: 2, strokeDasharray: '5 5' }
        };
      }

      if (isStateToCrew) {
        newConnection = {
          ...newConnection,
          animated: true,
          sourceHandle: 'state-out',
          targetHandle: 'state-in',
          style: { stroke: '#a855f7', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' }
        };
      }

      if (isAgentToState || isTaskToState) {
        newConnection = {
          ...newConnection,
          animated: true,
          sourceHandle: connection.sourceHandle || 'data-out',
          style: { stroke: '#a855f7', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' }
        };
      }

      if (isAgentToAgent) {
        newConnection = {
          ...newConnection,
          animated: true,
          sourceHandle: connection.sourceHandle || 'agent-out',
          targetHandle: connection.targetHandle || 'agent-in',
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
        };
      }

      if (isSchemaToAgent) {
        newConnection = {
          ...newConnection,
          animated: true,
          style: { stroke: '#14b8a6', strokeWidth: 2 }
        };
      }

      if (isSchemaToState) {
        newConnection = {
          ...newConnection,
          animated: true,
          style: { stroke: '#14b8a6', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#14b8a6' }
        };
      }

      let nextNodes = state.nodes;
      if (isAgentToTask) {
        nextNodes = state.nodes.map((node: AppNode) => {
          // Update Agent
          if (node.id === connection.source && node.type === 'agent') {
            const data = node.data as AgentNodeData;
            const taskOrder = data.taskOrder || [];
            if (!taskOrder.includes(connection.target!)) {
               return { 
                 ...node, 
                 data: { ...node.data, taskOrder: [...taskOrder, connection.target!] } 
               } as AppNode;
            }
          }
          // Update Crew (if this agent is connected to a crew)
          if (node.type === 'crew') {
            const isAgentInCrew = state.edges.some(e => e.source === node.id && e.target === connection.source);
            if (isAgentInCrew) {
              const data = node.data as CrewNodeData;
              const taskOrder = data.taskOrder || [];
              if (!taskOrder.includes(connection.target!)) {
                return { 
                  ...node, 
                  data: { ...node.data, taskOrder: [...taskOrder, connection.target!] } 
                } as AppNode;
              }
            }
          }
          return node;
        });
      }

      if (isCrewToAgent) {
        nextNodes = state.nodes.map((node: AppNode) => {
          if (node.id === connection.source && node.type === 'crew') {
            const data = node.data as CrewNodeData;
            const agentOrder = data.agentOrder || [];
            if (!agentOrder.includes(connection.target!)) {
              // When adding an agent to a crew, also add all its tasks to the crew's taskOrder
              const agentTasks = state.edges
                .filter(e => e.source === connection.target)
                .map(e => e.target);
              
              const existingCrewTasks = data.taskOrder || [];
              const newCrewTasks = [...existingCrewTasks];
              agentTasks.forEach(tid => {
                if (!newCrewTasks.includes(tid)) newCrewTasks.push(tid);
              });

               return { 
                 ...node, 
                 data: { 
                   ...node.data, 
                   agentOrder: [...agentOrder, connection.target!],
                   taskOrder: newCrewTasks
                 } 
               } as AppNode;
            }
          }
          return node;
        });
      }

      // Style Router Connections
      if (sourceNode.type === 'router') {
        newConnection.style = { stroke: '#6366f1', strokeWidth: 3 };
        newConnection.animated = true;
        newConnection.label = 'Condition Path';
        newConnection.labelStyle = { fill: '#6366f1', fontWeight: 700, fontSize: '10px' };
        newConnection.markerEnd = { type: MarkerType.ArrowClosed, color: '#6366f1' };
      }

      // ─── Direct State Connection Sync ───────────────────────────────────
      // When a manual connection to/from a State is made, update the data
      if (isStateToCrew) {
        nextNodes = nextNodes.map(n => n.id === targetNode.id 
          ? { ...n, data: { ...n.data, selectedStateId: sourceNode.id, showStateConnections: true } } as AppNode 
          : n
        );
      }
      if (isAgentToState) {
        let fieldKey = undefined;
        if (connection.targetHandle?.startsWith('field-in-')) {
          fieldKey = connection.targetHandle.replace('field-in-', '');
        }
        
        nextNodes = nextNodes.map(n => n.id === sourceNode.id 
          ? { ...n, data: { ...n.data, selectedStateId: targetNode.id, selectedStateKey: fieldKey, showStateConnections: true } } as AppNode 
          : n
        );
      }

      return {
        nodes: nextNodes,
        edges: (isStateToCrew || isAgentToState) ? newEdges : addEdge(newConnection, newEdges),
      };
    });
  },

  deleteEdge: (edgeId: string) => {
    set((state: AppState) => {
      const edge = state.edges.find((e: AppEdge) => e.id === edgeId);
      let updatedNodes = state.nodes;

      if (edge) {
        const sourceNode = state.nodes.find((n: AppNode) => n.id === edge.source);
        const targetNode = state.nodes.find((n: AppNode) => n.id === edge.target);
        if (sourceNode?.type === 'agent' && targetNode?.type === 'task') {
          updatedNodes = state.nodes.map((node: AppNode) => {
            if (node.id === sourceNode.id && node.type === 'agent') {
              const data = node.data as AgentNodeData;
              const taskOrder = data.taskOrder || [];
              return { ...node, data: { ...node.data, taskOrder: taskOrder.filter((id: string) => id !== targetNode.id) } } as AppNode;
            }
            return node;
          });
        }
      }

      return {
        nodes: updatedNodes,
        edges: state.edges.filter((e: AppEdge) => e.id !== edgeId),
      };
    });
  },

  deleteNode: (nodeId: string) => {
    set((state: AppState) => {
      const nodeToDelete = state.nodes.find((n: AppNode) => n.id === nodeId);
      let updatedNodes = state.nodes.filter((node: AppNode) => node.id !== nodeId);

      if (nodeToDelete?.type === 'task') {
        updatedNodes = updatedNodes.map((node: AppNode) => {
          if (node.type === 'agent') {
            const data = node.data as AgentNodeData;
            const taskOrder = data.taskOrder || [];
            return { ...node, data: { ...node.data, taskOrder: taskOrder.filter((id: string) => id !== nodeId) } } as AppNode;
          }
          if (node.type === 'crew') {
            const data = node.data as CrewNodeData;
            const taskOrder = data.taskOrder || [];
            return { ...node, data: { ...node.data, taskOrder: taskOrder.filter((id: string) => id !== nodeId) } } as AppNode;
          }
          return node;
        });
      }

      if (nodeToDelete?.type === 'agent') {
        updatedNodes = updatedNodes.map((node: AppNode) => {
          if (node.type === 'crew') {
            const data = node.data as CrewNodeData;
            const agentOrder = data.agentOrder || [];
            return { ...node, data: { ...node.data, agentOrder: agentOrder.filter((id: string) => id !== nodeId) } } as AppNode;
          }
          return node;
        });
      }

      if (nodeToDelete?.type === 'state') {
        updatedNodes = updatedNodes.map((node: AppNode) => {
          const data = node.data as { selectedStateId?: string };
          if (data.selectedStateId === nodeId) {
            const newData = { ...node.data } as Record<string, unknown>;
            delete newData.selectedStateId;
            return { ...node, data: newData } as AppNode;
          }
          return node;
        });
      }

      return {
        nodes: updatedNodes,
        edges: state.edges.filter((edge: AppEdge) => edge.source !== nodeId && edge.target !== nodeId),
        activeNodeId: state.activeNodeId === nodeId ? null : state.activeNodeId,
      };
    });
  },

  updateNodeData: (nodeId: string, data: Partial<AppNode['data']>) => {
    set({
      nodes: get().nodes.map((node: AppNode) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } } as AppNode;
        }
        return node;
      }),
    });
  },

  addNode: (node: AppNode) => {
    set({
      nodes: [...get().nodes, node],
    });
  },

  addNodeWithAutoPosition: (type: 'agent' | 'task' | 'crew' | 'chat' | 'webhook' | 'tool' | 'customTool' | 'mcp' | 'state' | 'router' | 'schema', data: Partial<AppNode['data']>) => {
    const existingNodes = get().nodes;
    const startX = 600;
    const startY = 100;
    const spacingX = 350; 
    const spacingY = 220; 
    const nodesPerRow = 3;

    const gridIndex = existingNodes.length;
    const row = Math.floor(gridIndex / nodesPerRow);
    const col = gridIndex % nodesPerRow;

    const position = {
      x: startX + (col * spacingX),
      y: startY + (row * spacingY),
    };

    const newNode: AppNode = {
      id: `dndnode_${uuidv4()}`,
      type,
      position,
      data: data as AppNode['data'],
    } as AppNode;

    set({
      nodes: [...existingNodes, newNode],
    });
    
    get().validateGraph();
  },

  setNodeStatus: (id: string, status: NodeStatus) => {
    set((state: AppState) => {
      const newStatuses = { ...state.nodeStatuses, [id]: status };
      const node = state.nodes.find((n: AppNode) => n.id === id);

      // 1. Symbiotic Status Updates
      if (node?.type === 'task') {
        const edgeToTask = state.edges.find((e: AppEdge) => e.target === id);
        if (edgeToTask) {
          const parentAgentId = edgeToTask.source;
          if (status === 'running') {
            newStatuses[parentAgentId] = 'running';
          }
          else if (status === 'success') {
            const allSiblingTasks = state.edges
              .filter((e: AppEdge) => e.source === parentAgentId)
              .map((e: AppEdge) => e.target);

            const allSuccess = allSiblingTasks.every((taskId: string) =>
              taskId === id ? true : newStatuses[taskId] === 'success'
            );

            if (allSuccess) {
              newStatuses[parentAgentId] = 'success';
            }
          }
        }
      } 
      // REMOVED: Agent -> Task Sync (Fixed to allow sequential task visualization)
      /*
      else if (node?.type === 'agent') {
        const connectedTasks = state.edges
          .filter(e => e.source === id && e.targetHandle === 'left-target')
          .map(e => e.target);
        
        connectedTasks.forEach(taskId => {
           newStatuses[taskId] = status;
        });
      }
      */

      // 2. Execution Visual Orchestration: Edge Animation (ACTIVE STATE)
      let updatedEdges = state.edges;
      if (status === 'running' || status === 'success') {
        updatedEdges = state.edges.map(edge => {
          if (edge.target === id) {
            return { 
              ...edge, 
              animated: true, 
              style: { ...edge.style, stroke: '#10b981', strokeWidth: 3, strokeDasharray: undefined },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' }
            };
          }
          return edge;
        });
      }

      // 3. Sync status to node data for full UI consistency
      const updatedNodes = state.nodes.map(node => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, status } };
        }
        return node;
      });

      return { 
        nodeStatuses: newStatuses,
        edges: updatedEdges,
        nodes: updatedNodes as AppNode[]
      };
    });
  },

  setNodeWarnings: (warnings: Record<string, string[]>) => {
    set({ nodeWarnings: warnings });
  },

  setActiveNode: (id: string | null) => {
    set({ activeNodeId: id });
  },

  toggleCollapse: (nodeId: string, allowedHandles?: string[]) => {
    set((state: AppState) => {
      const node = state.nodes.find((n: AppNode) => n.id === nodeId);
      if (!node) return {};

      const currentlyCollapsed = node.data.isCollapsed ?? false;
      const willCollapse = !currentlyCollapsed;

      let descendantIds: string[] = [];

      if (willCollapse) {
        descendantIds = getDescendantsToHide(nodeId, state.edges, allowedHandles);
      } else {
        descendantIds = getDescendantsToShow(nodeId, state.nodes, state.edges, allowedHandles);
      }

      const descendantSet = new Set(descendantIds);

      const updatedNodes = state.nodes.map((n: AppNode) => {
        if (n.id === nodeId) {
          return { ...n, data: { ...n.data, isCollapsed: willCollapse } } as AppNode;
        }
        if (descendantSet.has(n.id)) {
          return { ...n, hidden: willCollapse } as AppNode;
        }
        return n;
      });

      const updatedEdges = state.edges.map((edge: AppEdge) => {
        // If it's an edge from the root node, check if its handle is in allowedHandles
        const isFromRoot = edge.source === nodeId;
        const isToDescendant = descendantSet.has(edge.target);
        const isFromDescendant = descendantSet.has(edge.source);

        let shouldBeHidden = false;
        if (isFromRoot) {
          // Only hide if the handle is allowed to be collapsed
          const isAllowedHandle = !allowedHandles || allowedHandles.includes(edge.sourceHandle || '');
          shouldBeHidden = willCollapse && isAllowedHandle;
        } else if (isFromDescendant || isToDescendant) {
          shouldBeHidden = willCollapse;
        }

        if (shouldBeHidden) {
          return { ...edge, hidden: true };
        }
        
        // If uncollapsing, we should only show edges that connect visible nodes
        if (!willCollapse) {
           // If it's an edge from/to the subtree we are showing, unhide it
           // EXCEPT if it's from the root and its handle was NOT in the original allowedHandles
           if (isFromRoot) {
             const isAllowedHandle = !allowedHandles || allowedHandles.includes(edge.sourceHandle || '');
             if (isAllowedHandle) return { ...edge, hidden: false };
           } else if (isFromDescendant || isToDescendant) {
             return { ...edge, hidden: false };
           }
        }

        return edge;
      });

      return { nodes: updatedNodes, edges: updatedEdges };
    });
  },

  updateCrewAgentOrder: (crewId: string, newOrder: string[]) => {
    set((state: AppState) => ({
      nodes: state.nodes.map((node: AppNode) => {
        if (node.id === crewId && node.type === 'crew') {
          return { ...node, data: { ...node.data, agentOrder: newOrder } } as AppNode;
        }
        return node;
      }),
    }));
  },

  updateCrewTaskOrder: (crewId: string, newOrder: string[]) => {
    set((state: AppState) => ({
      nodes: state.nodes.map((node: AppNode) => {
        if (node.id === crewId && node.type === 'crew') {
          return { ...node, data: { ...node.data, taskOrder: newOrder } } as AppNode;
        }
        return node;
      }),
    }));
  },
  
  updateAgentTaskOrder: (agentId: string, newOrder: string[]) => {
    set((state: AppState) => ({
      nodes: state.nodes.map((node: AppNode) => {
        if (node.id === agentId && node.type === 'agent') {
          return { ...node, data: { ...node.data, taskOrder: newOrder } } as AppNode;
        }
        return node;
      }),
    }));
  },

  updateStateConnection: (nodeId: string, stateId: string | null, showLine: boolean, fieldKey?: string | null) => {
    set((state: AppState) => {
      const { nodes, edges } = state;
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return state;

      // 1. Update node data
      const nextNodes = nodes.map((n: AppNode) => {
        if (n.id === nodeId) {
          const newData = { ...n.data };
          if (stateId) {
            newData.selectedStateId = stateId;
            if (fieldKey) {
              newData.selectedStateKey = fieldKey;
            } else {
              delete newData.selectedStateKey;
            }
          } else {
            delete newData.selectedStateId;
            delete newData.selectedStateKey;
          }
          newData.showStateConnections = showLine;
          return { ...n, data: newData } as AppNode;
        }
        return n;
      });

      // 2. Manage edges
      const nextEdges = edges.filter(e => {
        // Always remove the auto-edge for this node
        if (e.id === `auto-state-${nodeId}`) return false;
        
        // Remove ANY manual edges between this node and state nodes
        const sourceIsState = nodes.find(n => n.id === e.source)?.type === 'state';
        const targetIsState = nodes.find(n => n.id === e.target)?.type === 'state';
        
        if (node.type === 'crew' && e.target === nodeId && sourceIsState) return false;
        if (node.type === 'agent' && e.source === nodeId && targetIsState) return false;
        
        return true;
      });

      // If a state is selected, add the new edge
      if (stateId) {
        const stateNode = nodes.find(n => n.id === stateId);
        if (stateNode) {
          let newEdge: AppEdge;
          
          if (node.type === 'crew') {
            // State -> Crew
            newEdge = {
              id: `auto-state-${nodeId}`,
              source: stateId,
              target: nodeId,
              sourceHandle: 'state-out',
              targetHandle: 'state-in',
              type: 'deletable',
              hidden: !showLine,
              animated: true,
              style: { stroke: '#a855f7', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' }
            } as AppEdge;
          } else {
            // Agent -> State
            newEdge = {
              id: `auto-state-${nodeId}`,
              source: nodeId,
              target: stateId,
              sourceHandle: 'data-out',
              targetHandle: fieldKey ? `field-in-${fieldKey}` : 'field-in-default', // Fallback to a default if key missing, though UI should prevent this
              type: 'deletable',
              hidden: !showLine,
              animated: true,
              style: { stroke: '#a855f7', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' }
            } as AppEdge;
          }
          nextEdges.push(newEdge);
        }
      }

      return { nodes: nextNodes, edges: nextEdges };
    });
  },

  validateGraph: () => {
    const state = get();
    const errors: Record<string, string[]> = {};
    let isValid = true;

    for (const node of state.nodes) {
      const currentErrors: string[] = [];

      if (node.type === 'crew') {
        const hasAgents = state.edges.some((e) => e.source === node.id);
        if (!hasAgents) currentErrors.push('Missing connected Agent');
      } else if (node.type === 'agent') {
        const data = node.data as AgentNodeData;
        if (!data.name?.trim()) currentErrors.push('Missing Name');
        if (!data.role?.trim()) currentErrors.push('Missing Role');
        if (!data.goal?.trim()) currentErrors.push('Missing Goal');
        if (!data.backstory?.trim()) currentErrors.push('Missing Backstory');
        const hasTasks = state.edges.some((e) => e.source === node.id);
        if (!hasTasks) currentErrors.push('Missing connected Task');
      } else if (node.type === 'task') {
        const data = node.data as TaskNodeData;
        if (!data.name?.trim()) currentErrors.push('Missing Name');
        if (!data.description?.trim()) currentErrors.push('Missing Description');
        if (!data.expected_output?.trim()) currentErrors.push('Missing Expected Output');
      } else if (node.type === 'webhook') {
        const data = node.data as WebhookNodeData;
        if (!data.name?.trim()) currentErrors.push('Missing Name');
      }

      if (currentErrors.length > 0) {
        errors[node.id] = currentErrors;
        isValid = false;
      }
    }

    set({ nodeErrors: errors });
    return isValid;
  },

  setExecutionResult: (result: string | null) => set({ executionResult: result }),

  resetProject: () => {
    set({
      nodes: [],
      edges: [],
      nodeStatuses: {},
      nodeErrors: {},
      nodeWarnings: {},
      executionResult: null,
      messages: INITIAL_CHAT_MESSAGES,
      activeNodeId: null,
      currentProjectId: null,
      currentProjectName: null,
      currentProjectDescription: null,
      isDirty: false,
      canvasLayout: 'vertical'
    });
  },

  setMessages: (messagesOrFn: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    if (typeof messagesOrFn === 'function') {
      set((state) => ({ messages: messagesOrFn(state.messages) }));
    } else {
      set({ messages: messagesOrFn });
    }
  },

  resetExecutionVisuals: () => {
    set((state: AppState) => ({
      nodeStatuses: {},
      nodeErrors: {},
      edges: state.edges.map(edge => ({
        ...edge,
        animated: true,
        // IDLE STATE: Blue Dashed + Arrow
        style: { ...edge.style, stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5', opacity: 1 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
      })),
      nodes: state.nodes.map(node => ({
        ...node,
        data: { 
          ...node.data, 
          status: undefined, 
          executedRoute: undefined,
          isDimmed: false
        }
      })) as AppNode[]
    }));
  },

  finalizeExecutionVisuals: () => {
    set((state: AppState) => {
      const { nodeStatuses, edges, nodes } = state;
      
      // 1. Identify which nodes are part of the executed path (connected to green edges)
      const nodesWithGreenConnections = new Set<string>();
      edges.forEach(edge => {
        if (edge.style?.stroke === '#10b981') {
          nodesWithGreenConnections.add(edge.source);
          nodesWithGreenConnections.add(edge.target);
        }
      });

      return {
        // FINISHED STATE: Dim unexecuted paths and nodes
        edges: edges.map(edge => {
           const isExecuted = edge.style?.stroke === '#10b981';
           if (isExecuted) {
             return {
               ...edge,
               animated: false,
               style: { ...edge.style, strokeDasharray: '5 5' } // Success Trail
             };
           } else {
             return {
               ...edge,
               animated: false,
               style: { ...edge.style, stroke: '#cbd5e1', opacity: 0.3 } // Faded unexecuted
             };
           }
        }),
        nodes: nodes.map(node => {
          const status = nodeStatuses[node.id];
          const isSuccessful = 
            status === 'success' || 
            status === 'running' || 
            !!node.data.executedRoute || 
            nodesWithGreenConnections.has(node.id);

          if (!isSuccessful) {
            return { ...node, data: { ...node.data, isDimmed: true } };
          }
          return node;
        }) as AppNode[]
      };
    });
  },

  

  focusNodeTree: (nodeId: string | null) => {
    set((state: AppState) => {
      if (!nodeId) {
        return {
          focusedTreeRootId: null,
          nodes: state.nodes.map(node => ({
            ...node,
            data: { ...node.data, isDimmed: false, isTreeRoot: false }
          })) as AppNode[],
          edges: state.edges.map(edge => ({
            ...edge,
            data: { ...edge.data, isDimmed: false }
          }))
        };
      }

      const descendants = getDescendantsToHide(nodeId, state.edges);
      const treeNodeIds = new Set([nodeId, ...descendants]);

      return {
        focusedTreeRootId: nodeId,
        nodes: state.nodes.map(node => ({
          ...node,
          data: { 
            ...node.data, 
            isDimmed: !treeNodeIds.has(node.id),
            isTreeRoot: node.id === nodeId
          }
        })) as AppNode[],
        edges: state.edges.map(edge => ({
          ...edge,
          data: { 
            ...edge.data, 
            // Highlight ONLY if source is part of the tree 
            // AND target is NOT the root node (blocks incoming connections to the start of focus)
            isDimmed: !treeNodeIds.has(edge.source) || (edge.target === nodeId && edge.source !== nodeId)
          }
        }))
      };
    });
  },

  focusEdge: (edgeId: string | null) => {
    set((state: AppState) => {
      if (!edgeId) {
        return {
          nodes: state.nodes.map(node => ({
            ...node,
            data: { ...node.data, isDimmed: false }
          })) as AppNode[],
          edges: state.edges.map(edge => ({
            ...edge,
            data: { ...edge.data, isDimmed: false }
          }))
        };
      }

      const edge = state.edges.find(e => e.id === edgeId);
      if (!edge) return {};

      const sourceId = edge.source;
      const targetId = edge.target;

      return {
        nodes: state.nodes.map(node => ({
          ...node,
          data: { 
            ...node.data, 
            isDimmed: node.id !== sourceId && node.id !== targetId 
          }
        })) as AppNode[],
        edges: state.edges.map(e => ({
          ...e,
          data: { ...e.data, isDimmed: e.id !== edgeId }
        }))
      };
    });
  },

  clearDimmedState: () => {
    set((state: AppState) => ({
      nodes: state.nodes.map(node => ({
        ...node,
        data: { ...node.data, isDimmed: false }
      })) as AppNode[]
    }));
  },

  clearChat: () => {
    set({ messages: INITIAL_CHAT_MESSAGES });
  },

  applyAutoLayout: () => {
    const { nodes, edges, canvasLayout } = get();
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, canvasLayout);
    set({ nodes: layoutedNodes, edges: layoutedEdges, isDirty: true });
  },
});
