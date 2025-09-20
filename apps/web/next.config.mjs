import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  logging: process.env.CI
    ? {
        fetches: {
          fullUrl: true,
        },
      }
    : undefined,
  transpilePackages: ["@workspace/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "saveit.mlvcdn.com",
      },
    ],
  },
  experimental: {
    authInterrupts: true,
  },
  redirects: async () => {
    return [
      {
        source: "/blog",
        destination: "/posts",
        permanent: true,
      },
      {
        source: "/blog/:path*",
        destination: "/posts/:path*",
        permanent: true,
      },
      {
        source: "/docs",
        destination: "/docs/getting-started",
        permanent: false,
      },
    ];
  },
  rewrites: async () => {
    return [
      {
        // PostHog asset proxy
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        // PostHog event ingestion proxy
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
      {
        // PostHog decide endpoint proxy
        source: "/ingest/decide",
        destination: "https://eu.i.posthog.com/decide",
      },
      {
        source: "/app/:path*",
        destination: "/app",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  webpack: (config, { isServer }) => {
    // This is a workaround to avoid this Prisma issue on Vercel
    // https://github.com/prisma/prisma/discussions/19499
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }

    return config;
  },
};

export default nextConfig;
