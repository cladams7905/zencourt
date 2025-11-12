import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Transpile workspace packages to include their dependencies in the bundle
  transpilePackages: ["@zencourt/db", "@zencourt/shared"],
  // Set the root for file tracing to include monorepo packages
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Don't externalize ffmpeg/ffprobe - let webpack bundle them properly
  serverExternalPackages: ["fluent-ffmpeg"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude ffmpeg/ffprobe binaries from being processed by webpack
      config.externals = config.externals || [];
      config.externals.push({
        "fluent-ffmpeg": "commonjs fluent-ffmpeg",
        "ffmpeg-static": "commonjs ffmpeg-static",
        "ffprobe-static": "commonjs ffprobe-static"
      });

      // Ignore binary files in ffmpeg/ffprobe packages
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      config.module.rules.push({
        test: /node_modules\/ffmpeg-static\/.*$/,
        type: "asset/resource"
      });
      config.module.rules.push({
        test: /node_modules\/ffprobe-static\/.*$/,
        type: "asset/resource"
      });
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**"
      }
    ]
  },
  async rewrites() {
    return [
      {
        source: "/api/stack-auth/:path*",
        destination: "https://api.stack-auth.com/:path*"
      }
    ];
  }
};

export default nextConfig;
