import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["geoip-lite"],
  // Production builds type-check app code only; test files are checked by `npm run typecheck`
  // (they still carry known type debt that must not block a deploy).
  typescript: {
    tsconfigPath: process.env.NODE_ENV === "production" ? "tsconfig.build.json" : "tsconfig.json",
  },
};

export default nextConfig;
