import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// Served over HTTPS (production): then browsers are told to stay on HTTPS.
// Not on http://localhost, where it would break the local servers.
const isHttps = (process.env.BETTER_AUTH_URL ?? "").startsWith("https://");

/**
 * Content Security Policy: what the browser may load and run. Everything
 * comes from this site; nothing from elsewhere, no plugins, no framing, and
 * forms only post here. Scripts need 'unsafe-inline' because Next.js puts
 * its page data in inline scripts, and the per-request "nonce" alternative
 * doesn't work with prerendered pages (Cache Components). Development also
 * needs 'unsafe-eval' and a WebSocket for hot reloading.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

// Safe defaults for every response.
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isHttps
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  // Cache Components and Partial Prefetching become the default in the next
  // major version of Next.js, so the app is built with them from the start.
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Next's dev-only badge would sit over the side bar's theme switch.
  devIndicators: { position: "bottom-right" },
  experimental: {
    // When the connection drops, page changes and saves wait and are retried
    // once it's back, and useOffline() can say so (OfflineNotice).
    useOffline: true,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The service worker: always the latest version, never from a cache.
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      // Clients' status pages: the link is the key, so it must not leak to
      // other sites through the Referer header, or end up in search results.
      {
        source: "/status/:token",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
