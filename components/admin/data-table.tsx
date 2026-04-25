import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: ReactNode;
  width?: string;
  align?: "left" | "right" | "center";
  render: (row: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  flagged?: (row: T) => boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "Sem registros.",
  onRowClick,
  flagged,
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
          <thead className="border-b border-border bg-[#F7FAF8] text-[11px] font-medium uppercase tracking-wider text-muted">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-4 py-3",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                  )}
                  style={{ width: c.width }}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const isFlagged = flagged?.(row);
                return (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "border-b border-border/70 last:border-b-0 transition-colors",
                      onRowClick && "cursor-pointer",
                      isFlagged
                        ? "bg-[#FBE1E1]/30 hover:bg-[#FBE1E1]/50"
                        : "hover:bg-brand-50/50",
                    )}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "px-4 py-3 align-middle",
                          c.align === "right" && "text-right",
                          c.align === "center" && "text-center",
                        )}
                      >
                        {c.render(row, i)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
