import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth/config";
import {
  createBookmark,
  deleteBookmark,
  listBookmarks,
  listTags,
  publicSlugBookmarks,
  randomBookmark,
} from "./api/v1";
import {
  extensionCreateBookmark,
  extensionUploadScreenshot,
} from "./api/extensions";
import { chatStreamHandler } from "./chat/stream";
import {
  extractContent,
  extractFavicons,
  extractMetadata,
  extractOgImages,
  youtubeMetadata,
} from "./tools/actions";
import { unsubscribe } from "./auth/mutations";

const http = httpRouter();

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function decodeBase64UrlJson(segment: string): Record<string, unknown> | null {
  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return asRecord(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

function decodeJwsPayload(jws: string): Record<string, unknown> | null {
  const [, payload] = jws.split(".");
  return payload ? decodeBase64UrlJson(payload) : null;
}

function extractOriginalTransactionIdFromNotification(signedPayload: string) {
  const notification = decodeJwsPayload(signedPayload);
  const data = asRecord(notification?.data);
  const transaction = decodeJwsPayload(
    getString(data?.signedTransactionInfo) ?? "",
  );
  const renewal = decodeJwsPayload(getString(data?.signedRenewalInfo) ?? "");

  return (
    getString(transaction?.originalTransactionId) ??
    getString(renewal?.originalTransactionId) ??
    getString(data?.originalTransactionId)
  );
}

// --- Better Auth HTTP routes (/api/auth/*) on the .convex.site domain ---
authComponent.registerRoutes(http, createAuth);

// --- Stripe webhook (raw body + signature verification happens in the action) ---
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") ?? "";
    const result = await ctx.runAction(internal.stripe.actions.processWebhook, {
      body,
      signature,
    });
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 400,
    });
  }),
});

// --- App Store Server Notifications v2 ---
http.route({
  path: "/appstore/notifications",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false }), { status: 400 });
    }

    const signedPayload = getString(asRecord(payload)?.signedPayload);
    if (!signedPayload) {
      console.warn("[appstore.notifications] missing signedPayload");
      return new Response(
        JSON.stringify({ ok: true, skipped: "missing_payload" }),
        { status: 200 },
      );
    }

    try {
      const originalTransactionId =
        extractOriginalTransactionIdFromNotification(signedPayload);

      if (!originalTransactionId) {
        console.warn(
          "[appstore.notifications] could not extract originalTransactionId",
        );
        return new Response(
          JSON.stringify({ ok: true, skipped: "missing_transaction" }),
          { status: 200 },
        );
      }

      await ctx.scheduler.runAfter(
        0,
        internal.appstore.actions.refreshFromNotification,
        { originalTransactionId },
      );

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch (error) {
      console.error("[appstore.notifications] failed to schedule refresh", error);
      return new Response(
        JSON.stringify({ ok: true, skipped: "schedule_failed" }),
        { status: 200 },
      );
    }
  }),
});

// --- AI chat stream (Vercel AI SDK protocol) ---
http.route({ path: "/chat", method: "POST", handler: chatStreamHandler });
http.route({ path: "/chat", method: "OPTIONS", handler: chatStreamHandler });

// --- Public API v1 (SDK / CLI; API-key auth inside each handler) ---
http.route({ path: "/api/v1/bookmarks", method: "GET", handler: listBookmarks });
http.route({ path: "/api/v1/bookmarks", method: "POST", handler: createBookmark });
http.route({ path: "/api/v1/bookmarks", method: "OPTIONS", handler: listBookmarks });
http.route({
  path: "/api/v1/bookmarks/random",
  method: "GET",
  handler: randomBookmark,
});
// DELETE /api/v1/bookmarks/:bookmarkId (handler parses the id from the path).
http.route({
  pathPrefix: "/api/v1/bookmarks/",
  method: "DELETE",
  handler: deleteBookmark,
});
http.route({
  pathPrefix: "/api/v1/bookmarks/",
  method: "OPTIONS",
  handler: deleteBookmark,
});
for (const method of ["GET", "POST", "OPTIONS"] as const) {
  http.route({ path: "/api/v1/tags", method, handler: listTags });
}
// GET /api/v1/public/:slug/bookmarks (handler parses :slug from the path).
http.route({
  pathPrefix: "/api/v1/public/",
  method: "GET",
  handler: publicSlugBookmarks,
});

// --- Public tools endpoints (rate-limited / Zod-validated inside handlers) ---
const toolRoutes: Array<[string, ReturnType<typeof httpAction>]> = [
  ["/api/tools/extract-content", extractContent],
  ["/api/tools/extract-metadata", extractMetadata],
  ["/api/tools/extract-favicons", extractFavicons],
  ["/api/tools/og-images", extractOgImages],
  ["/api/tools/youtube-metadata", youtubeMetadata],
];
for (const [path, handler] of toolRoutes) {
  http.route({ path, method: "POST", handler });
  http.route({ path, method: "OPTIONS", handler });
}

// --- Browser extension endpoints (session-cookie auth) ---
// POST /api/bookmarks — create bookmark (Chrome + Firefox)
http.route({ path: "/api/bookmarks", method: "POST", handler: extensionCreateBookmark });
http.route({ path: "/api/bookmarks", method: "OPTIONS", handler: extensionCreateBookmark });
// POST /api/bookmarks/:id/upload-screenshot — upload screenshot (Chrome only)
http.route({ pathPrefix: "/api/bookmarks/", method: "POST", handler: extensionUploadScreenshot });
http.route({ pathPrefix: "/api/bookmarks/", method: "OPTIONS", handler: extensionUploadScreenshot });

// --- Tokenized unsubscribe (HMAC verified inside the handler) ---
http.route({ pathPrefix: "/unsubscribe/", method: "GET", handler: unsubscribe });
http.route({ pathPrefix: "/unsubscribe/", method: "POST", handler: unsubscribe });

export default http;
