import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, chmodSync } from "fs";
import { dirname } from "path";
import { TOKEN_PATH, AUTH_TYPE, AUTH_HEADER, APP_CLI } from "./config.js";
import { CliError } from "./errors.js";

/** Check if a token is configured */
export function hasToken(): boolean {
  return existsSync(TOKEN_PATH);
}

/** Read the stored token. Throws if not configured. */
export function getToken(): string {
  if (!hasToken()) {
    throw new CliError(2, "No token configured.", `Run: ${APP_CLI} auth set <token>`);
  }
  return readFileSync(TOKEN_PATH, "utf-8").trim();
}

/** Save a token to disk with restricted permissions (chmod 600). */
export function setToken(token: string): void {
  mkdirSync(dirname(TOKEN_PATH), { recursive: true, mode: 0o700 });
  writeFileSync(TOKEN_PATH, token.trim(), { mode: 0o600 });
  // Ensure permissions even if file existed
  chmodSync(TOKEN_PATH, 0o600);
}

/** Delete the stored token. */
export function removeToken(): void {
  if (existsSync(TOKEN_PATH)) {
    unlinkSync(TOKEN_PATH);
  }
}

/** Mask a token for display: "sk-abc...wxyz" */
export function maskToken(token: string): string {
  if (token.length <= 8) return "****";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

/** Build the auth header based on configured auth type. */
export function buildAuthHeaders(): Record<string, string> {
  const token = getToken();

  switch (AUTH_TYPE) {
    case "bearer":
      return { [AUTH_HEADER]: `Bearer ${token}` };
    case "api-key":
      return { [AUTH_HEADER]: token };
    case "basic":
      return { Authorization: `Basic ${Buffer.from(token).toString("base64")}` };
    default:
      return { [AUTH_HEADER]: token };
  }
}
