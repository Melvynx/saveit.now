// httpActions MUST run in the default (V8) runtime — never "use node".
// R2 uploads are delegated to the node action internal.files.actions.uploadBuffer.
//
// Browser-extension endpoints (session-cookie auth):
//   POST /api/bookmarks                        — create bookmark (Chrome + Firefox)
//   POST /api/bookmarks/:id/upload-screenshot  — upload screenshot (Chrome only)
//
// Auth: Better Auth session cookie (credentials: "include") via authComponent.getAuth.
// CORS: explicit app origins plus configured extension origins.

import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { authComponent, createAuth } from "../auth/config";

// ---------------------------------------------------------------------------
// CORS helpers — extension origins included
// ---------------------------------------------------------------------------

const CONFIGURED_EXTENSION_ORIGINS = (
  process.env.EXTENSION_ALLOWED_ORIGINS ?? ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedExtensionOrigin(origin: string): boolean {
  if (CONFIGURED_EXTENSION_ORIGINS.includes(origin)) return true;

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  if (
    parsed.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(parsed.hostname)
  ) {
    return true;
  }

  if (parsed.protocol !== "https:") return false;

  if (
    parsed.hostname === "saveit.now" ||
    parsed.hostname.endsWith(".saveit.now")
  ) {
    return true;
  }

  return /^saveit-now(?:-[a-z0-9-]+)?-codelynx\.vercel\.app$/.test(
    parsed.hostname,
  );
}

function corsHeaders(origin?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && isAllowedExtensionOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
}

function errResponse(
  message: string,
  status: number,
  origin?: string | null,
): Response {
  return new Response(JSON.stringify({ error: message, success: false }), {
    status,
    headers: corsHeaders(origin),
  });
}

// ---------------------------------------------------------------------------
// Session auth helper for httpActions
// ---------------------------------------------------------------------------

async function getSessionUser(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  request: Request,
): Promise<{ id: string } | null> {
  try {
    const { auth } = await authComponent.getAuth(createAuth, ctx);
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return null;
    return { id: session.user.id };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// POST /api/bookmarks  (Spec 09 §4.2)
// Session-cookie auth. Returns { status: "ok", bookmark: { id, ... } }.
// Error strings preserve the exact substrings the extension detects:
//   "already exists"         → errorType: BOOKMARK_ALREADY_EXISTS
//   "maximum number of bookmarks" → errorType: MAX_BOOKMARKS
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_EXT = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES_EXT = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const extensionCreateBookmark = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const user = await getSessionUser(ctx, request);
  if (!user) {
    return errResponse("You must be logged in to save a bookmark", 401, origin);
  }

  let bookmarkUrl: string | undefined;
  let transcript: string | undefined;
  let metadata: Record<string, unknown> | undefined;

  const ct = request.headers.get("content-type") ?? "";

  if (ct.includes("multipart/form-data")) {
    const fd = (await request.formData()) as unknown as {
      get(name: string): unknown;
    };
    bookmarkUrl = (fd.get("url") as string | null) ?? undefined;
    transcript = (fd.get("transcript") as string | null) ?? undefined;
    const metaRaw = fd.get("metadata") as string | null;
    if (metaRaw) {
      try {
        metadata = JSON.parse(metaRaw);
      } catch {
        /* ignore */
      }
    }
  } else {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errResponse("URL is required", 400, origin);
    }
    const parsed = body as Record<string, unknown>;
    bookmarkUrl = (parsed.url as string | undefined) ?? undefined;
    transcript = (parsed.transcript as string | undefined) ?? undefined;
    metadata =
      (parsed.metadata as Record<string, unknown> | undefined) ?? undefined;
  }

  if (!bookmarkUrl) {
    return errResponse("URL is required", 400, origin);
  }

  try {
    new URL(bookmarkUrl);
  } catch {
    return errResponse("Invalid URL format", 400, origin);
  }

  try {
    const bookmark = await ctx.runAction(
      internal.api.helpers.createBookmarkForUser,
      {
        userId: user.id,
        url: bookmarkUrl,
        transcript,
        metadata,
      },
    );

    return new Response(
      JSON.stringify({
        status: "ok",
        bookmark: {
          id:
            (bookmark as Record<string, unknown>)?._id ??
            (bookmark as Record<string, unknown>)?.id,
          url: (bookmark as Record<string, unknown>)?.url,
          title: (bookmark as Record<string, unknown>)?.title ?? null,
          summary: (bookmark as Record<string, unknown>)?.summary ?? null,
          type: (bookmark as Record<string, unknown>)?.type ?? null,
          status: (bookmark as Record<string, unknown>)?.status,
          starred: (bookmark as Record<string, unknown>)?.starred,
          read: (bookmark as Record<string, unknown>)?.read,
          createdAt:
            typeof (bookmark as Record<string, unknown>)?.createdAt === "number"
              ? new Date(
                  (bookmark as Record<string, unknown>).createdAt as number,
                ).toISOString()
              : (bookmark as Record<string, unknown>)?.createdAt,
        },
        success: true,
      }),
      { status: 200, headers: corsHeaders(origin) },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Preserve error substrings the extension detects:
    if (msg.includes("already exists")) {
      return errResponse("Bookmark already exists for this URL", 400, origin);
    }
    if (msg.includes("maximum number of bookmarks")) {
      return errResponse(msg, 400, origin);
    }
    console.error("[ext POST /api/bookmarks]", err);
    return errResponse("An error occurred", 500, origin);
  }
});

// ---------------------------------------------------------------------------
// POST /api/bookmarks/:id/upload-screenshot  (Spec 09 §4.3)
// Session-cookie auth. Multipart with field "file" (PNG blob).
// Only used by Chrome extension (Firefox has no screenshot).
// ---------------------------------------------------------------------------

export const extensionUploadScreenshot = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const user = await getSessionUser(ctx, request);
  if (!user) {
    return errResponse(
      "You must be logged in to upload a screenshot",
      401,
      origin,
    );
  }

  // Extract bookmarkId from path: /api/bookmarks/:id/upload-screenshot
  const urlPath = new URL(request.url).pathname;
  const parts = urlPath.split("/");
  // parts: ["", "api", "bookmarks", ":id", "upload-screenshot"]
  const bookmarkId = parts[3];

  if (!bookmarkId) {
    return errResponse("Bookmark ID is required", 400, origin);
  }

  let fileData: ArrayBuffer | null = null;
  let fileName = "screenshot.png";
  let contentType = "image/png";

  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const fd = (await request.formData()) as unknown as {
      get(name: string): unknown;
    };
    const fileEntry = fd.get("file");
    if (!(fileEntry instanceof File)) {
      return errResponse("No file provided", 400, origin);
    }
    fileName = fileEntry.name || "screenshot.png";
    contentType = fileEntry.type || "image/png";
    fileData = await fileEntry.arrayBuffer();
  } else {
    // Fallback: raw binary body
    fileData = await request.arrayBuffer();
    contentType = ct || "image/png";
  }

  if (!fileData) {
    return errResponse("No file provided", 400, origin);
  }

  if (fileData.byteLength > MAX_FILE_SIZE_EXT) {
    return errResponse("File size must be less than 2MB", 400, origin);
  }

  if (!ALLOWED_IMAGE_TYPES_EXT.includes(contentType)) {
    return errResponse(
      "Only image files (JPEG, PNG, WebP, GIF) are allowed",
      400,
      origin,
    );
  }

  const bookmark = await ctx
    .runQuery(internal.bookmarks.queries.getById, {
      id: bookmarkId as never,
      userId: user.id,
    })
    .catch(() => null);
  if (!bookmark) {
    return errResponse("Bookmark not found", 404, origin);
  }

  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
  const key = `users/${user.id}/bookmarks/${bookmarkId}/${Date.now()}-${safeFileName}`;

  let previewUrl: string;
  try {
    previewUrl = await ctx.runAction(internal.files.actions.uploadBuffer, {
      buffer: fileData,
      key,
      contentType,
    });
  } catch (err) {
    console.error("[ext upload-screenshot] uploadBuffer failed", err);
    return errResponse("Failed to upload screenshot", 500, origin);
  }

  try {
    await ctx.runMutation(internal.bookmarks.mutations.updatePreview, {
      id: bookmarkId as never,
      userId: user.id,
      preview: previewUrl,
    });
  } catch (err) {
    console.warn("[ext upload-screenshot] updatePreview failed", err);
    return errResponse("Failed to attach screenshot", 500, origin);
  }

  return new Response(
    JSON.stringify({
      success: true,
      previewUrl,
      bookmark: { id: bookmarkId },
    }),
    { status: 200, headers: corsHeaders(origin) },
  );
});
