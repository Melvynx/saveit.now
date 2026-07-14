import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import path from "node:path";
import { defineConfig } from "vite";

const workspaceRoot = path.resolve(import.meta.dirname, "../..");
const devServerPort = Number.parseInt(process.env.PORT ?? "3000", 10);
const crawlerCacheControl =
  "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";

const crawlerRouteRules = {
  "/stats/**": {
    proxy: "https://analytics.melvynx.dev/**",
  },
  "/robots.txt": {
    headers: {
      "cache-control": crawlerCacheControl,
      "content-type": "text/plain; charset=utf-8",
    },
  },
  "/sitemap.xml": {
    headers: {
      "cache-control": crawlerCacheControl,
      "content-type": "application/xml; charset=utf-8",
    },
  },
  "/sitemap_index.xml": {
    headers: {
      "cache-control": crawlerCacheControl,
      "content-type": "application/xml; charset=utf-8",
    },
  },
  "/app-ads.txt": {
    headers: {
      "cache-control": crawlerCacheControl,
      "content-type": "text/plain; charset=utf-8",
    },
  },
  "/api/health": {
    headers: {
      "cache-control":
        "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
      "content-type": "application/json; charset=utf-8",
    },
  },
  "/apple-touch-icon.png": {
    redirect: { to: "/apple-icon.png", status: 308 },
  },
  "/apple-touch-icon-precomposed.png": {
    redirect: { to: "/apple-icon.png", status: 308 },
  },
} as const;

export default defineConfig({
  server: {
    port: Number.isFinite(devServerPort) ? devServerPort : 3000,
    strictPort: true,
  },
  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
    alias: {
      "@workspace/ui/globals.css": path.resolve(
        workspaceRoot,
        "packages/ui/src/styles/globals.css",
      ),
      "@workspace/ui/lib": path.resolve(workspaceRoot, "packages/ui/src/lib"),
      "@workspace/ui/components": path.resolve(
        workspaceRoot,
        "packages/ui/src/components",
      ),
      "@workspace/ui/hooks": path.resolve(
        workspaceRoot,
        "packages/ui/src/hooks",
      ),
      "@": path.resolve(import.meta.dirname, "./src"),
      "@convex": path.resolve(workspaceRoot, "packages/backend/convex"),
      src: path.resolve(import.meta.dirname, "./src"),
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
      router: {
        routesDirectory: "routes",
        generatedRouteTree: "routeTree.gen.ts",
        quoteStyle: "double",
        semicolons: true,
      },
    }),
    react(),
    nitro({
      routeRules: crawlerRouteRules,
      vercel: {
        config: {
          version: 3,
          overrides: {
            "api/health.json": {
              path: "api/health",
              contentType: "application/json; charset=utf-8",
            },
          },
        },
      },
    }),
  ],
  ssr: {
    noExternal: ["better-auth"],
  },
});
