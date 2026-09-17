"use client";

import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { Toaster, toast } from "sonner";

/**
 * Toasts confirm what actually happened. A toast never says "saved" for a
 * request that has not come back successfully.
 */
export const notify = {
  success(message: string, description?: string) {
    toast.success(message, { description });
  },
  error(message: string, description?: string) {
    toast.error(message, { description, duration: 8000 });
  },
  info(message: string, description?: string) {
    toast(message, { description });
  },
};

export function AdminToaster() {
  return (
    <Toaster
      position="bottom-right"
      gap={8}
      offset={{ bottom: 20, right: 20 }}
      mobileOffset={{ bottom: 12, left: 12, right: 12 }}
      icons={{
        success: <CircleCheck className="size-4 text-success" aria-hidden />,
        error: <CircleAlert className="size-4 text-destructive" aria-hidden />,
        info: <Info className="size-4 text-ink-500" aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-3 border border-border-strong bg-surface-raised px-4 py-3.5 font-sans text-[0.8125rem] text-foreground shadow-[0_12px_32px_rgba(10,10,11,0.14)] sm:w-[360px]",
          title: "font-medium leading-snug",
          description: "mt-0.5 leading-snug text-muted-foreground",
          icon: "mt-0.5",
          error: "border-l-2 border-l-destructive",
          success: "border-l-2 border-l-success",
        },
      }}
    />
  );
}
