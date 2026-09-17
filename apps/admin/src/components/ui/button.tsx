"use client";

import type { Route } from "next";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { GuardedLink } from "./unsaved";

/**
 * Admin controls: the website's button grammar — square 2px corners, tracked
 * capitals, fill-inverting hover — at working size. Ink fill is kept for the
 * one primary action in a view; brass is never a button colour here, only an
 * accent.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-sm border font-sans font-medium uppercase " +
  "tracking-[0.1em] whitespace-nowrap select-none transition-[background-color,color,border-color] duration-200 " +
  "ease-[var(--ease-out-expo)] active:translate-y-px disabled:pointer-events-none disabled:opacity-45 " +
  "aria-disabled:pointer-events-none aria-disabled:opacity-45 [&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  primary: "border-ink-950 bg-ink-950 text-bone hover:border-ink-700 hover:bg-ink-700",
  secondary: "border-border-strong bg-surface-raised text-foreground hover:border-ink-950 hover:bg-ink-950 hover:text-bone",
  ghost: "border-transparent bg-transparent text-ink-700 hover:bg-ink-100 hover:text-foreground",
  danger: "border-destructive/45 bg-surface-raised text-destructive hover:border-destructive hover:bg-destructive hover:text-bone",
};

const sizes: Record<ButtonSize, string> = {
  // 44px on touch screens, denser where there is a precise pointer.
  sm: "h-11 px-3 text-[0.625rem] sm:h-8 [&_svg]:size-3.5",
  md: "h-11 px-4 text-[0.6875rem] sm:h-10 [&_svg]:size-4",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "secondary",
  size = "md",
  busy,
  className,
  children,
  type = "button",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a working state and blocks a second press. */
  busy?: boolean;
}) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      {...props}
    >
      {busy ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  className,
  children,
  external,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  /** Opens in a new tab, e.g. the car's page on the website. */
  external?: boolean;
}) {
  const classes = buttonClass(variant, size, className);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <GuardedLink href={href as Route} className={classes}>
      {children}
    </GuardedLink>
  );
}

/** Icon-only button. `label` is required: it is the accessible name and the tooltip. */
export function IconButton({
  label,
  size = "md",
  className,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: ButtonSize }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm text-ink-600 transition-colors duration-200",
        "hover:bg-ink-100 hover:text-foreground disabled:pointer-events-none disabled:opacity-35 [&_svg]:shrink-0",
        size === "sm" ? "size-11 sm:size-8 [&_svg]:size-3.5" : "size-11 sm:size-10 [&_svg]:size-4",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:animate-none",
        className,
      )}
    />
  );
}
