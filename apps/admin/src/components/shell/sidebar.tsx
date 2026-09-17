"use client";

import { ROLES, type Capability } from "@Stratford-city-motorcars-Ltd/core";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarClock,
  Car,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Repeat2,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { Hint } from "@/components/ui/hint";
import { GuardedLink } from "@/components/ui/unsaved";
import { api, SITE_URL } from "@/lib/api";
import { dateKey, initials } from "@/lib/format";
import { queryKeys } from "@/lib/query";
import { useSession } from "@/lib/session";

import { routes } from "./routes";

type NavItem = {
  label: string;
  href: Route;
  icon: LucideIcon;
  exact?: boolean;
  /** Hidden from roles without it. The API enforces the same rule. */
  requires?: Capability;
  count?: "new-enquiries" | "viewings-today";
};

const sections: { label?: string; items: NavItem[] }[] = [
  { items: [{ label: "Overview", href: routes.overview, icon: LayoutDashboard, exact: true }] },
  {
    label: "Sales",
    items: [
      { label: "Enquiries", href: routes.enquiries, icon: Inbox, count: "new-enquiries" },
      { label: "Viewings & test drives", href: routes.viewings, icon: CalendarClock, count: "viewings-today" },
      { label: "Part exchange", href: routes.partExchange, icon: Repeat2 },
      { label: "Customers", href: routes.customers, icon: UserRound },
    ],
  },
  { label: "Stock", items: [{ label: "Cars", href: routes.stock, icon: Car }] },
  {
    label: "Business",
    items: [
      { label: "Team", href: routes.team, icon: Users },
      { label: "Settings", href: routes.settings, icon: Settings },
    ],
  },
];

function useNavCounts() {
  const enquiries = useQuery({
    queryKey: queryKeys.enquiryCounts({ scope: "nav" }),
    queryFn: () => api.enquiries.counts(),
    refetchInterval: 60_000,
  });
  const today = new Date();
  const from = new Date(today);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + 86_400_000);
  const viewings = useQuery({
    queryKey: queryKeys.appointments({ scope: "nav", day: dateKey(today) }),
    queryFn: () => api.appointments.list({ from: from.toISOString(), to: to.toISOString(), status: "active" }),
    refetchInterval: 5 * 60_000,
  });
  return {
    "new-enquiries": enquiries.data?.byStatus.new ?? 0,
    "viewings-today": viewings.data?.length ?? 0,
  };
}

/** The navigation itself, shared by the desktop sidebar and the mobile drawer. */
export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const counts = useNavCounts();
  const { can } = useSession();

  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <nav aria-label="Admin" className="flex flex-col gap-5">
      {sections.map((section) => {
        const items = section.items.filter((item) => !item.requires || can(item.requires));
        if (!items.length) return null;
        return (
          <div key={section.label ?? "top"}>
            {section.label ? (
              collapsed ? (
                <span aria-hidden className="mx-auto mb-2 block h-px w-5 bg-bone/15" />
              ) : (
                <p className="admin-eyebrow mb-1.5 px-3 text-bone/65">{section.label}</p>
              )
            ) : null}
            <ul className="flex flex-col gap-px">
              {items.map((item) => {
                const here = isActive(item);
                const count = item.count ? counts[item.count] : 0;
                const countLabel = item.count === "new-enquiries" ? "new" : "today";
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Hint content={count ? `${item.label} · ${count} ${countLabel}` : item.label} side="right" disabled={!collapsed}>
                      <GuardedLink
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={here ? "page" : undefined}
                        aria-label={collapsed ? `${item.label}${count ? `, ${count} ${countLabel}` : ""}` : undefined}
                        className={cn(
                          "group relative flex h-11 items-center gap-3 text-[0.8125rem] transition-colors duration-200 lg:h-10",
                          collapsed ? "mx-auto w-10 justify-center" : "px-3",
                          here ? "bg-bone/[0.07] text-bone" : "text-bone/70 hover:bg-bone/[0.04] hover:text-bone",
                        )}
                      >
                        {/* The current page is marked with a brass hairline, as the website marks its navigation. */}
                        <span
                          aria-hidden
                          className={cn(
                            "absolute inset-y-2 left-0 w-0.5 bg-brass transition-opacity duration-300",
                            here ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <Icon className="size-[1.0625rem] shrink-0" strokeWidth={1.5} aria-hidden />
                        {collapsed ? null : <span className="flex-1 truncate">{item.label}</span>}
                        {count ? (
                          collapsed ? (
                            <span aria-hidden className="absolute top-2 right-2 size-1.5 bg-brass" />
                          ) : (
                            <span data-numeric className="inline-flex h-5 min-w-5 items-center justify-center bg-brass px-1.5 text-[0.6875rem] font-medium text-ink-950">
                              {count}
                              <span className="sr-only"> {countLabel}</span>
                            </span>
                          )
                        ) : null}
                      </GuardedLink>
                    </Hint>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function Wordmark({ compact, className }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <span aria-hidden className={cn("font-roman text-base font-semibold tracking-[0.12em] text-bone", className)}>
        SCM
      </span>
    );
  }
  return (
    <Image
      src="/logo-bone.webp"
      alt="Stratford City Motorcars"
      width={900}
      height={269}
      sizes="120px"
      priority
      className={cn("h-8 w-auto", className)}
    />
  );
}

/** Who is signed in, the role the API holds them to, and the way out. */
export function AccountPanel({ collapsed }: { collapsed: boolean }) {
  const { user, signOut } = useSession();
  const [leaving, setLeaving] = useState(false);
  const role = ROLES.find((item) => item.value === user.role);

  const leave = async () => {
    setLeaving(true);
    try {
      await signOut();
    } finally {
      setLeaving(false);
    }
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <Hint content={`${user.name} · ${role?.label}`} side="right">
          <span tabIndex={0} aria-label={`Signed in as ${user.name}, ${role?.label}`} className="flex size-9 items-center justify-center border border-bone/20 text-[0.6875rem] font-medium text-bone">
            {initials(user.name)}
          </span>
        </Hint>
        <Hint content="Sign out" side="right">
          <button type="button" onClick={leave} disabled={leaving} aria-label="Sign out" className="flex size-10 items-center justify-center text-bone/65 transition-colors hover:text-bone disabled:opacity-50">
            <LogOut className="size-4" strokeWidth={1.5} aria-hidden />
          </button>
        </Hint>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3">
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center border border-bone/20 text-[0.6875rem] font-medium text-bone">
        {initials(user.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.8125rem] text-bone" title={user.email}>
          {user.name}
        </p>
        <p className="truncate text-[0.6875rem] text-bone/65">{role?.label}</p>
      </div>
      <button
        type="button"
        onClick={leave}
        disabled={leaving}
        aria-label={leaving ? "Signing out" : "Sign out"}
        title="Sign out"
        className="flex size-10 shrink-0 items-center justify-center text-bone/65 transition-colors hover:text-bone disabled:opacity-50"
      >
        <LogOut className="size-4" strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}

export function ViewWebsiteLink({ collapsed, className }: { collapsed?: boolean; className?: string }) {
  return (
    <Hint content="View the website" side="right" disabled={!collapsed}>
      <a
        href={SITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={collapsed ? "View the website (opens in a new tab)" : undefined}
        className={cn(
          "flex h-10 items-center gap-2.5 text-[0.8125rem] text-bone/65 transition-colors hover:text-bone",
          collapsed ? "w-10 justify-center" : "px-3",
          className,
        )}
      >
        <ExternalLink className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
        {collapsed ? null : (
          <>
            View website<span className="sr-only"> (opens in a new tab)</span>
          </>
        )}
      </a>
    </Hint>
  );
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      aria-label="Sidebar"
      data-surface="dark"
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col bg-ink-950 text-bone transition-[width] duration-300 ease-[var(--ease-out-expo)] lg:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex h-16 shrink-0 items-center border-b border-bone/10", collapsed ? "justify-center" : "px-5")}>
        <GuardedLink href={routes.overview} aria-label="Stratford City Motorcars admin — overview" className="flex items-center">
          <Wordmark compact={collapsed} />
        </GuardedLink>
      </div>

      <div className="flex-1 overflow-y-auto py-5 scrollbar-thin">
        <div className={collapsed ? "" : "px-2"}>
          <SidebarNav collapsed={collapsed} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-bone/10 py-3">
        <AccountPanel collapsed={collapsed} />
        <div className={cn("flex items-center", collapsed ? "flex-col gap-1" : "justify-between px-2")}>
          <ViewWebsiteLink collapsed={collapsed} />
          <Hint content={collapsed ? "Expand sidebar" : "Collapse sidebar"} side="right">
            <button
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              className="flex size-10 items-center justify-center text-bone/65 transition-colors hover:text-bone"
            >
              {collapsed ? <PanelLeftOpen className="size-4" strokeWidth={1.5} aria-hidden /> : <PanelLeftClose className="size-4" strokeWidth={1.5} aria-hidden />}
            </button>
          </Hint>
        </div>
      </div>
    </aside>
  );
}
