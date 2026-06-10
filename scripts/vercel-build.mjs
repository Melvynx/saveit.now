import { spawnSync } from "node:child_process";

// Vercel build entrypoint (called from apps/web/vercel.json → `pnpm vercel-build`).
//
// Three modes, in priority order:
//
// 1. VITE_CONVEX_URL is already set in the environment → MANUAL OVERRIDE.
//    Skip `convex deploy` entirely and build against that URL. Used for the
//    branch preview so it can point at an existing deployment (e.g. the dev
//    deployment that already holds migrated data) without deploying functions
//    to a fresh, empty preview deployment.
//
// 2. A Convex deploy key is present (CONVEX_DEPLOY_KEY in Vercel env) → DEPLOY.
//    Run `convex deploy`, which deploys the functions to the target deployment
//    (prod) and injects that deployment's URL into VITE_CONVEX_URL for the
//    build. No manual VITE_CONVEX_URL needed — the deploy key creates it.
//    build-web.mjs derives VITE_CONVEX_SITE_URL (.site) from it.
//
// 3. Neither → build against whatever env is configured (local fallback).

const hasManualConvexUrl = Boolean(process.env.VITE_CONVEX_URL);

const hasConvexDeployCredentials =
  !hasManualConvexUrl &&
  Boolean(
    process.env.CONVEX_DEPLOY_KEY ||
      (process.env.CONVEX_SELF_HOSTED_URL &&
        process.env.CONVEX_SELF_HOSTED_ADMIN_KEY),
  );

const command = hasConvexDeployCredentials
  ? [
      "pnpm",
      "--filter",
      "@workspace/backend",
      "exec",
      "convex",
      "deploy",
      // Inject the deployed URL as VITE_CONVEX_URL (Vite needs the VITE_ prefix).
      "--cmd-url-env-var-name",
      "VITE_CONVEX_URL",
      // The --cmd runs from packages/backend's cwd → cd back to repo root first.
      "--cmd",
      "cd ../.. && node scripts/build-web.mjs",
    ]
  : ["node", "scripts/build-web.mjs"];

if (hasManualConvexUrl) {
  console.log(
    `[vercel-build] VITE_CONVEX_URL already set (${process.env.VITE_CONVEX_URL}); skipping convex deploy and building against it.`,
  );
} else if (hasConvexDeployCredentials) {
  console.log(
    "[vercel-build] Deploying Convex + building web (VITE_CONVEX_URL auto-injected).",
  );
} else {
  console.log(
    "[vercel-build] No Convex deploy credentials found; building web against the configured VITE_CONVEX_URL.",
  );
}

const result = spawnSync(command[0], command.slice(1), {
  stdio: "inherit",
  shell: false,
});

process.exit(result.status ?? 1);
