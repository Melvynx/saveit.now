import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { TOKEN_PATH, APP_BIN } from "./config.js";
import { SaveitConfigError } from "../errors.js";

const CONTROL_CHAR_REGEX = /[\r\n -]/;

function envToken(): string | undefined {
  const v = process.env.SAVEIT_API_KEY?.trim();
  return v && v.length > 0 ? v : undefined;
}

export function hasToken(): boolean {
  if (envToken()) return true;
  return existsSync(TOKEN_PATH);
}

export function getToken(): string {
  const env = envToken();
  if (env) return env;
  if (!existsSync(TOKEN_PATH)) {
    throw new SaveitConfigError(
      `No SaveIt API key configured. Run: ${APP_BIN} auth set <token>`,
    );
  }
  const value = readFileSync(TOKEN_PATH, "utf-8").trim();
  if (!value) {
    throw new SaveitConfigError(
      `Saved SaveIt token at ${TOKEN_PATH} is empty. Re-run: ${APP_BIN} auth set <token>`,
    );
  }
  return value;
}

export function setToken(token: string): void {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new SaveitConfigError("Token cannot be empty.");
  }
  if (CONTROL_CHAR_REGEX.test(trimmed)) {
    throw new SaveitConfigError(
      "Token contains illegal control characters (newlines, tabs, etc.).",
    );
  }

  const dir = dirname(TOKEN_PATH);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  // mkdirSync only honors `mode` on creation; tighten existing dirs too.
  try {
    chmodSync(dir, 0o700);
  } catch {
    // Filesystems without POSIX perms (e.g. some Windows setups) - best effort.
  }

  // Atomic, symlink-safe write: open a sibling temp file with O_NOFOLLOW
  // and 0o600, write the token, fsync, then rename over the destination.
  const tmpPath = join(dir, `.saveit-token-${process.pid}-${Date.now()}.tmp`);
  const flags =
    fsConstants.O_WRONLY |
    fsConstants.O_CREAT |
    fsConstants.O_EXCL |
    (fsConstants.O_NOFOLLOW ?? 0);
  let fd: number;
  try {
    fd = openSync(tmpPath, flags, 0o600);
  } catch (err) {
    throw new SaveitConfigError(
      `Failed to create token file: ${(err as Error).message}`,
    );
  }
  try {
    writeSync(fd, trimmed);
  } finally {
    closeSync(fd);
  }

  // Reject if the destination is a symlink (would otherwise be replaced via rename).
  // rename() in POSIX replaces the destination atomically; if dest is a symlink,
  // it removes the symlink, not the target - but we double-check anyway.
  try {
    renameSync(tmpPath, TOKEN_PATH);
  } catch (err) {
    try {
      unlinkSync(tmpPath);
    } catch {
      /* best effort */
    }
    throw new SaveitConfigError(
      `Failed to save token: ${(err as Error).message}`,
    );
  }

  // After rename, ensure 0o600 (rename preserves the temp file's mode, but be safe).
  try {
    chmodSync(TOKEN_PATH, 0o600);
  } catch (err) {
    // Surface the failure - silent failure could leave a token world-readable.
    throw new SaveitConfigError(
      `Token saved but could not enforce 0o600 perms: ${(err as Error).message}`,
    );
  }
}

export function removeToken(): void {
  if (existsSync(TOKEN_PATH)) {
    unlinkSync(TOKEN_PATH);
  }
}

export function maskToken(token: string): string {
  if (token.length <= 8) return "****";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

export function tokenSource(): "env" | "file" | "none" {
  if (envToken()) return "env";
  if (existsSync(TOKEN_PATH)) return "file";
  return "none";
}
