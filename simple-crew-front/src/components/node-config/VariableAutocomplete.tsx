import React, { useMemo } from 'react';
import { Plus, ListTree, Box, Braces, ChevronRight } from 'lucide-react';
import type { VariableTree, VariableInfo } from '../../hooks/useGraphVariables';

interface VariableAutocompleteProps {
  isOpen: boolean;
  filter: string;
  selectedIndex: number;
  anchorRect: DOMRect | null;
  cursorRect: { top: number; left: number; height: number } | null;
  variables: VariableTree;
  onSelect: (path: string) => void;
  setSelectedIndex: (index: number) => void;
}

export const VariableAutocomplete: React.FC<VariableAutocompleteProps> = ({
  isOpen,
  filter,
  selectedIndex,
  anchorRect,
  cursorRect,
  variables,
  onSelect,
  setSelectedIndex,
}) => {
  const { items, currentLevel } = useMemo(() => {
    // Determine path traversal
    const parts = filter.split('.');
    let currentTree = variables;
    let pathPrefix = '';
    let level: 'root' | 'nested' = 'root';

    // If filter contains dots, traverse down
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (currentTree[part] && currentTree[part].children) {
            currentTree = currentTree[part].children!;
            pathPrefix += part + '.';
            level = 'nested';
        } else {
            // Path broken, stay at current level
            break;
        }
    }

    const lastPart = parts[parts.length - 1].toLowerCase();
    const filteredItems = Object.entries(currentTree)
      .filter(([key]) => key.toLowerCase().includes(lastPart))
      .map(([key, info]) => ({
        key,
        path: pathPrefix + key,
        info
      }));

    return { items: filteredItems, currentLevel: level };
  }, [filter, variables]);

  if (!isOpen) return null;

  const getPosition = () => {
    // Priority 1: Use specific cursor coordinates
    if (cursorRect) {
      const spaceBelow = window.innerHeight - cursorRect.top - cursorRect.height;
      const dropdownHeight = 220;
      if (spaceBelow < dropdownHeight) {
        return { bottom: window.innerHeight - cursorRect.top + 4, left: Math.max(8, cursorRect.left), maxHeight: '200px' };
      }
      return { top: cursorRect.top + cursorRect.height + 4, left: Math.max(8, cursorRect.left), maxHeight: '200px' };
    }

    // Priority 2: Fallback to anchor element rect
    const spaceBelow = anchorRect ? window.innerHeight - anchorRect.bottom : 0;
    const dropdownHeight = 220;
    if (anchorRect && spaceBelow < dropdownHeight) {
      return { bottom: window.innerHeight - anchorRect.top + 4, left: anchorRect.left, maxHeight: '200px' };
    }
    return { top: (anchorRect?.bottom || 0) + 4, left: anchorRect?.left || 0, maxHeight: '200px' };
  };

  const getIcon = (info: VariableInfo) => {
    if (info.children) return <Braces className="w-3.5 h-3.5 text-indigo-500" />;
    if (info.type === 'list') return <ListTree className="w-3.5 h-3.5 text-emerald-500" />;
    return <Box className="w-3.5 h-3.5 text-blue-500" />;
  };

  return (
    <div 
      data-testid="suggestion-dropdown"
      className="fixed z-[100] bg-brand-card border border-brand-border rounded-xl shadow-2xl py-1.5 w-64 overflow-hidden animate-in fade-in zoom-in duration-150 backdrop-blur-md bg-opacity-90 dark:bg-opacity-90"
      style={getPosition()}
    >
      <div className="px-3 py-1.5 border-b border-brand-border mb-1 flex items-center justify-between">
        <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">
          {currentLevel === 'root' ? 'Available Variables' : 'Sub-fields'}
        </span>
        <span className="text-[9px] text-indigo-500 font-mono opacity-60">
            {filter ? `filter: ${filter}` : 'tree'}
        </span>
      </div>
      
      <div className="overflow-y-auto max-h-[160px] custom-scrollbar">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center" data-testid="no-suggestions">
            <Braces className="w-8 h-8 text-brand-border mx-auto mb-2 opacity-20" />
            <p className="text-[10px] text-brand-muted">No variables found</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <button
              key={item.path}
              data-testid={`suggestion-item-${item.key}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item.path);
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-all duration-200 group ${
                idx === selectedIndex 
                  ? 'bg-indigo-500/10 text-indigo-500' 
                  : 'text-brand-text hover:bg-brand-bg'
              }`}
            >
              <div className={`p-1 rounded-md transition-colors ${idx === selectedIndex ? 'bg-indigo-500/20' : 'bg-brand-bg'}`}>
                {getIcon(item.info)}
              </div>
              
              <div className="flex flex-col items-start overflow-hidden flex-1">
                <span className="truncate font-medium">{item.key}</span>
                <span className="text-[9px] opacity-60 font-mono truncate">{item.info.type}</span>
              </div>
  
              {item.info.children ? (
                  <ChevronRight className={`w-3 h-3 transition-transform ${idx === selectedIndex ? 'translate-x-0.5 opacity-100' : 'opacity-30'}`} />
              ) : (
                  <Plus className={`w-3 h-3 transition-transform ${idx === selectedIndex ? 'opacity-100' : 'opacity-0'}`} />
              )}
            </button>
          ))
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-brand-border mt-1 flex items-center gap-2 text-[9px] text-brand-muted italic">
          <div className="flex items-center gap-1">
              <span className="px-1 py-0.5 bg-brand-bg rounded border border-brand-border not-italic">TAB</span>
              <span>to select</span>
          </div>
          <div className="flex items-center gap-1">
              <span className="px-1 py-0.5 bg-brand-bg rounded border border-brand-border not-italic">.</span>
              <span>to traverse</span>
          </div>
      </div>
    </div>
  );
};
