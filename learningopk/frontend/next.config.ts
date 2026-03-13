import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = dirname(fileURLToPath(import.meta.url));
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
  }
};

export default nextConfig;
