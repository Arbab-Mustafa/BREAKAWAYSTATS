import { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }: { isServer: boolean }) => {
    if (isServer) {
      // Exclude 'pg' module from server-side builds
      config.externals = [...(config.externals || []), "pg"];
    }
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;