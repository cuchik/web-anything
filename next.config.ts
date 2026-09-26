import type { NextConfig } from "next";
// Vinext loads this file before tsconfig aliases are registered.
import { securityHeaders } from "./lib/http/security-headers";

export default function nextConfig(phase: string): NextConfig {
  return {
    async headers() {
      const headers = Object.entries(securityHeaders(!phase.includes("development")))
        .map(([key, value]) => ({ key, value }));
      // Vinext's wildcard matcher does not consistently include the root route.
      return [{ source: "/", headers }, { source: "/:path*", headers }];
    },
  };
}
