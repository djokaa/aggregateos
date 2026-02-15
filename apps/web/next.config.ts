import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@aggregateos/db",
    "@aggregateos/api",
    "@aggregateos/shared",
    "@aggregateos/ui",
  ],
};

export default nextConfig;
