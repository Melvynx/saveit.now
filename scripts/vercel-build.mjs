import { spawnSync } from "node:child_process";

// Vercel build entrypoint (called from apps/web/vercel.json → `pnpm vercel-build`).
//
// Three modes, in priority order:
//
// 1. Convex deploy credentials are present → DEPLOY.
//    Run `convex deploy`, even when VITE_CONVEX_URL is preset. This keeps
//    production from silently building against a stale/manual deployment URL.
//
// 2. SKIP_CONVEX_DEPLOY=1 with VITE_CONVEX_URL set → MANUAL OVERRIDE.
//    Skip `convex deploy` and build against the supplied URL. Used for branch
//    previews/worktrees that intentionally point at an existing deployment.
//
// 3. No deploy credentials, but VITE_CONVEX_URL is set → BUILD ONLY.
//
// Any path without a deploy and without VITE_CONVEX_URL fails fast. The app
// must never build against a hardcoded Convex fallback.

const hasManualConvexUrl = Boolean(process.env.VITE_CONVEX_URL);
const skipConvexDeploy = process.env.SKIP_CONVEX_DEPLOY === "1";

const hasConvexDeployCredentials = Boolean(
  process.env.CONVEX_DEPLOY_KEY ||
    (process.env.CONVEX_SELF_HOSTED_URL &&
      process.env.CONVEX_SELF_HOSTED_ADMIN_KEY),
);

const shouldDeployConvex = hasConvexDeployCredentials && !skipConvexDeploy;

if (!shouldDeployConvex && !hasManualConvexUrl) {
  const reason = skipConvexDeploy
    ? "SKIP_CONVEX_DEPLOY=1 requires VITE_CONVEX_URL to be set."
    : "CONVEX_DEPLOY_KEY/VITE_CONVEX_URL are not set.";
  console.error(
    `[vercel-build] ${reason} Refusing to build without an explicit Convex deployment URL.`,
  );
  process.exit(1);
}

const command = shouldDeployConvex
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

if (shouldDeployConvex) {
  console.log(
    hasManualConvexUrl
      ? "[vercel-build] Deploying Convex + building web; deploy output overrides preset VITE_CONVEX_URL."
      : "[vercel-build] Deploying Convex + building web (VITE_CONVEX_URL auto-injected).",
  );
} else if (skipConvexDeploy) {
  console.log(
    `[vercel-build] SKIP_CONVEX_DEPLOY=1; building web against VITE_CONVEX_URL=${process.env.VITE_CONVEX_URL}.`,
  );
} else {
  console.log(
    `[vercel-build] No Convex deploy credentials found; building web against VITE_CONVEX_URL=${process.env.VITE_CONVEX_URL}.`,
  );
}

const result = spawnSync(command[0], command.slice(1), {
  stdio: "inherit",
  shell: false,
});

process.exit(result.status ?? 1);
