"use client";

import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { Button } from "./button";

/**
 * Dialogs on the native <dialog>. `showModal()` gives focus containment,
 * Escape, an inert page behind and top-layer stacking from the browser
 * itself, and returns focus to the control that opened it.
 *
 *  - `center`  confirmations and short forms; a full-height sheet on phones
 *  - `sheet`   slides in from the right; full width on phones
 *  - `drawer`  navigation, from the left
 */

type Variant = "center" | "sheet" | "drawer";

const variantClass: Record<Variant, string> = {
  center:
    "m-0 mt-auto h-auto max-h-[92dvh] w-full max-w-none border-t border-border-strong " +
    "sm:m-auto sm:max-h-[calc(100dvh-4rem)] sm:w-[min(calc(100vw-2rem),var(--dialog-width))] sm:border",
  sheet:
    "my-0 mr-0 ml-auto h-dvh max-h-none w-full max-w-none border-l border-border-strong sm:w-[min(100vw,var(--dialog-width))]",
  drawer: "my-0 mr-auto ml-0 h-dvh max-h-none w-[min(86vw,19rem)] max-w-none border-r border-white/10",
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "center",
  width = "32rem",
  hideHeader,
  surface,
  className,
  bodyClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  variant?: Variant;
  width?: string;
  /** Keeps the title for assistive technology but draws no header. */
  hideHeader?: boolean;
  surface?: "dark";
  className?: string;
  bodyClassName?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
      // Focus the requested control, or the dialog itself — never the first
      // link or button by accident, which would read as already selected.
      (dialog.querySelector<HTMLElement>("[data-autofocus]") ?? dialog).focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => {
      if (open) document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-variant={variant}
      tabIndex={-1}
      data-surface={surface}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        // Escape: the owner decides — it may hold unsaved input.
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{ "--dialog-width": width } as CSSProperties}
      className={cn(
        "flex-col overflow-hidden bg-background p-0 outline-none text-foreground shadow-[0_24px_64px_rgba(10,10,11,0.28)] open:flex",
        variantClass[variant],
        className,
      )}
    >
      {open ? (
        <>
          {hideHeader ? (
            <h2 id={titleId} className="sr-only">
              {title}
            </h2>
          ) : (
            <header className="flex shrink-0 items-start justify-between gap-6 border-b border-border px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 id={titleId} className="font-display text-[1.375rem] leading-tight">
                  {title}
                </h2>
                {description ? (
                  <div id={descriptionId} className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
                    {description}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-2 inline-flex size-10 shrink-0 items-center justify-center text-ink-500 transition-colors hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </header>
          )}
          <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6", bodyClassName)}>{children}</div>
          {footer ? (
            <footer className="flex shrink-0 flex-wrap-reverse items-center justify-end gap-2.5 border-t border-border bg-surface px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-6 [&>*]:max-sm:flex-1">
              {footer}
            </footer>
          ) : null}
        </>
      ) : null}
    </dialog>
  );
}

// ---- Confirmation ------------------------------------------------------------------------

export type ConfirmOptions = {
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type ConfirmState = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/** One confirmation dialog for the admin: `if (await confirm({...})) …`. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...options, resolve })),
    [],
  );

  const settle = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
  };

  return (
    <ConfirmContext value={confirm}>
      {children}
      <Dialog
        open={state !== null}
        onClose={() => settle(false)}
        title={state?.title ?? ""}
        width="28rem"
        footer={
          <>
            <Button variant="ghost" onClick={() => settle(false)}>
              {state?.cancelLabel ?? "Cancel"}
            </Button>
            <Button variant={state?.tone === "danger" ? "danger" : "primary"} onClick={() => settle(true)} data-autofocus>
              {state?.confirmLabel}
            </Button>
          </>
        }
      >
        <div className="text-sm leading-relaxed text-ink-700">{state?.body}</div>
      </Dialog>
    </ConfirmContext>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside ConfirmProvider.");
  return confirm;
}
