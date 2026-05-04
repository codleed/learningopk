import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs";

const frontendDir = dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV !== "production";

// Baseline security headers applied to every response. These defend against
// clickjacking (X-Frame-Options), MIME sniffing, protocol downgrade (HSTS),
// and cross-origin data leakage. CSP is intentionally permissive enough for
// the existing markdown/KaTeX/highlight.js/MinIO image pipeline but still
// blocks arbitrary script execution and object/base tags.
//
// 'unsafe-eval' is only permitted in development (Turbopack/HMR uses eval).
// Production builds do not require it.
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:"
  : "script-src 'self' 'unsafe-inline'";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: http://localhost:9000 https:",
      "font-src 'self' data:",
      // ws: / wss: permitted for Next.js dev HMR and any future WebSocket usage.
      "connect-src 'self' http://localhost:3001 https: ws: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'"
    ].join("; ")
  }
];

const nextConfig: NextConfig = {
  turbopack: {
    root: join(frontendDir, "..")
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**"
      }
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  }
};

export default withSentryConfig(nextConfig, {
  org: "zegoop-ot",
  project: "javascript-nextjs",

  authToken: process.env.SENTRY_AUTH_TOKEN,

  widenClientFileUpload: true,

  tunnelRoute: "/monitoring",

  silent: !process.env.CI,
});
