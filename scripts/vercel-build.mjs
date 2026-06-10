import { spawnSync } from "node:child_process";

// Vercel build entrypoint (called from apps/web/vercel.json → `pnpm vercel-build`).
//
// With a Convex deploy key present (set CONVEX_DEPLOY_KEY in Vercel env), this
// runs `convex deploy` which:
//   1. deploys the Convex functions to the target deployment (prod or preview),
//   2. injects that deployment's URL into VITE_CONVEX_URL for the build command,
// then builds the web app (build-web.mjs derives VITE_CONVEX_SITE_URL from it).
// No manual VITE_CONVEX_URL env var is needed — the deploy key creates it.
//
// Without a deploy key (e.g. local), it just builds against the configured env.

const hasConvexDeployCredentials = Boolean(
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

if (!hasConvexDeployCredentials) {
  console.log(
    "[vercel-build] No Convex deploy credentials found; building web against the configured VITE_CONVEX_URL.",
  );
} else {
  console.log(
    "[vercel-build] Deploying Convex + building web (VITE_CONVEX_URL auto-injected).",
  );
}

const result = spawnSync(command[0], command.slice(1), {
  stdio: "inherit",
  shell: false,
});

process.exit(result.status ?? 1);
