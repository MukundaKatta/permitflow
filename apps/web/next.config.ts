import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@permitflow/supabase",
    "@permitflow/ai-engine",
    "@permitflow/regulations",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
