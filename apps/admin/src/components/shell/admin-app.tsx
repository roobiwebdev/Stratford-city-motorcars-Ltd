"use client";

import { TooltipProvider } from "@Stratford-city-motorcars-Ltd/ui/components/tooltip";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { ConfirmProvider, Dialog } from "@/components/ui/dialog";
import { AdminToaster } from "@/components/ui/toast";
import { GuardedLink, UnsavedChangesProvider } from "@/components/ui/unsaved";
import { isSampleData } from "@/lib/api";
import { SessionGate } from "@/lib/session";

import { routes } from "./routes";
import { SampleModeButton } from "./sample-controls";
import { AccountPanel, Sidebar, SidebarNav, ViewWebsiteLink, Wordmark } from "./sidebar";

const COLLAPSED_KEY = "scm-admin:sidebar-collapsed";

/**
 * The admin shell: providers, the session gate, the sidebar and top bar.
 *
 *  - lg and up: a fixed ink sidebar, collapsible to icons, remembered per browser
 *  - below lg:  a top bar with the menu, opening the same navigation as a drawer
 */
export function AdminApp({ children }: { children: ReactNode }) {
  return (
    <ConfirmProvider>
      <UnsavedChangesProvider>
        <TooltipProvider delay={250}>
          <SessionGate>
            <Frame>{children}</Frame>
          </SessionGate>
          <AdminToaster />
        </TooltipProvider>
      </UnsavedChangesProvider>
    </ConfirmProvider>
  );
}

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      // Storage blocked: keep the default.
    }
  }, []);
  const toggle = () =>
    setCollapsed((current) => {
      try {
        window.localStorage.setItem(COLLAPSED_KEY, current ? "0" : "1");
      } catch {
        // Not worth reporting.
      }
      return !current;
    });
  return [collapsed, toggle] as const;
}

function Frame({ children }: { children: ReactNode }) {
  const [collapsed, toggle] = useCollapsed();
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();

  useEffect(() => setDrawer(false), [pathname]);

  return (
    <div data-admin className="min-h-dvh bg-background font-sans text-foreground">
      <a
        href="#admin-content"
        className="sr-only fixed top-3 left-3 z-[70] bg-ink-950 px-5 py-3 text-sm text-bone focus:not-sr-only"
      >
        Skip to content
      </a>

      <Sidebar collapsed={collapsed} onToggle={toggle} />

      <div className={cn("transition-[padding] duration-300 ease-[var(--ease-out-expo)]", collapsed ? "lg:pl-16" : "lg:pl-60")}>
        {/* Phones and tablets: ink top bar. */}
        <header
          data-surface="dark"
          className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-ink-950 px-2 text-bone sm:px-4 lg:hidden"
        >
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="Open navigation"
            aria-expanded={drawer}
            className="flex size-11 items-center justify-center text-bone/85 hover:text-bone"
          >
            <Menu className="size-5" strokeWidth={1.5} aria-hidden />
          </button>
          <GuardedLink href={routes.overview} aria-label="Stratford City Motorcars admin — overview" className="flex items-center">
            <Wordmark className="h-7" />
          </GuardedLink>
          {isSampleData ? <SampleModeButton compact className="ml-auto border-brass/70 bg-transparent text-brass" /> : null}
        </header>

        {/* Large screens: a quiet bar for what is not navigation. */}
        <header className="sticky top-0 z-20 hidden h-12 items-center justify-end gap-3 border-b border-border bg-background/95 px-10 backdrop-blur-sm lg:flex">
          {isSampleData ? (
            <>
              <p className="mr-auto text-xs text-muted-foreground">
                Sample data — changes stay in this browser tab. Nothing is saved or sent.
              </p>
              <SampleModeButton />
            </>
          ) : null}
        </header>

        <main id="admin-content" tabIndex={-1} className="outline-none">
          {children}
        </main>
      </div>

      <Dialog open={drawer} onClose={() => setDrawer(false)} title="Navigation" variant="drawer" hideHeader surface="dark" bodyClassName="flex flex-col p-0" className="bg-ink-950 text-bone">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-bone/10 pr-2 pl-4">
          <Wordmark className="h-7" />
          <button
            type="button"
            onClick={() => setDrawer(false)}
            aria-label="Close navigation"
            className="flex size-11 items-center justify-center text-bone/70 hover:text-bone"
          >
            <X className="size-5" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-4">
          <SidebarNav onNavigate={() => setDrawer(false)} />
        </div>
        <div className="flex flex-col gap-2 border-t border-bone/10 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <AccountPanel collapsed={false} />
          <ViewWebsiteLink className="mx-2" />
        </div>
      </Dialog>
    </div>
  );
}
