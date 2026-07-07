/**
 * Side-effect module: loads scripts/migrate/.env (gitignored) into process.env
 * BEFORE the migration scripts read DATABASE_URL / CONVEX_URL / MIGRATION_SECRET.
 * Import this FIRST in export-postgres.ts and import-convex.ts.
 * Existing process.env values are NOT overwritten (so you can still override
 * inline, e.g. `CONVEX_URL=<prod> pnpm tsx import-convex.ts`).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(here, ".env");

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
  console.log(`[migrate] loaded env from ${envPath}`);
}
