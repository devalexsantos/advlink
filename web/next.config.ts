import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
]

// Logged-in / internal areas must never be framed (clickjacking on billing, admin actions).
const noFramingHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
]

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["geoip-lite"],
  poweredByHeader: false,
  // Dev only: hosts (e.g. a tunnel for webhook testing) allowed to load /_next dev resources.
  allowedDevOrigins: process.env.DEV_ALLOWED_ORIGINS?.split(",").map((h) => h.trim()).filter(Boolean),
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/(profile|admin|login|onboarding)/:path*", headers: noFramingHeaders },
      { source: "/(profile|admin|login|onboarding)", headers: noFramingHeaders },
    ]
  },
  // Production builds type-check app code only; test files are checked by `npm run typecheck`
  // (they still carry known type debt that must not block a deploy).
  typescript: {
    tsconfigPath: process.env.NODE_ENV === "production" ? "tsconfig.build.json" : "tsconfig.json",
  },
};

export default nextConfig;
