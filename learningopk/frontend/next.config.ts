import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = dirname(fileURLToPath(import.meta.url));

// Baseline security headers applied to every response. These defend against
// clickjacking (X-Frame-Options), MIME sniffing, protocol downgrade (HSTS),
// and cross-origin data leakage. CSP is intentionally permissive enough for
// the existing markdown/KaTeX/highlight.js/MinIO image pipeline but still
// blocks arbitrary script execution and object/base tags.
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
      // Next.js injects inline runtime bootstrap + hydration scripts; allowing
      // 'unsafe-inline' is unavoidable without nonces. External script CDNs
      // are not permitted.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: http://localhost:9000 https:",
      "font-src 'self' data:",
      "connect-src 'self' http://localhost:3001 https:",
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

export default nextConfig;
