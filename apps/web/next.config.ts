import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Transpile workspace packages to include their dependencies in the bundle
  transpilePackages: ['@zencourt/db', '@zencourt/shared'],
  // Don't externalize ffmpeg/ffprobe - let webpack bundle them properly
  serverExternalPackages: ['fluent-ffmpeg'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude ffmpeg/ffprobe binaries from being processed by webpack
      config.externals = config.externals || [];
      config.externals.push({
        'fluent-ffmpeg': 'commonjs fluent-ffmpeg',
        'ffmpeg-static': 'commonjs ffmpeg-static',
        'ffprobe-static': 'commonjs ffprobe-static',
      });

      // Ignore binary files in ffmpeg/ffprobe packages
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      config.module.rules.push({
        test: /node_modules\/ffmpeg-static\/.*$/,
        type: 'asset/resource',
      });
      config.module.rules.push({
        test: /node_modules\/ffprobe-static\/.*$/,
        type: 'asset/resource',
      });
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**"
      }
    ]
  }
};

export default nextConfig;
