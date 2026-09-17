"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@Stratford-city-motorcars-Ltd/ui/components/dropdown-menu";
import { Ellipsis } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

export type MenuAction =
  | {
      label: string;
      icon?: ReactNode;
      onSelect: () => void;
      tone?: "default" | "danger";
      disabled?: boolean;
      /** Why it is unavailable, shown under the label. */
      reason?: string;
      hidden?: boolean;
    }
  | "separator";

/**
 * Row and page actions behind one "…" button. Arrow keys, Escape and focus
 * return come from Base UI's menu (packages/ui).
 */
export function ActionMenu({
  label,
  actions,
  trigger,
  align = "end",
}: {
  label: string;
  actions: MenuAction[];
  trigger?: ReactNode;
  align?: "start" | "end";
}) {
  const visible = actions.filter((action) => action === "separator" || !action.hidden);
  // Drop separators that would lead, trail or double up once items are hidden.
  const items = visible.filter(
    (action, i) => action !== "separator" || (i > 0 && i < visible.length - 1 && visible[i - 1] !== "separator"),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center rounded-sm text-ink-600 transition-colors hover:bg-ink-100 hover:text-foreground data-[popup-open]:bg-ink-100 data-[popup-open]:text-foreground",
          trigger ? "h-11 gap-2 border border-border-strong bg-surface-raised px-3 text-[0.6875rem] font-medium tracking-[0.1em] uppercase sm:h-10" : "size-11 sm:size-9",
        )}
      >
        {trigger ?? <Ellipsis className="size-4" aria-hidden />}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-auto min-w-56 rounded-none border border-border-strong bg-surface-raised p-1 text-foreground shadow-[0_16px_40px_rgba(10,10,11,0.16)] ring-0"
      >
        {items.map((action, i) =>
          action === "separator" ? (
            <DropdownMenuSeparator key={`separator-${i}`} className="mx-0 my-1 bg-border" />
          ) : (
            <DropdownMenuItem
              key={action.label}
              disabled={action.disabled}
              onClick={action.onSelect}
              className={cn(
                "min-h-11 gap-2.5 px-3 py-2 font-sans text-[0.8125rem] focus:bg-ink-100 sm:min-h-9",
                action.tone === "danger"
                  ? "text-destructive focus:text-destructive [&_svg]:text-destructive"
                  : "text-ink-800 focus:text-foreground [&_svg]:text-ink-500",
              )}
            >
              {action.icon}
              <span className="flex flex-col">
                <span>{action.label}</span>
                {action.disabled && action.reason ? <span className="text-[0.6875rem] text-ink-500">{action.reason}</span> : null}
              </span>
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
