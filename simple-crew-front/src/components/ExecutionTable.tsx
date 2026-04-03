import React from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  createColumnHelper,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState
} from '@tanstack/react-table';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Play, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  MessageSquare
} from 'lucide-react';
import type { Execution } from '../types/store.types';

interface ExecutionTableProps {
  data: Execution[];
  onViewDetails: (execution: Execution) => void;
  onReRun: (execution: Execution) => void;
}

const columnHelper = createColumnHelper<Execution>();

export const ExecutionTable: React.FC<ExecutionTableProps> = ({ data, onViewDetails, onReRun }) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns = [
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => {
        const status = info.getValue();
        if (status === 'success') {
          return (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full w-fit">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs capitalize">Success</span>
            </div>
          );
        }
        if (status === 'error') {
          return (
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-900/20 px-2.5 py-1 rounded-full w-fit">
              <XCircle className="w-4 h-4" />
              <span className="text-xs capitalize">Error</span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-full w-fit animate-pulse">
            <Clock className="w-4 h-4" />
            <span className="text-xs capitalize">Running</span>
          </div>
        );
      },
    }),
    columnHelper.accessor('trigger_type', {
      header: 'Trigger',
      cell: info => (
        <div className="flex items-center gap-2 text-brand-text">
          {info.getValue() === 'webhook' ? (
            <Zap className="w-4 h-4 text-amber-500" />
          ) : (
            <MessageSquare className="w-4 h-4 text-sky-500" />
          )}
          <span className="text-sm capitalize">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('timestamp', {
      header: 'Date',
      cell: info => {
        const date = new Date(info.getValue());
        return (
          <div className="text-brand-muted text-sm">
            {new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }).format(date)}
          </div>
        );
      },
    }),
    columnHelper.accessor('duration', {
      header: 'Duration',
      cell: info => {
        const duration = info.getValue();
        if (duration === undefined || duration === null) return <span className="text-brand-muted">-</span>;
        return <span className="text-brand-text text-sm font-mono">{duration.toFixed(2)}s</span>;
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: info => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onViewDetails(info.row.original)}
            className="p-2 text-brand-muted hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onReRun(info.row.original)}
            className="p-2 text-brand-muted hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
            title="Re-run Snapshot"
          >
            <Play className="w-4 h-4" />
          </button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="w-full">
      <div className="overflow-hidden border border-brand-border rounded-xl bg-brand-card shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-brand-bg/50 border-b border-brand-border">
                {headerGroup.headers.map(header => (
                  <th 
                    key={header.id} 
                    className="px-6 py-4 text-xs font-bold text-brand-muted uppercase tracking-wider cursor-pointer hover:text-brand-text transition-colors"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' 🔼',
                        desc: ' 🔽',
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-brand-border">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <tr 
                  key={row.id} 
                  className="hover:bg-brand-bg/30 transition-colors group cursor-pointer"
                  onClick={() => onViewDetails(row.original)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-brand-muted italic">
                  No executions found for this project.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="flex items-center gap-2 text-sm text-brand-muted">
            <span>Page</span>
            <span className="font-bold text-brand-text">
              {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-2 border border-brand-border rounded-lg hover:bg-brand-card disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              className="p-2 border border-brand-border rounded-lg hover:bg-brand-card disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
