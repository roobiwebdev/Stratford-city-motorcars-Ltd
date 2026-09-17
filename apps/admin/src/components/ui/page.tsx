"use client";

import type { Route } from "next";
import { ChevronLeft, CircleAlert, Info, RotateCcw, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { Button } from "./button";
import { GuardedLink } from "./unsaved";

/** Page frame: the same gutters and measure on every screen. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[88rem] px-4 pb-24 sm:px-6 lg:px-10", className)}>{children}</div>;
}

export type Crumb = { label: string; href?: string };

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  back,
  meta,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** A single parent link, shown above the title. */
  back?: Crumb & { href: string };
  /** Small facts under the title: status, last updated. */
  meta?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 pt-6 pb-6 sm:pt-8 lg:flex-row lg:items-end lg:justify-between lg:pb-8">
      <div className="min-w-0">
        {back ? (
          <GuardedLink
            href={back.href as Route}
            className="-ml-1 inline-flex h-8 items-center gap-1 pr-2 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden />
            {back.label}
          </GuardedLink>
        ) : eyebrow ? (
          <p className="admin-eyebrow">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 font-display text-[1.875rem] leading-[1.08] break-words sm:text-[2.25rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
        {meta ? <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 [&>*]:max-sm:flex-1">{actions}</div> : null}
    </header>
  );
}

/** A white panel with a hairline border and a small Roman-capital header. */
export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
  flush,
  id,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** No body padding: for lists whose rows run edge to edge. */
  flush?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-label={typeof title === "string" ? title : undefined}
      className={cn("scroll-mt-20 border border-border bg-surface-raised", className)}
    >
      {title || action ? (
        <header className="flex min-h-12 items-center justify-between gap-4 border-b border-border px-4 sm:px-5">
          {typeof title === "string" ? <h2 className="admin-eyebrow text-ink-600">{title}</h2> : title}
          {action}
        </header>
      ) : null}
      <div className={cn(!flush && "p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon,
  className,
  compact,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start border border-dashed border-border-strong bg-surface-raised/60",
        compact ? "px-5 py-6" : "px-6 py-10 sm:px-10 sm:py-14",
        className,
      )}
    >
      {icon ? <div className="mb-4 flex size-10 items-center justify-center border border-border text-ink-500 [&_svg]:size-5">{icon}</div> : null}
      <p className={cn("font-display", compact ? "text-lg" : "text-2xl")}>{title}</p>
      {body ? <div className="mt-2 max-w-[56ch] text-sm leading-relaxed text-muted-foreground">{body}</div> : null}
      {action ? <div className="mt-5 flex flex-wrap gap-2.5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse bg-ink-150 motion-reduce:animate-none", className)} />;
}

/** Placeholder rows while a list loads. Announced once, politely. */
export function LoadingRows({ rows = 6, label = "Loading", thumb = true }: { rows?: number; label?: string; thumb?: boolean }) {
  return (
    <div role="status" aria-live="polite" className="border border-border bg-surface-raised">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-b-0">
          {thumb ? <Skeleton className="h-11 w-16 shrink-0" /> : null}
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-2/5 max-w-60" />
            <Skeleton className="h-2.5 w-1/4 max-w-40" />
          </div>
          <Skeleton className="hidden h-5 w-20 sm:block" />
          <Skeleton className="hidden h-3 w-16 md:block" />
        </div>
      ))}
    </div>
  );
}

export function LoadingBlock({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col gap-4 pt-8", className)}>
      <span className="sr-only">{label}…</span>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-9 w-2/5" />
      <Skeleton className="h-4 w-3/5" />
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-72" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = "This could not be loaded",
  className,
}: {
  error: Error;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-start border border-destructive/35 bg-surface-raised px-6 py-7", className)}>
      <CircleAlert className="size-5 text-destructive" aria-hidden />
      <p className="mt-3 font-display text-xl">{title}</p>
      <p className="mt-1.5 max-w-[60ch] text-sm text-muted-foreground">{error.message}</p>
      {onRetry ? (
        <Button className="mt-5" size="sm" onClick={onRetry}>
          <RotateCcw aria-hidden />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** A quiet note with a rule on the left. */
export function Notice({
  title,
  children,
  tone = "info",
  action,
  className,
}: {
  title?: ReactNode;
  children?: ReactNode;
  tone?: "info" | "warning" | "danger";
  action?: ReactNode;
  className?: string;
}) {
  const Icon = tone === "info" ? Info : tone === "warning" ? TriangleAlert : CircleAlert;
  return (
    <div
      role={tone === "info" ? undefined : "note"}
      className={cn(
        "flex flex-col gap-3 border-l-2 px-4 py-3 sm:flex-row sm:items-start",
        tone === "info" && "border-ink-400 bg-ink-100/70",
        tone === "warning" && "border-brass bg-brass/8",
        tone === "danger" && "border-destructive bg-destructive/6",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <Icon
          aria-hidden
          className={cn(
            "mt-0.5 size-4 shrink-0",
            tone === "info" && "text-ink-500",
            tone === "warning" && "text-brass-deep",
            tone === "danger" && "text-destructive",
          )}
        />
        <div className="min-w-0 text-[0.8125rem] leading-relaxed text-ink-700">
          {title ? <p className="font-medium text-foreground">{title}</p> : null}
          {children ? <div className={title ? "mt-0.5" : ""}>{children}</div> : null}
        </div>
      </div>
      {action ? <div className="shrink-0 pl-7 sm:pl-0">{action}</div> : null}
    </div>
  );
}

/** Label/value rows for detail screens. */
export function DefinitionList({
  items,
  className,
  stacked,
}: {
  items: { label: string; value: ReactNode; hidden?: boolean }[];
  className?: string;
  /** Label above value — for narrow side panels, where long emails need the full width. */
  stacked?: boolean;
}) {
  return (
    <dl className={cn("divide-y divide-border", className)}>
      {items
        .filter((item) => !item.hidden)
        .map((item) => (
          <div key={item.label} className={cn("py-2.5 first:pt-0 last:pb-0", stacked ? "flex flex-col gap-1" : "grid grid-cols-[minmax(0,7.5rem)_1fr] gap-4")}>
            <dt className="admin-label pt-0.5">{item.label}</dt>
            <dd data-numeric className="min-w-0 text-sm [overflow-wrap:anywhere]">
              {item.value === null || item.value === undefined || item.value === "" ? (
                <span className="text-ink-500">Not recorded</span>
              ) : (
                item.value
              )}
            </dd>
          </div>
        ))}
    </dl>
  );
}

/** A stat for a hairline grid of figures. */
export function Metric({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  tone?: "attention";
}) {
  const content = (
    <>
      <span className="admin-label flex items-center gap-2">
        {tone === "attention" ? <span aria-hidden className="size-1.5 bg-brass" /> : null}
        {label}
      </span>
      <span data-numeric className="mt-2 block font-display text-[2rem] leading-none sm:text-[2.25rem]">
        {value}
      </span>
      {hint ? <span className="mt-2 block text-xs text-muted-foreground">{hint}</span> : null}
    </>
  );
  return (
    <div className="bg-surface-raised">
      {href ? (
        <GuardedLink href={href as Route} className="block h-full p-4 transition-colors hover:bg-ink-50 sm:p-5">
          {content}
        </GuardedLink>
      ) : (
        <div className="h-full p-4 sm:p-5">{content}</div>
      )}
    </div>
  );
}
