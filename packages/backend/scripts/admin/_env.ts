/**
 * Loads local admin env files before maintenance scripts read CONVEX_URL or
 * MIGRATION_SECRET. Existing process.env values win over file values.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const envPaths = [
  path.join(here, ".env"),
  path.join(here, "..", "migrate", ".env"),
];

for (const envPath of envPaths) {
  if (!fs.existsSync(envPath)) continue;

  const content = fs.readFileSync(envPath, "utf8");
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
  console.log(`[admin] loaded env from ${envPath}`);
}
