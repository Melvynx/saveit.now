"use node";

/**
 * tools/node_fetch.ts — SSRF-safe fetch for the public tool HTTP endpoints.
 *
 * The tool httpActions (extract-metadata, og-images, extract-favicons, ...)
 * run in the default V8 runtime, which has no `node:dns`, so they can only
 * validate URL *literals* — a hostname that resolves to a private IP would
 * still be fetched. These endpoints are unauthenticated, so that is a real
 * SSRF vector. This internalAction runs in the Node runtime and routes the
 * fetch through `safeFetch`, which resolves DNS and re-validates every
 * redirect hop. The httpActions call it via `ctx.runAction`.
 */

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { safeFetch } from "../lib/safe_fetch";

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_BYTES = 1_000_000;

export const safeToolFetch = internalAction({
  args: {
    url: v.string(),
    method: v.optional(v.union(v.literal("GET"), v.literal("HEAD"))),
    userAgent: v.optional(v.string()),
    timeoutMs: v.optional(v.number()),
    maxBytes: v.optional(v.number()),
    readBody: v.optional(v.boolean()),
  },
  returns: v.object({
    ok: v.boolean(),
    status: v.number(),
    contentType: v.union(v.string(), v.null()),
    body: v.string(),
  }),
  handler: async (_ctx, args) => {
    const method = args.method ?? "GET";
    const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxBytes = args.maxBytes ?? DEFAULT_MAX_BYTES;

    const response = await safeFetch(args.url, {
      method,
      headers: args.userAgent ? { "User-Agent": args.userAgent } : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });

    const contentType = response.headers.get("content-type");

    if (method === "HEAD" || !args.readBody) {
      await response.body?.cancel();
      return { ok: response.ok, status: response.status, contentType, body: "" };
    }

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > maxBytes) {
      await response.body?.cancel();
      throw new Error("Response is too large");
    }

    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new Error("Response is too large");
    }

    return { ok: response.ok, status: response.status, contentType, body: text };
  },
});
