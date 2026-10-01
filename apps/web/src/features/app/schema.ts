import { z } from "zod";

export const URL_SCHEMA = z.string().url();

/**
 * Turns what people paste into a URL the backend accepts: trims it and adds
 * `https://` to bare domains like `example.com/page`. Returns null when the
 * input still isn't an http(s) URL with a dotted host.
 */
export function normalizeBookmarkUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, "")}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return candidate;
  } catch {
    return null;
  }
}
