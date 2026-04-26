import { useMemo } from 'react';
import { useStore } from '../store/index';
import type { AppState } from '../types/store.types';
import type { StateNodeData, SchemaNodeData, CrewNodeData } from '../types/nodes.types';

export interface VariableInfo {
  type: string;
  children: Record<string, VariableInfo> | null;
}

export type VariableTree = Record<string, VariableInfo>;

export const useGraphVariables = () => {
  const nodes = useStore((state: AppState) => state.nodes);
  const framework = useStore((state: AppState) => state.currentProjectFramework);

  const variables = useMemo((): VariableTree => {
    const tree: VariableTree = {};

    if (framework === 'langgraph') {
      const stateNode = nodes.find(n => n.type === 'state');
      const schemaNodes = nodes.filter(n => n.type === 'schema');

      if (stateNode) {
        const stateData = stateNode.data as StateNodeData;
        const fields = stateData.fields || [];

        fields.forEach(field => {
          const schemaNode = schemaNodes.find(
            s => (s.data as SchemaNodeData).name === field.type
          );

          if (schemaNode) {
            const schemaData = schemaNode.data as SchemaNodeData;
            const children: VariableTree = {};
            
            (schemaData.fields || []).forEach(sf => {
              children[sf.key] = {
                type: sf.type,
                children: null // For now, we only support one level of schema nesting as per SchemaField definition
              };
            });

            tree[field.key] = {
              type: field.type,
              children
            };
          } else {
            tree[field.key] = {
              type: field.type,
              children: null
            };
          }
        });
      }
    } else {
      // CrewAI Framework
      const crewNode = nodes.find(n => n.type === 'crew');
      if (crewNode) {
        const crewData = crewNode.data as CrewNodeData;
        const inputs = crewData.inputs || {};
        const keys = Object.keys(inputs).filter(k => !k.startsWith('input_'));
        keys.forEach(key => {
          tree[key] = {
            type: 'string',
            children: null
          };
        });
      }
    }

    return tree;
  }, [nodes, framework]);

  return { variables, framework };
};
