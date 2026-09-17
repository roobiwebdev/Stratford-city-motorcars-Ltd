"use client";

import { ChevronDown } from "lucide-react";
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

/**
 * Form building blocks.
 *
 * `Field` owns the label, required marker, help text, character counter and
 * error, and hands its control the ids that connect them — so every input is
 * labelled, described and flagged without each form wiring it up.
 *
 * Selects are native, as on the website: on a phone the OS picker is faster
 * and more accessible than any custom dropdown.
 */

export type ControlProps = {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  "aria-required"?: true;
};

export function Field({
  label,
  required,
  description,
  error,
  counter,
  action,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  description?: ReactNode;
  error?: string;
  counter?: { length: number; max: number };
  /** A small control beside the label, e.g. "Suggest from title". */
  action?: ReactNode;
  className?: string;
  children: (control: ControlProps) => ReactNode;
}) {
  const id = useId();
  const describedBy = [error ? `${id}-error` : null, description ? `${id}-description` : null].filter(Boolean).join(" ");
  const over = counter ? counter.length > counter.max : false;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex min-h-5 items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[0.8125rem] font-medium text-ink-800">
          {label}
          {required ? (
            <>
              <span aria-hidden className="ml-1 text-brass-deep">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          ) : null}
        </label>
        {action}
      </div>
      <div className="mt-1.5">
        {children({
          id,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": describedBy || undefined,
          "aria-required": required ? true : undefined,
        })}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] leading-snug text-destructive">
          {error}
        </p>
      ) : null}
      {description || counter ? (
        <div className="mt-1.5 flex items-start justify-between gap-4">
          {description ? (
            <p id={`${id}-description`} className="text-xs leading-snug text-muted-foreground">
              {description}
            </p>
          ) : (
            <span />
          )}
          {counter ? (
            <span data-numeric className={cn("shrink-0 text-xs", over ? "text-destructive" : "text-muted-foreground")} aria-live="polite">
              {counter.length} / {counter.max}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export const controlClass =
  "w-full rounded-sm border border-input bg-surface-raised px-3 font-sans text-[0.9375rem] text-foreground sm:text-sm " +
  "placeholder:text-ink-500 transition-colors duration-150 hover:border-ink-400 " +
  "focus:border-ink-900 focus:outline-none focus-visible:outline-none focus:ring-1 focus:ring-ink-900 " +
  "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive " +
  "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500";

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, "h-11 sm:h-10", className)} {...props} />;
}

export function TextArea({ className, rows = 4, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cn(controlClass, "resize-y py-2.5 leading-relaxed", className)} {...props} />;
}

/**
 * Whole-number input that stores `null` for "not set" rather than 0, so an
 * unknown price or mileage never becomes a false figure.
 */
export function NumberInput({
  value,
  onValueChange,
  prefix,
  suffix,
  formatGroups = true,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "prefix" | "type"> & {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
  prefix?: string;
  suffix?: string;
  /** Thousands separators; off for years and similar. */
  formatGroups?: boolean;
}) {
  return (
    <div className="relative">
      {prefix ? (
        <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-500">
          {prefix}
        </span>
      ) : null}
      <input
        type="text"
        inputMode="numeric"
        value={value === null || value === undefined ? "" : formatGroups ? value.toLocaleString("en-GB") : String(value)}
        onChange={(event) => {
          const digits = event.target.value.replace(/[^\d]/g, "");
          onValueChange(digits === "" ? null : Math.min(Number(digits), Number.MAX_SAFE_INTEGER));
        }}
        className={cn(controlClass, "h-11 tabular-nums sm:h-10", prefix && "pl-7", suffix && "pr-14", className)}
        {...props}
      />
      {suffix ? (
        <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-500">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(controlClass, "h-11 cursor-pointer appearance-none pr-9 sm:h-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-500" />
    </div>
  );
}

export function Checkbox({
  label,
  description,
  checked,
  onChange,
  disabled,
  className,
}: {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <span className="relative mt-0.5 inline-flex size-4.5 shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={description ? `${id}-d` : undefined}
          className="peer size-4.5 cursor-pointer appearance-none rounded-[1px] border border-input bg-surface-raised transition-colors checked:border-ink-950 checked:bg-ink-950 hover:border-ink-500 disabled:cursor-not-allowed disabled:opacity-45"
        />
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute inset-0 m-auto size-3 text-bone opacity-0 transition-opacity peer-checked:opacity-100"
        >
          <path d="M3 8.5l3.5 3.5L13 5" />
        </svg>
      </span>
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-sm text-foreground">
          {label}
        </label>
        {description ? (
          <p id={`${id}-d`} className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A short set of mutually exclusive choices drawn as buttons — for fields
 * where seeing every option at once helps (Yes / No / Not known).
 */
export function ChoiceGroup<T extends string>({
  value,
  onChange,
  options,
  label,
  control,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  label: string;
  control?: ControlProps;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-describedby={control?.["aria-describedby"]}
      id={control?.id}
      className={cn("flex flex-wrap border border-input bg-surface-raised p-0.5", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-10 flex-1 px-3 text-[0.8125rem] whitespace-nowrap transition-colors sm:h-9",
              active ? "bg-ink-950 text-bone" : "text-ink-700 hover:bg-ink-100",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** A group of related fields in a form, with an optional heading. */
export function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2", className)}>{children}</div>;
}
