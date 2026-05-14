import { homedir } from "node:os";
import { join } from "node:path";

export const APP_NAME = "saveit";
export const APP_BIN = "saveit";

export const TOKEN_PATH = join(homedir(), ".config", "tokens", `${APP_NAME}.txt`);

export const globalFlags = {
  json: false,
  format: "text" as "text" | "json" | "csv" | "yaml",
  verbose: false,
  noColor: false,
  noHeader: false,
};
