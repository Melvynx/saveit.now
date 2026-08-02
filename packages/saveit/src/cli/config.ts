import { homedir } from "node:os";
import { join } from "node:path";

export const APP_NAME = "saveitnow";
export const APP_BIN = "saveitnow";

const TOKENS_DIR = join(homedir(), ".config", "tokens");

export const TOKEN_PATH = join(TOKENS_DIR, `${APP_NAME}.txt`);

/**
 * Token files written by earlier releases. Read-only fallbacks so users who
 * authenticated with `saveit` (0.x) or the old `saveitnow-cli` keep working.
 */
export const LEGACY_TOKEN_PATHS = [
  join(TOKENS_DIR, "saveit.txt"),
  join(TOKENS_DIR, "saveitnow-cli.txt"),
];

export const globalFlags = {
  json: false,
  format: "text" as "text" | "json" | "csv" | "yaml",
  verbose: false,
  noColor: false,
  noHeader: false,
};
