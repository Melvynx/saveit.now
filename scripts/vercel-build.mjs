import { spawnSync } from "node:child_process";

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
      "--cmd",
      "turbo run build:web",
    ]
  : ["pnpm", "turbo", "run", "build:web"];

if (!hasConvexDeployCredentials) {
  console.log(
    "[vercel-build] No Convex deploy credentials found; building web against the configured Convex URL.",
  );
}

const result = spawnSync(command[0], command.slice(1), {
  stdio: "inherit",
  shell: false,
});

process.exit(result.status ?? 1);
