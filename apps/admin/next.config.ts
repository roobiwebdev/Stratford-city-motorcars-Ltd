import "@Stratford-city-motorcars-Ltd/env/admin";
import type { NextConfig } from "next";

/**
 * The admin is an internal tool on its own origin. It is never indexed and
 * never framed, and it only loads photographs from itself, the website and
 * (later) the media CDN.
 */
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.stratfordcitymotorcars.com").replace(/\/$/, "");
const mediaPublicBase = process.env.MEDIA_PUBLIC_BASE_URL?.trim().replace(/\/$/, "");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "Permissions-Policy", value: "microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    localPatterns: [{ pathname: "/sample/**", search: "" }, { pathname: "/*.webp", search: "" }],
    remotePatterns: [
      new URL(`${siteUrl}/media/**`),
      new URL(`${siteUrl}/vehicles/**`),
      ...(mediaPublicBase ? [new URL(`${mediaPublicBase}/**`)] : []),
    ],
  },
};

export default nextConfig;
