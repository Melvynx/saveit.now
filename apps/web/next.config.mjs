/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  rewrites: async () => {
    return [
      {
        // 👇 matches all routes except /api
        source: "/app/:path*",
        destination: "/app",
      },
    ];
  },
};

export default nextConfig;
