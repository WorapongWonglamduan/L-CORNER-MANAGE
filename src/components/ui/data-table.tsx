import * as React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export interface DataTableColumn<T> {
  /** Unique key for this column (also used as the React key for its cells). */
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  rowClassName?: string | ((row: T) => string);
}

/**
 * Generic list-page table: pass `columns` (header + a `cell` render function
 * per column) and `data`, it renders the <table> structure — every list
 * page previously hand-rolled its own <table>/<tr>/<td> markup with the
 * same Tailwind classes duplicated everywhere. Loading/empty states are
 * left to the caller (their text/icons differ per page), this only
 * renders the actual rows.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  rowClassName,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-600">
          <TableRow className="hover:bg-transparent border-b-0">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={`px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider h-auto ${
                  column.headerClassName ?? ""
                }`}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((row) => (
            <TableRow
              key={rowKey(row)}
              className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b-0 ${
                typeof rowClassName === "function"
                  ? rowClassName(row)
                  : rowClassName ?? ""
              }`}
            >
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={`px-6 py-4 whitespace-nowrap align-middle ${
                    column.cellClassName ?? ""
                  }`}
                >
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
