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

// --- RevenueCat webhook (shared secret in Authorization header) ---
http.route({
  path: "/revenuecat/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
    const authorization = request.headers.get("authorization");

    if (!webhookSecret || authorization !== webhookSecret) {
      return new Response(JSON.stringify({ ok: false }), { status: 401 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false }), { status: 400 });
    }

    const event =
      typeof payload === "object" &&
      payload !== null &&
      "event" in payload
        ? (payload as { event: unknown }).event
        : payload;

    try {
      const result = await ctx.runMutation(
        internal.revenuecat.webhook.processEvent,
        { event },
      );
      return new Response(JSON.stringify(result), {
        status: result.ok ? 200 : 400,
      });
    } catch (error) {
      console.error("[revenuecat.webhook] failed to process event", error);
      return new Response(JSON.stringify({ ok: false }), { status: 400 });
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
