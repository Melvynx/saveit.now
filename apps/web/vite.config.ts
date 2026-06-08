import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import path from "node:path";
import { defineConfig } from "vite";

const workspaceRoot = path.resolve(import.meta.dirname, "../..");

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    dedupe: ["react", "react-dom"],
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
      src: path.resolve(import.meta.dirname, "./src"),
      emails: path.resolve(import.meta.dirname, "./emails"),
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
    nitro(),
  ],
  ssr: {
    noExternal: ["better-auth", "posthog-js"],
  },
});
