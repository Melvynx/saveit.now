import { copyFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../../..");
const pnpmRoot = path.join(monorepoRoot, "node_modules", ".pnpm");

if (process.env.EAS_BUILD_PLATFORM !== "ios" || process.platform !== "darwin") {
  process.exit(0);
}

if (!existsSync(pnpmRoot)) {
  console.warn("[eas] pnpm store not found, skipping lightningcss binary repair");
  process.exit(0);
}

const arch = process.arch;
const binaryName = `lightningcss.darwin-${arch}.node`;
const packagePrefix = `lightningcss-darwin-${arch}@`;
const sourcePackage = readdirSync(pnpmRoot).find((entry) =>
  entry.startsWith(packagePrefix),
);

if (!sourcePackage) {
  console.warn(`[eas] ${packagePrefix} package not found, skipping lightningcss binary repair`);
  process.exit(0);
}

const source = path.join(
  pnpmRoot,
  sourcePackage,
  "node_modules",
  `lightningcss-darwin-${arch}`,
  binaryName,
);

if (!existsSync(source)) {
  console.warn(`[eas] ${binaryName} not found, skipping lightningcss binary repair`);
  process.exit(0);
}

for (const entry of readdirSync(pnpmRoot)) {
  if (!entry.startsWith("lightningcss@")) continue;

  const target = path.join(
    pnpmRoot,
    entry,
    "node_modules",
    "lightningcss",
    binaryName,
  );

  if (!existsSync(target)) {
    copyFileSync(source, target);
    console.log(`[eas] installed ${binaryName} into ${entry}`);
  }
}
