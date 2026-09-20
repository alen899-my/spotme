import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pub-a5b499b8927a41d0aab85cb763ff97c7.r2.dev", pathname: "/**" },
      { protocol: "https", hostname: "*.r2.dev", pathname: "/**" },
    ],
  },
};

export default nextConfig;
