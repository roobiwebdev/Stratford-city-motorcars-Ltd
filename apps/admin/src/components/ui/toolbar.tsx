"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useId, type ReactNode } from "react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { Select, controlClass } from "./form";

/** The row of search and filters above a list. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-2.5 pb-4 sm:flex-row sm:flex-wrap sm:items-center", className)}>{children}</div>;
}

export function SearchField({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("relative w-full sm:w-80", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-500" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? label}
        autoComplete="off"
        className={cn(controlClass, "h-11 pr-10 pl-9 sm:h-10 [&::-webkit-search-cancel-button]:appearance-none")}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center text-ink-500 hover:text-foreground sm:size-8"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  allLabel,
  className,
}: {
  label: string;
  value: T | "all";
  onChange: (value: T | "all") => void;
  options: readonly { value: T; label: string }[];
  allLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("w-full sm:w-48", className)}>
      <Select aria-label={label} value={value} onChange={(event) => onChange(event.target.value as T | "all")}>
        <option value="all">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

/**
 * Status tabs with counts — the pipeline at a glance and one tap to narrow
 * it. Scrolls sideways on a phone rather than wrapping.
 */
export function SegmentedFilter<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; count?: number; attention?: boolean }[];
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("-mx-4 overflow-x-auto px-4 scrollbar-thin sm:mx-0 sm:px-0", className)}>
      <div className="flex min-w-max border-b border-border">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative -mb-px flex h-11 items-center gap-2 border-b-2 px-3.5 text-[0.8125rem] transition-colors duration-150",
                active ? "border-ink-950 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
              {option.count !== undefined ? (
                <span
                  data-numeric
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center px-1 text-[0.6875rem]",
                    option.attention && option.count > 0 ? "bg-brass text-ink-950" : active ? "bg-ink-100 text-ink-800" : "text-ink-500",
                  )}
                >
                  {option.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** "12 cars" — announced when filters change. */
export function ResultCount({ count, total, noun }: { count: number; total?: number; noun: [string, string] }) {
  return (
    <p className="text-[0.8125rem] text-muted-foreground sm:ml-auto" aria-live="polite" data-numeric>
      {count} {count === 1 ? noun[0] : noun[1]}
      {total !== undefined && total !== count ? ` of ${total}` : ""}
    </p>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
  noun,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  noun: [string, string];
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-4 pt-4">
      <p className="text-[0.8125rem] text-muted-foreground" data-numeric>
        {from}–{to} of {total} {total === 1 ? noun[0] : noun[1]}
      </p>
      {pages > 1 ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="inline-flex size-11 items-center justify-center border border-border bg-surface-raised text-ink-700 transition-colors hover:border-ink-400 disabled:opacity-40 sm:size-9"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <span className="px-2 text-[0.8125rem]" data-numeric>
            {page} / {pages}
          </span>
          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={page >= pages}
            aria-label="Next page"
            className="inline-flex size-11 items-center justify-center border border-border bg-surface-raised text-ink-700 transition-colors hover:border-ink-400 disabled:opacity-40 sm:size-9"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
