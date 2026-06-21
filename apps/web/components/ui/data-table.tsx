"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { Skeleton } from "./skeleton";

export interface DataTableColumn<T> {
  readonly id: string;
  readonly header: string;
  readonly accessor: (row: T) => ReactNode;
  readonly sortValue?: (row: T) => string | number;
  readonly filterValue?: (row: T) => string;
  readonly className?: string;
}

interface DataTableProps<T> {
  columns: readonly DataTableColumn<T>[];
  data: readonly T[];
  getRowId: (row: T) => string;
  selectedId?: string | null;
  onSelectRow?: (row: T) => void;
  getRowAriaLabel?: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  caption?: string;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

type SortDir = "asc" | "desc";

export function DataTable<T>({
  columns,
  data,
  getRowId,
  selectedId,
  onSelectRow,
  getRowAriaLabel,
  searchable = true,
  searchPlaceholder = "Search…",
  emptyTitle = "No results",
  emptyDescription = "Try adjusting your search or filters.",
  caption,
  loading = false,
  error = null,
  className,
}: DataTableProps<T>): ReactNode {
  const [search, setSearch] = useState("");
  const [sortColumnId, setSortColumnId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let rows = [...data];

    if (query) {
      rows = rows.filter((row) =>
        columns.some((col) => {
          const filterText = col.filterValue?.(row) ?? String(col.accessor(row));
          return filterText.toLowerCase().includes(query);
        }),
      );
    }

    if (sortColumnId) {
      const col = columns.find((c) => c.id === sortColumnId);
      if (col?.sortValue) {
        rows.sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          const cmp =
            typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv));
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
    }

    return rows;
  }, [columns, data, search, sortColumnId, sortDir]);

  function toggleSort(columnId: string, sortable: boolean): void {
    if (!sortable) return;
    if (sortColumnId === columnId) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumnId(columnId);
      setSortDir("asc");
    }
  }

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton className="h-9 w-full max-w-xs" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "rounded-lg border border-readiness-gap/30 bg-readiness-gap-bg p-4 text-sm text-readiness-gap",
          className,
        )}
        role="alert"
      >
        {error}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {searchable ? (
        <div className="relative max-w-xs">
          <Search
            className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex h-9 w-full rounded-md border border-input bg-surface py-1 ps-9 pe-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={searchPlaceholder}
          />
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-surface shadow-sm">
          <table className="w-full min-w-[480px] text-sm">
            {caption ? (
              <caption className="sr-only">{caption}</caption>
            ) : null}
            <thead className="border-b bg-muted/40 text-start">
              <tr>
                {columns.map((col) => {
                  const sortable = Boolean(col.sortValue);
                  const isActive = sortColumnId === col.id;
                  const sortHint = sortable
                    ? isActive
                      ? sortDir === "asc"
                        ? "sorted ascending"
                        : "sorted descending"
                      : "sortable"
                    : undefined;
                  return (
                    <th
                      key={col.id}
                      className={cn(
                        "px-3 py-2 font-medium text-muted-foreground",
                        sortable &&
                          "cursor-pointer select-none hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        col.className,
                      )}
                      tabIndex={sortable ? 0 : undefined}
                      onClick={() => toggleSort(col.id, sortable)}
                      onKeyDown={(e) => {
                        if (
                          sortable &&
                          (e.key === "Enter" || e.key === " ")
                        ) {
                          e.preventDefault();
                          toggleSort(col.id, sortable);
                        }
                      }}
                      aria-sort={
                        isActive
                          ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                      aria-label={
                        sortHint ? `${col.header}, ${sortHint}` : col.header
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.header}
                        {sortable && isActive ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                          )
                        ) : null}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const id = getRowId(row);
                const selected = selectedId === id;
                return (
                  <tr
                    key={id}
                    tabIndex={onSelectRow ? 0 : undefined}
                    onClick={() => onSelectRow?.(row)}
                    onKeyDown={(e) => {
                      if (onSelectRow && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        onSelectRow(row);
                      }
                    }}
                    className={cn(
                      "border-b last:border-0 motion-safe transition-colors",
                      onSelectRow &&
                        "cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      selected && "bg-brand-gold/10",
                    )}
                    aria-selected={onSelectRow ? selected : undefined}
                    aria-label={
                      onSelectRow && getRowAriaLabel
                        ? getRowAriaLabel(row)
                        : undefined
                    }
                  >
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={cn("px-3 py-2.5 align-middle", col.className)}
                      >
                        {col.accessor(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
