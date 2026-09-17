"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@Stratford-city-motorcars-Ltd/ui/components/tooltip";
import type { ReactElement, ReactNode } from "react";

/**
 * A tooltip that repeats a control's name — for icon-only controls such as
 * the collapsed sidebar. The trigger must already have its own accessible name.
 */
export function Hint({
  content,
  children,
  side = "top",
  disabled,
}: {
  content: ReactNode;
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  disabled?: boolean;
}) {
  if (disabled) return children;
  return (
    <Tooltip>
      <TooltipTrigger delay={250} render={children} />
      <TooltipContent
        side={side}
        sideOffset={8}
        className="rounded-none bg-ink-950 px-2.5 py-1.5 font-sans text-xs text-bone [&>svg]:hidden"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
