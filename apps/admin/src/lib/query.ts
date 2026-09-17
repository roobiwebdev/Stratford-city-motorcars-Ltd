"use client";

import {
  AdminApiError,
  UnauthorisedError,
  errorMessage,
} from "@Stratford-city-motorcars-Ltd/core";
import { MutationCache, QueryCache, QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";

import { notify } from "@/components/ui/toast";

/**
 * Server state for the admin.
 *
 * Every query key starts with "admin", and every successful write invalidates
 * the lot. Deliberately broad: marking a car sold changes the stock list, the
 * overview, the enquiry that bought it and the customer's history — naming
 * those relationships at every call site is how one gets missed.
 */

let onUnauthorised: (() => void) | null = null;

/** The session gate registers here so an expired session anywhere sends you to sign in. */
export function setUnauthorisedHandler(handler: (() => void) | null) {
  onUnauthorised = handler;
}

function handleError(error: unknown) {
  if (error instanceof UnauthorisedError) onUnauthorised?.();
}

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        // A refusal is an answer, not a blip: only retry network failures.
        retry: (failures, error) => !(error instanceof AdminApiError) && failures < 2,
      },
    },
  });
}

export const queryKeys = {
  all: ["admin"] as const,
  session: ["admin", "session"] as const,
  overview: ["admin", "overview"] as const,
  stock: ["admin", "stock"] as const,
  vehicle: (id: string) => ["admin", "stock", id] as const,
  enquiries: (query: unknown) => ["admin", "enquiries", "list", query] as const,
  enquiryCounts: (query: unknown) => ["admin", "enquiries", "counts", query] as const,
  enquiry: (id: string) => ["admin", "enquiries", "detail", id] as const,
  appointments: (query: unknown) => ["admin", "appointments", query] as const,
  customers: (query: unknown) => ["admin", "customers", "list", query] as const,
  customer: (id: string) => ["admin", "customers", "detail", id] as const,
  team: ["admin", "team"] as const,
  settings: ["admin", "settings"] as const,
};

/**
 * A write that refreshes every admin query when it succeeds. Pass
 * `success`/`failure` to get the standard toasts; screens that show errors
 * inline (forms) leave `failure` out and read `error` themselves.
 */
export function useAdminMutation<Input, Output>(
  run: (input: Input) => Promise<Output>,
  options: {
    success?: string | ((output: Output) => string);
    successDetail?: string;
    failure?: string;
    onSuccess?: (output: Output, input: Input) => void;
  } = {},
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: async (output, input) => {
      await client.invalidateQueries({ queryKey: queryKeys.all });
      if (options.success) {
        notify.success(typeof options.success === "function" ? options.success(output) : options.success, options.successDetail);
      }
      options.onSuccess?.(output, input);
    },
    onError: (error) => {
      if (options.failure && !(error instanceof UnauthorisedError)) notify.error(options.failure, errorMessage(error));
    },
  });
}
