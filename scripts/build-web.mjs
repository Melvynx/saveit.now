#!/usr/bin/env node
// Runs the web build. When invoked as the `convex deploy --cmd` target, Convex
// injects VITE_CONVEX_URL (the deployed .cloud URL) into our env. We derive
// VITE_CONVEX_SITE_URL (.site) from it so the client bundle (chat stream, tools,
// Better Auth) has both URLs without a separate Vercel env var.
import { spawnSync } from "node:child_process";

if (!process.env.VITE_CONVEX_SITE_URL && process.env.VITE_CONVEX_URL) {
  process.env.VITE_CONVEX_SITE_URL = process.env.VITE_CONVEX_URL.replace(
    ".convex.cloud",
    ".convex.site",
  );
  console.log(
    `[build-web] derived VITE_CONVEX_SITE_URL=${process.env.VITE_CONVEX_SITE_URL}`,
  );
}

const result = spawnSync("pnpm", ["turbo", "run", "build:web"], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
