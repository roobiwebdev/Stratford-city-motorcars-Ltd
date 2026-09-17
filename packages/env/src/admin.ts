import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Admin environment. Everything here reaches the browser, so nothing secret
 * belongs in it — sessions are cookies set by the API.
 */
export const env = createEnv({
  client: {
    /**
     * Where the admin's data comes from. `mock` runs on in-browser sample data
     * and needs nothing else; `api` calls NEXT_PUBLIC_ADMIN_API_URL.
     */
    NEXT_PUBLIC_ADMIN_DATA: z.enum(["mock", "api"]).default("mock"),
    /** The admin API origin, e.g. https://api.stratfordcitymotorcars.com. Required for `api`. */
    NEXT_PUBLIC_ADMIN_API_URL: z.url().optional(),
    /** The public website, for "view on website" links and site-relative photographs. */
    NEXT_PUBLIC_SITE_URL: z.url().default("https://www.stratfordcitymotorcars.com"),
  },
  runtimeEnv: {
    NEXT_PUBLIC_ADMIN_DATA: process.env.NEXT_PUBLIC_ADMIN_DATA,
    NEXT_PUBLIC_ADMIN_API_URL: process.env.NEXT_PUBLIC_ADMIN_API_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  emptyStringAsUndefined: true,
});
