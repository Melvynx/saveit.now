// httpActions MUST run in the default (V8) runtime — never "use node".
// R2 uploads are delegated to the node action internal.files.actions.uploadBuffer.
import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const VALID_BOOKMARK_TYPES = [
  "VIDEO",
  "ARTICLE",
  "PAGE",
  "IMAGE",
  "YOUTUBE",
  "TWEET",
  "PDF",
  "PRODUCT",
] as const;

type BookmarkType = (typeof VALID_BOOKMARK_TYPES)[number];

function isAllowedOrigin(origin: string): boolean {
  if (origin === "saveit://") return true;

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
  if (origin && isAllowedOrigin(origin)) {
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

type AuthResult = {
  user: { id: string };
  apiKey: { id: string; name: string };
};

/**
 * Validates the Authorization: Bearer header and resolves user + apiKey
 * via internal.apiKeys.actions.validateApiKey.
 * Returns AuthResult or an error Response.
 */
async function validateAuth(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  request: Request,
): Promise<AuthResult | Response> {
  const origin = request.headers.get("origin");
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return errResponse("Missing authorization header", 401, origin);
  }
  if (!authorization.startsWith("Bearer ")) {
    return errResponse("Invalid authorization header format", 401, origin);
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    return errResponse("Invalid authorization header format", 401, origin);
  }

  let result: AuthResult | null;
  try {
    result = await ctx.runAction(internal.apiKeys.actions.validateApiKey, {
      token,
    });
  } catch (err) {
    const data = (err as { data?: { code?: string; message?: string } }).data;
    if (data?.code === "FORBIDDEN") {
      return errResponse(data.message ?? "Pro plan required", 403, origin);
    }
    return errResponse("Invalid API key", 401, origin);
  }

  if (!result) {
    return errResponse("Invalid API key", 401, origin);
  }
  return result;
}

function parseTypes(typesParam: string | null): BookmarkType[] {
  if (!typesParam) return [];
  return typesParam
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter((t): t is BookmarkType =>
      (VALID_BOOKMARK_TYPES as readonly string[]).includes(t),
    );
}

function bookmarkToApiShape(b: Record<string, unknown>) {
  return {
    id: (b._id as string) ?? (b.id as string),
    url: b.url,
    title: (b.title as string | null) ?? null,
    summary: (b.summary as string | null) ?? null,
    type: (b.type as string | null) ?? null,
    status: b.status,
    starred: b.starred,
    read: b.read,
    preview: (b.preview as string | null) ?? null,
    faviconUrl: (b.faviconUrl as string | null) ?? null,
    ogImageUrl: (b.ogImageUrl as string | null) ?? null,
    ogDescription: (b.ogDescription as string | null) ?? null,
    createdAt:
      typeof b.createdAt === "number"
        ? new Date(b.createdAt).toISOString()
        : (b.createdAt as string),
    metadata: (b.metadata as Record<string, unknown> | null) ?? null,
    matchedTags: (b.matchedTags as string[]) ?? [],
    score: (b.score as number) ?? 0,
    matchType: (b.matchType as string) ?? "default",
  };
}

// ---------------------------------------------------------------------------
// GET /api/v1/bookmarks  (Spec 09 §3.1)
// ---------------------------------------------------------------------------
export const listBookmarks = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const auth = await validateAuth(ctx, request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const schema = z.object({
    query: z.string().optional(),
    tags: z.string().optional(),
    types: z.string().optional(),
    special: z.enum(["READ", "UNREAD", "STAR"]).optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    cursor: z.string().optional(),
    matchingDistance: z.coerce.number().min(0.1).max(2).default(0.3),
  });

  const pr = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!pr.success) {
    return errResponse("Invalid query", 400, origin);
  }

  const p = pr.data;
  const types = parseTypes(p.types ?? null);
  const tagsList = p.tags
    ? p.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  const specialFilters: string[] = p.special ? [p.special] : [];

  try {
    // Use internal.api.helpers.searchBookmarksForUser (internalAction, accepts userId)
    const result = await ctx.runAction(
      internal.api.helpers.searchBookmarksForUser,
      {
        userId: auth.user.id,
        query: p.query,
        tags: tagsList.length > 0 ? tagsList : undefined,
        types: types.length > 0 ? (types as string[]) : undefined,
        specialFilters: specialFilters.length > 0 ? specialFilters : undefined,
        limit: p.limit,
        cursor: p.cursor,
        matchingDistance: p.matchingDistance,
      },
    );

    return new Response(
      JSON.stringify({
        success: true,
        bookmarks: ((result as { bookmarks?: unknown[] }).bookmarks ?? []).map(
          (b) => bookmarkToApiShape(b as Record<string, unknown>),
        ),
        hasMore: (result as { hasMore?: boolean }).hasMore ?? false,
        nextCursor: (result as { nextCursor?: string }).nextCursor ?? null,
      }),
      { status: 200, headers: corsHeaders(origin) },
    );
  } catch (err) {
    console.error("[api/v1 GET /bookmarks]", err);
    return errResponse("An error occurred", 500, origin);
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/bookmarks  (Spec 09 §3.2)
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES_UPLOAD = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

async function uploadImageToR2(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  data: ArrayBuffer,
  key: string,
  contentType: string,
): Promise<string> {
  // Delegate to the node R2 action (V8 httpActions can't use Buffer / aws-sdk).
  return await ctx.runAction(internal.files.actions.uploadBuffer, {
    buffer: data,
    key,
    contentType,
  });
}

export const createBookmark = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const auth = await validateAuth(ctx, request);
  if (auth instanceof Response) return auth;

  const ct = request.headers.get("content-type") ?? "";
  let bookmarkUrl: string | null = null;
  let transcript: string | undefined;
  let metadata: Record<string, unknown> | undefined;

  if (ct.includes("multipart/form-data")) {
    const fd = (await request.formData()) as unknown as {
      get(name: string): unknown;
    };
    bookmarkUrl = (fd.get("url") as string | null) ?? null;
    transcript = (fd.get("transcript") as string) || undefined;
    const metaRaw = fd.get("metadata") as string | null;
    if (metaRaw) {
      try {
        metadata = JSON.parse(metaRaw);
      } catch {
        /* ignore */
      }
    }
    const imageFile = fd.get("image");
    if (imageFile instanceof File) {
      if (imageFile.size > MAX_FILE_SIZE) {
        return errResponse("File size must be less than 2MB", 400, origin);
      }
      if (!ALLOWED_IMAGE_TYPES_UPLOAD.includes(imageFile.type)) {
        return errResponse(
          "Only image files (JPEG, PNG, WebP, GIF) are allowed",
          400,
          origin,
        );
      }
      const ext = imageFile.type.split("/")[1] ?? "png";
      const key = `users/${auth.user.id}/bookmarks/upload-${Date.now()}.${ext}`;
      const buf = await imageFile.arrayBuffer();
      bookmarkUrl = await uploadImageToR2(ctx, buf, key, imageFile.type);
    }
  } else {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errResponse("URL is required", 400, origin);
    }
    const pr = z
      .object({
        url: z.string().min(1),
        transcript: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .safeParse(body);
    if (!pr.success) return errResponse("URL is required", 400, origin);
    bookmarkUrl = pr.data.url;
    transcript = pr.data.transcript;
    metadata = pr.data.metadata;
  }

  if (!bookmarkUrl) return errResponse("URL is required", 400, origin);
  try {
    new URL(bookmarkUrl);
  } catch {
    return errResponse("Invalid URL format", 400, origin);
  }

  try {
    // Call internal.bookmarks.mutations.createForApiKey — an internal mutation
    // that accepts userId (defined in bookmarks/mutations.ts by that agent).
    // Per Contract §B this dispatches to the same create logic.
    const bookmark = await ctx.runAction(
      internal.api.helpers.createBookmarkForUser,
      {
        userId: auth.user.id,
        url: bookmarkUrl,
        transcript,
        metadata,
      },
    );

    return new Response(
      JSON.stringify({
        success: true,
        bookmark: {
          id:
            (bookmark as Record<string, unknown>)._id ??
            (bookmark as Record<string, unknown>).id,
          url: (bookmark as Record<string, unknown>).url,
          title: (bookmark as Record<string, unknown>).title ?? null,
          summary: (bookmark as Record<string, unknown>).summary ?? null,
          type: (bookmark as Record<string, unknown>).type ?? null,
          status: (bookmark as Record<string, unknown>).status,
          starred: (bookmark as Record<string, unknown>).starred,
          read: (bookmark as Record<string, unknown>).read,
          createdAt:
            typeof (bookmark as Record<string, unknown>).createdAt === "number"
              ? new Date(
                  (bookmark as Record<string, unknown>).createdAt as number,
                ).toISOString()
              : (bookmark as Record<string, unknown>).createdAt,
          updatedAt:
            typeof (bookmark as Record<string, unknown>).updatedAt === "number"
              ? new Date(
                  (bookmark as Record<string, unknown>).updatedAt as number,
                ).toISOString()
              : (bookmark as Record<string, unknown>).updatedAt,
        },
      }),
      { status: 201, headers: corsHeaders(origin) },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("already exists") ||
      msg.includes("maximum number of bookmarks")
    ) {
      return errResponse(msg, 400, origin);
    }
    console.error("[api/v1 POST /bookmarks]", err);
    return errResponse("An error occurred", 500, origin);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/bookmarks/:bookmarkId  (Spec 09 §3.3)
// ---------------------------------------------------------------------------
export const deleteBookmark = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const auth = await validateAuth(ctx, request);
  if (auth instanceof Response) return auth;

  const urlPath = new URL(request.url).pathname;
  const parts = urlPath.split("/");
  const bookmarkId = parts[parts.length - 1];

  if (!bookmarkId) return errResponse("Bookmark ID is required", 400, origin);

  try {
    await ctx.runAction(internal.api.helpers.deleteBookmarkForUser, {
      userId: auth.user.id,
      bookmarkId,
    });

    return new Response(
      JSON.stringify({ success: true, bookmark: { id: bookmarkId } }),
      { status: 200, headers: corsHeaders(origin) },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("NOT_FOUND") || msg.includes("not found")) {
      return errResponse("Bookmark not found", 404, origin);
    }
    console.error("[api/v1 DELETE /bookmarks/:id]", err);
    return errResponse("An error occurred", 500, origin);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/bookmarks/random  (Spec 09 §3.4)
// ---------------------------------------------------------------------------
export const randomBookmark = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const auth = await validateAuth(ctx, request);
  if (auth instanceof Response) return auth;

  try {
    // internal.bookmarks.queries.getRandom — internalQuery per Contract §A
    const result = await ctx.runQuery(internal.bookmarks.queries.getRandom, {
      userId: auth.user.id,
    });

    if (!result || !result.bookmark) {
      // Count total opened for the response
      const totalOpened = await ctx.runQuery(
        internal.api.helpers.countOpenedBookmarks,
        { userId: auth.user.id },
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "No more bookmarks available. All bookmarks have been opened.",
          totalOpened,
        }),
        { status: 404, headers: corsHeaders(origin) },
      );
    }

    const { bookmark, remaining } = result;

    // Record the open — use recordOpen authMutation via internal helper
    await ctx.runAction(internal.api.helpers.recordBookmarkOpenForUser, {
      userId: auth.user.id,
      bookmarkId: (bookmark as Record<string, unknown>)._id as string,
    });

    return new Response(
      JSON.stringify({
        success: true,
        bookmark: {
          id:
            (bookmark as Record<string, unknown>)._id ??
            (bookmark as Record<string, unknown>).id,
          url: (bookmark as Record<string, unknown>).url,
          title: (bookmark as Record<string, unknown>).title ?? null,
          summary: (bookmark as Record<string, unknown>).summary ?? null,
          type: (bookmark as Record<string, unknown>).type ?? null,
          status: (bookmark as Record<string, unknown>).status,
          starred: (bookmark as Record<string, unknown>).starred,
          read: (bookmark as Record<string, unknown>).read,
          preview: (bookmark as Record<string, unknown>).preview ?? null,
          faviconUrl: (bookmark as Record<string, unknown>).faviconUrl ?? null,
          ogImageUrl: (bookmark as Record<string, unknown>).ogImageUrl ?? null,
          ogDescription:
            (bookmark as Record<string, unknown>).ogDescription ?? null,
          createdAt:
            typeof (bookmark as Record<string, unknown>).createdAt === "number"
              ? new Date(
                  (bookmark as Record<string, unknown>).createdAt as number,
                ).toISOString()
              : (bookmark as Record<string, unknown>).createdAt,
          tags: (
            ((bookmark as Record<string, unknown>).tags as Array<
              { tag: { name: string } } | string
            >) ?? []
          ).map((t) => (typeof t === "string" ? t : (t.tag?.name ?? t))),
        },
        remaining,
      }),
      { status: 200, headers: corsHeaders(origin) },
    );
  } catch (err) {
    console.error("[api/v1 GET /bookmarks/random]", err);
    return errResponse("An error occurred", 500, origin);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/tags  (Spec 09 §3.5)
// ---------------------------------------------------------------------------
export const listTags = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const auth = await validateAuth(ctx, request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const schema = z.object({
    limit: z.coerce.number().min(1).max(100).default(20),
    cursor: z.string().optional(),
  });
  const pr = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!pr.success) return errResponse("Invalid query", 400, origin);

  const { limit, cursor } = pr.data;

  try {
    const result = await ctx.runQuery(internal.api.helpers.listTagsForUser, {
      userId: auth.user.id,
      limit,
      cursor,
    });

    return new Response(
      JSON.stringify({
        success: true,
        tags: (result as { tags: unknown[] }).tags,
        hasMore: (result as { hasMore: boolean }).hasMore,
        nextCursor:
          (result as { nextCursor: string | null }).nextCursor ?? null,
      }),
      { status: 200, headers: corsHeaders(origin) },
    );
  } catch (err) {
    console.error("[api/v1 GET /tags]", err);
    return errResponse("An error occurred", 500, origin);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/public/:slug/bookmarks  (Spec 09 §3.6)
// ---------------------------------------------------------------------------
export const publicSlugBookmarks = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  // Extract slug from URL: /api/v1/public/:slug/bookmarks
  const urlPath = new URL(request.url).pathname;
  const pathParts = urlPath.split("/");
  const slugIndex = pathParts.indexOf("public") + 1;
  const slug = pathParts[slugIndex];

  if (!slug) return errResponse("Slug is required", 400, origin);

  const urlObj = new URL(request.url);
  const schema = z.object({
    query: z.string().optional(),
    tags: z.string().optional(),
    types: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    cursor: z.string().optional(),
  });
  const pr = schema.safeParse(
    Object.fromEntries(urlObj.searchParams.entries()),
  );
  if (!pr.success) return errResponse("Invalid query", 400, origin);

  const p = pr.data;
  const types = parseTypes(p.types ?? null);
  const tagsList = p.tags
    ? p.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  try {
    // Use internal.api.helpers.publicSlugSearchAction which handles:
    // 1. getUserByPublicSlug lookup + publicLinkEnabled check
    // 2. Full search with query/tags/types support
    // 3. Returns { user: {name, image}, bookmarks: PublicBookmarkDTO[], hasMore, nextCursor }
    const result = await ctx.runAction(
      internal.api.helpers.publicSlugSearchAction,
      {
        slug,
        query: p.query,
        tags: tagsList.length > 0 ? tagsList : undefined,
        types: types.length > 0 ? (types as string[]) : undefined,
        limit: p.limit,
        cursor: p.cursor,
      },
    );

    if (!result) {
      return errResponse("Public page not found", 404, origin);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: (result as { user: { name: string; image: string | null } }).user,
        bookmarks: (
          (result as { bookmarks: Record<string, unknown>[] }).bookmarks ?? []
        ).map((b) => ({
          id: b._id ?? b.id,
          url: b.url,
          title: b.title ?? null,
          type: b.type ?? null,
          summary: b.summary ?? null,
          preview: b.preview ?? null,
          faviconUrl: b.faviconUrl ?? null,
          ogImageUrl: b.ogImageUrl ?? null,
          ogDescription: b.ogDescription ?? null,
          createdAt:
            typeof b.createdAt === "number"
              ? new Date(b.createdAt as number).toISOString()
              : b.createdAt,
          status: b.status,
          starred: false as const,
          read: false as const,
          matchedTags: (b.matchedTags as string[]) ?? [],
          metadata: b.metadata ?? null,
        })),
        hasMore: (result as { hasMore: boolean }).hasMore ?? false,
        nextCursor: (result as { nextCursor?: string }).nextCursor ?? null,
      }),
      { status: 200, headers: corsHeaders(origin) },
    );
  } catch (err) {
    console.error("[api/v1 GET /public/:slug/bookmarks]", err);
    return errResponse("An error occurred", 500, origin);
  }
});
