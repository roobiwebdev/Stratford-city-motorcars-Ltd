"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

/**
 * Admin table: a real <table> from `md` up, with sortable headers and row
 * actions, and a stacked card list below it — a seven-column table squeezed
 * onto a phone helps nobody.
 */

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Present when the column can be sorted. */
  sortValue?: (row: T) => string | number;
  className?: string;
  /** Hidden below this breakpoint; the card view covers phones. */
  minWidth?: "lg" | "xl";
  align?: "left" | "right";
  /** Visually hidden header, still read aloud. */
  hideHeader?: boolean;
};

export type SortState = { id: string; direction: "asc" | "desc" };

const hiddenBelow = { lg: "hidden lg:table-cell", xl: "hidden xl:table-cell" } as const;

export function DataTable<T>({
  caption,
  rows,
  columns,
  rowKey,
  renderCard,
  actions,
  initialSort,
  sortable = true,
  rowClassName,
  busy,
}: {
  caption: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  renderCard: (row: T) => ReactNode;
  actions?: (row: T) => ReactNode;
  initialSort?: SortState;
  /** Off when the server orders the rows (paged lists). */
  sortable?: boolean;
  rowClassName?: (row: T) => string;
  /** Dims the rows while a refetch is in flight, keeping the old ones readable. */
  busy?: boolean;
}) {
  const [sort, setSort] = useState<SortState | undefined>(initialSort);

  const column = sortable && sort ? columns.find((item) => item.id === sort.id) : undefined;
  const sorted = column?.sortValue
    ? [...rows].sort((a, b) => {
        const x = column.sortValue!(a);
        const y = column.sortValue!(b);
        const result = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
        return sort!.direction === "asc" ? result : -result;
      })
    : rows;

  const toggle = (id: string) =>
    setSort((current) => (current?.id === id ? { id, direction: current.direction === "asc" ? "desc" : "asc" } : { id, direction: "asc" }));

  return (
    <div className={cn("border border-border bg-surface-raised transition-opacity duration-200", busy && "opacity-60")} aria-busy={busy || undefined}>
      <table className="hidden w-full border-collapse text-left md:table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border bg-surface/60">
            {columns.map((item) => {
              const active = sort?.id === item.id;
              return (
                <th
                  key={item.id}
                  scope="col"
                  aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
                  className={cn(
                    "admin-label h-10 px-3 first:pl-4 last:pr-4",
                    item.minWidth ? hiddenBelow[item.minWidth] : "",
                    item.align === "right" && "text-right",
                    item.className,
                  )}
                >
                  {item.hideHeader ? (
                    <span className="sr-only">{item.header}</span>
                  ) : sortable && item.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      className={cn("inline-flex items-center gap-1.5 uppercase transition-colors hover:text-foreground", active && "text-foreground")}
                    >
                      {item.header}
                      {active ? (
                        sort.direction === "asc" ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" aria-hidden />
                      )}
                    </button>
                  ) : (
                    item.header
                  )}
                </th>
              );
            })}
            {actions ? (
              <th scope="col" className="w-12 pr-2">
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              className={cn(
                "group relative border-b border-border transition-colors duration-150 last:border-b-0 hover:bg-ink-50",
                rowClassName?.(row),
              )}
            >
              {columns.map((item) => (
                <td
                  key={item.id}
                  className={cn(
                    "px-3 py-3 align-middle text-sm first:pl-4 last:pr-4",
                    item.minWidth ? hiddenBelow[item.minWidth] : "",
                    item.align === "right" && "text-right",
                    item.className,
                  )}
                >
                  {item.cell(row)}
                </td>
              ))}
              {actions ? <td className="relative z-10 py-2 pr-2 text-right align-middle">{actions(row)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-border md:hidden" aria-label={caption}>
        {sorted.map((row) => (
          <li key={rowKey(row)} className={cn("relative flex items-start gap-2 px-4 py-3.5 active:bg-ink-50", rowClassName?.(row))}>
            <div className="min-w-0 flex-1">{renderCard(row)}</div>
            {actions ? <div className="relative z-10 -mt-1.5 -mr-2 shrink-0">{actions(row)}</div> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The primary link in a row. Its ::after covers the whole row, so the row is
 * one click target while the markup stays a single link.
 */
export const rowLinkClass =
  "font-medium text-foreground after:absolute after:inset-0 after:content-[''] hover:underline hover:decoration-brass hover:underline-offset-4 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ink-900";
