import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cognitive-layer-labs.github.io" },
    ],
  },
};

export default nextConfig;
