import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Don't externalize ffmpeg/ffprobe - let webpack bundle them properly
  serverExternalPackages: ['fluent-ffmpeg'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude ffmpeg/ffprobe binaries from being processed
      config.externals = config.externals || [];
      config.externals.push({
        'fluent-ffmpeg': 'commonjs fluent-ffmpeg',
        '@ffmpeg-installer/ffmpeg': 'commonjs @ffmpeg-installer/ffmpeg',
        '@ffprobe-installer/ffprobe': 'commonjs @ffprobe-installer/ffprobe',
      });

      // Ignore binary files in ffmpeg/ffprobe installer packages
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      config.module.rules.push({
        test: /node_modules\/@ffmpeg-installer\/.*\/ffmpeg$/,
        use: 'ignore-loader',
      });
      config.module.rules.push({
        test: /node_modules\/@ffprobe-installer\/.*\/ffprobe$/,
        use: 'ignore-loader',
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
