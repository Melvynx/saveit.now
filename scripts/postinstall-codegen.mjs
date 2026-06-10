#!/usr/bin/env node
// Runs `convex codegen` after install so the generated API types exist locally.
// Skipped in CI / Vercel / when a deploy key is present (those run codegen via deploy).
import { spawnSync } from "node:child_process";

const shouldSkip =
  process.env.CONVEX_CODEGEN_SKIP === "1" ||
  process.env.CI === "true" ||
  process.env.VERCEL === "1" ||
  Boolean(process.env.CONVEX_DEPLOY_KEY);

if (shouldSkip) {
  console.log("[postinstall] skipping Convex codegen");
  process.exit(0);
}

const result = spawnSync(
  "pnpm",
  ["--filter", "@workspace/backend", "exec", "convex", "codegen"],
  { stdio: "inherit" },
);

// Never fail install if codegen can't run (e.g. not logged in to Convex yet).
process.exit(result.status === 0 ? 0 : 0);
