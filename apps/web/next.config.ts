import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";
import path from "path";

const storagePublicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL || "";
const storagePublicPattern: RemotePattern | null = (() => {
  if (!storagePublicBaseUrl) {
    return null;
  }
  try {
    const url = new URL(storagePublicBaseUrl);
    const pathname = url.pathname.endsWith("/")
      ? `${url.pathname}**`
      : `${url.pathname}/**`;
    return {
      protocol: url.protocol.replace(":", "") as RemotePattern["protocol"],
      hostname: url.hostname,
      pathname
    };
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Transpile workspace packages to include their dependencies in the bundle
  transpilePackages: ["@zencourt/db", "@zencourt/shared"],
  // Set the root for file tracing to include monorepo packages
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Don't externalize ffmpeg/ffprobe - let webpack bundle them properly
  serverExternalPackages: [
    "fluent-ffmpeg",
    // Prevent Next from bundling Pino and its worker-based transport so the worker file stays on disk
    "pino",
    "pino-pretty",
    "thread-stream"
  ],
  // Silence Next.js 16 warning when using custom webpack config under Turbopack defaults
  turbopack: {},
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
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "zencourt-media-dev.s3.us-east-005.backblazeb2.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "zencourt-media-prod.s3.us-east-005.backblazeb2.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "s3.us-east-005.backblazeb2.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "f005.backblazeb2.com",
        pathname: "/**"
      },
      ...(storagePublicPattern ? [storagePublicPattern] : [])
    ]
  }
};

export default nextConfig;
