import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Disable TypeScript type checking during build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
