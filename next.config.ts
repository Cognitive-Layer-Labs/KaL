import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cognitive-layer-labs.github.io" },
    ],
  },
  webpack(config) {
    // Stub out React Native and dev-only modules that wagmi/web3 connectors
    // reference but never actually use in a browser build.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
      lokijs: false,
      encoding: false,
    };
    return config;
  },
};

export default nextConfig;
