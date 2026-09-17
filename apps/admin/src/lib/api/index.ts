import type { AdminApi } from "@Stratford-city-motorcars-Ltd/core";

import { createHttpApi } from "./http";
import { createMockApi } from "./mock";

/**
 * The one place a screen gets data from.
 *
 * NEXT_PUBLIC_ADMIN_DATA picks the implementation at build time:
 *  - `mock` (default) — sample data in this browser tab; nothing is saved or sent
 *  - `api`            — the real API at NEXT_PUBLIC_ADMIN_API_URL
 *
 * Screens import `api` and never know which one they have.
 */

export const dataSource: "mock" | "api" = process.env.NEXT_PUBLIC_ADMIN_DATA === "api" ? "api" : "mock";

export const isSampleData = dataSource === "mock";

function create(): AdminApi {
  if (dataSource === "api") {
    const origin = process.env.NEXT_PUBLIC_ADMIN_API_URL;
    if (!origin) throw new Error("NEXT_PUBLIC_ADMIN_API_URL must be set when NEXT_PUBLIC_ADMIN_DATA=api.");
    return createHttpApi(origin);
  }
  return createMockApi();
}

export const api: AdminApi = create();

/** Where the public website lives, for "view on website" links and site-relative media. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.stratfordcitymotorcars.com").replace(/\/+$/, "");
