import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { Column, SortConfig, SortDirection } from "~/types";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  emptyTitle?: string;
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  emptyTitle = "Sin datos",
  emptyMessage = "No hay elementos para mostrar.",
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortConfig | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sort.key];
      const bVal = (b as Record<string, unknown>)[sort.key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [data, sort]);

  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-white shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
        <EmptyState title={emptyTitle} message={emptyMessage} />
      </div>
    );
  }

  return (
    <>
      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-xl bg-white shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 ${
                    col.sortable
                      ? "cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300"
                      : ""
                  }`}
                  onClick={() => {
                    if (!col.sortable) return;
                    setSort((prev) => {
                      if (prev?.key !== col.key)
                        return { key: col.key, direction: "asc" };
                      return prev.direction === "asc"
                        ? { key: col.key, direction: "desc" }
                        : null;
                    });
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <SortIcon
                        active={sort?.key === col.key}
                        direction={sort?.direction}
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr
                key={keyExtractor(item)}
                className="border-b border-gray-100 dark:border-gray-800"
              >
                {columns.map((col) => {
                  const value = (item as Record<string, unknown>)[col.key];
                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-gray-900 dark:text-gray-100 ${col.className ?? ""}`}
                    >
                      {col.render ? col.render(item) : String(value ?? "")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {sorted.map((item) => (
          <Card key={keyExtractor(item)}>
            <dl className="grid grid-cols-2 gap-2">
              {columns.map((col) => {
                const value = (item as Record<string, unknown>)[col.key];
                return (
                  <div
                    key={col.key}
                    className={
                      col.className?.includes("col-span-") ? col.className : ""
                    }
                  >
                    <dt className="text-xs text-gray-500 dark:text-gray-400">
                      {col.label}
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100">
                      {col.render ? col.render(item) : String(value ?? "")}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </Card>
        ))}
      </div>
    </>
  );
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction?: SortDirection;
}) {
  if (!active) return <ChevronDown size={14} className="text-gray-300" />;
  return direction === "asc" ? (
    <ArrowUp size={14} className="text-brand-red-coral" />
  ) : (
    <ArrowDown size={14} className="text-brand-red-coral" />
  );
}
