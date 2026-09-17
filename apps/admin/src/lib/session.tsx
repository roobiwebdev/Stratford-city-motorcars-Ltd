"use client";

import { can as roleCan, type Capability, type SessionUser } from "@Stratford-city-motorcars-Ltd/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";

import { api } from "@/lib/api";
import { queryKeys, setUnauthorisedHandler } from "@/lib/query";

/**
 * Who is signed in, and what the interface may offer them.
 *
 * `can()` decides what is SHOWN. The API decides what is ALLOWED, on every
 * request, from its own session — a hidden button protects nothing.
 */

type SessionValue = {
  user: SessionUser;
  can: (capability: Capability) => boolean;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionGate.");
  return value;
}

export function useSessionQuery() {
  return useQuery({ queryKey: queryKeys.session, queryFn: () => api.session.get(), staleTime: 60_000 });
}

/** Holds every admin screen back until the session is known. */
export function SessionGate({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isPending, error, refetch } = useSessionQuery();

  const toSignIn = useCallback(() => {
    const next = pathname && pathname !== "/dashboard" ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/sign-in${next}` as Route);
  }, [pathname, router]);

  useEffect(() => {
    setUnauthorisedHandler(() => {
      client.setQueryData(queryKeys.session, null);
      toSignIn();
    });
    return () => setUnauthorisedHandler(null);
  }, [client, toSignIn]);

  useEffect(() => {
    if (!isPending && !error && !user) toSignIn();
  }, [isPending, error, user, toSignIn]);

  const signOut = useCallback(async () => {
    await api.session.signOut();
    client.clear();
    router.replace("/sign-in");
  }, [client, router]);

  if (error) {
    return (
      <Splash>
        <p className="text-sm text-bone/80">We could not check your session.</p>
        <p className="mt-1 max-w-sm text-center text-xs text-bone/65">{error.message}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-5 h-10 border border-bone/30 px-4 text-[0.6875rem] font-medium tracking-[0.1em] text-bone uppercase transition-colors hover:border-bone hover:bg-bone hover:text-ink-950"
        >
          Try again
        </button>
      </Splash>
    );
  }

  if (isPending || !user) {
    return (
      <Splash>
        <p role="status" className="admin-eyebrow text-bone/65">
          {isPending ? "Checking your session…" : "Taking you to sign in…"}
        </p>
      </Splash>
    );
  }

  return (
    <SessionContext value={{ user, can: (capability) => roleCan(user.role, capability), signOut }}>
      {children}
    </SessionContext>
  );
}

function Splash({ children }: { children: ReactNode }) {
  return (
    <div data-surface="dark" className="flex min-h-dvh flex-col items-center justify-center bg-ink-950 px-6 text-bone">
      {children}
    </div>
  );
}

/** Renders children only when the signed-in role has the capability. Presentation only. */
export function Can({ capability, children, fallback = null }: { capability: Capability; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useSession();
  return <>{can(capability) ? children : fallback}</>;
}
