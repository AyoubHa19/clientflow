import type { NextConfig } from "next";

// Safe defaults for every response. A Content Security Policy comes in the
// security stage (11), once the app's scripts and sources are known.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Cache Components and Partial Prefetching become the default in the next
  // major version of Next.js, so the app is built with them from the start.
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Next's dev-only badge would sit over the side bar's theme switch.
  devIndicators: { position: "bottom-right" },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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
