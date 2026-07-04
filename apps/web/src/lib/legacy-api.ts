import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";

const allowedOrigins = [
  "saveit://*",
  "saveit://",
  "http://localhost:8081",
  "http://localhost:8081/*",
  "http://localhost:3000",
  "http://localhost:3000/*",
  "https://saveit.now",
  "https://saveit.now/*",
  "https://*.saveit.now",
  "https://saveit-now-web-codelynx.vercel.app",
  "https://saveit-now-web-git-main-codelynx.vercel.app",
  "https://saveit-now-*",
];

const bookmarkTypes = [
  "VIDEO",
  "ARTICLE",
  "PAGE",
  "IMAGE",
  "YOUTUBE",
  "TWEET",
  "PDF",
  "PRODUCT",
] as const;

export type LegacyBookmarkType = (typeof bookmarkTypes)[number];

type JsonInit = {
  request: Request;
  status?: number;
};

export function legacyCorsHeaders(request: Request): Headers {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  });

  const origin = request.headers.get("Origin") || "";
  const allowed = allowedOrigins.some((pattern) => {
    if (pattern.endsWith("*")) {
      return origin.startsWith(pattern.slice(0, -1));
    }
    return pattern === origin;
  });

  if (allowed) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  return headers;
}

export function legacyOptions(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: legacyCorsHeaders(request),
  });
}

export function legacyJson(data: unknown, init: JsonInit): Response {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: legacyCorsHeaders(init.request),
  });
}

export function legacyUnauthorized(request: Request): Response {
  return legacyJson({ error: "Unauthorized" }, { request, status: 403 });
}

export async function requireLegacySession(
  request: Request,
): Promise<Record<string, unknown> | Response> {
  try {
    const session = await fetchAuthQuery(api.auth.queries.getSession);
    const user = (session as { user?: Record<string, unknown> } | null)?.user;
    return user?.id ? user : legacyUnauthorized(request);
  } catch {
    return legacyUnauthorized(request);
  }
}

export function parseCommaList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseBookmarkTypes(value: string | null): LegacyBookmarkType[] {
  const validTypes = new Set<string>(bookmarkTypes);
  return parseCommaList(value)
    .map((type) => type.toUpperCase())
    .filter((type): type is LegacyBookmarkType => validTypes.has(type));
}

export function parseLimit(
  request: Request,
  value: string | null,
  fallback: number,
  max: number,
): number | Response {
  if (!value) return fallback;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > max) {
    return legacyJson({ error: "Invalid query" }, { request, status: 400 });
  }
  return limit;
}

function toIsoDate(value: unknown): unknown {
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }
  return value;
}

function normalizeTag(tag: unknown): Record<string, unknown> | null {
  if (!tag || typeof tag !== "object") return null;
  const record = tag as Record<string, unknown>;
  return {
    id: (record.id ?? record._id) as string,
    name: record.name,
    type: record.type,
  };
}

function normalizeBookmarkTags(tags: unknown): Array<{
  tag: Record<string, unknown>;
}> {
  if (!Array.isArray(tags)) return [];
  return tags.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const nested = normalizeTag(record.tag);
    const direct = normalizeTag(record);
    const tag = nested ?? direct;
    return tag ? [{ tag }] : [];
  });
}

export function normalizeLegacyBookmark(
  bookmark: unknown,
): Record<string, unknown> {
  const record =
    bookmark && typeof bookmark === "object"
      ? (bookmark as Record<string, unknown>)
      : {};

  return {
    id: record.id ?? record._id,
    ...(record.legacyId ? { legacyId: record.legacyId } : {}),
    url: record.url,
    title: record.title ?? null,
    preview: record.preview ?? null,
    starred: record.starred ?? false,
    read: record.read ?? false,
    createdAt: toIsoDate(record.createdAt),
    updatedAt: toIsoDate(record.updatedAt),
    summary: record.summary ?? null,
    type: record.type ?? null,
    faviconUrl: record.faviconUrl ?? null,
    ogImageUrl: record.ogImageUrl ?? null,
    ogDescription: record.ogDescription ?? null,
    status: record.status,
    metadata: record.metadata ?? null,
    tags: normalizeBookmarkTags(record.tags),
    matchedTags: record.matchedTags ?? [],
    score: record.score ?? 0,
    matchType: record.matchType ?? "default",
    openCount: record.openCount ?? 0,
    ...(record.note !== undefined ? { note: record.note } : {}),
    ...(record.processingError !== undefined
      ? { processingError: record.processingError }
      : {}),
    ...(record.processingStep !== undefined
      ? { processingStep: record.processingStep }
      : {}),
  };
}

export function normalizeSearchResponse(result: unknown): Record<string, unknown> {
  const record =
    result && typeof result === "object"
      ? (result as Record<string, unknown>)
      : {};
  const bookmarks = Array.isArray(record.bookmarks) ? record.bookmarks : [];

  return {
    bookmarks: bookmarks.map(normalizeLegacyBookmark),
    hasMore: record.hasMore ?? false,
    ...(record.nextCursor ? { nextCursor: record.nextCursor } : {}),
    ...(record.totalCount !== undefined ? { totalCount: record.totalCount } : {}),
    ...(record.queryTime !== undefined ? { queryTime: record.queryTime } : {}),
    ...(record.fromCache !== undefined ? { fromCache: record.fromCache } : {}),
  };
}

export function normalizeTagsResponse(result: unknown): Record<string, unknown> {
  const record =
    result && typeof result === "object"
      ? (result as Record<string, unknown>)
      : {};
  const page = Array.isArray(record.page) ? record.page : [];
  const isDone = record.isDone === true;

  return {
    tags: page.map(normalizeTag).filter(Boolean),
    nextCursor: isDone ? null : ((record.continueCursor as string) ?? null),
    hasNextPage: !isDone,
  };
}

export function normalizeUserLimitsResponse(
  result: unknown,
): Record<string, unknown> {
  const record =
    result && typeof result === "object"
      ? (result as Record<string, unknown>)
      : {};
  const subscription =
    record.subscription && typeof record.subscription === "object"
      ? (record.subscription as Record<string, unknown>)
      : null;

  return {
    plan: record.plan,
    limits: record.limits,
    customLimits: record.customLimits,
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          periodEnd: toIsoDate(subscription.periodEnd),
        }
      : null,
  };
}

export function legacyErrorResponse(error: unknown, request: Request): Response {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("Bookmark not found") ||
    message.toLowerCase().includes("not found")
  ) {
    return legacyJson({ error: "Bookmark not found" }, { request, status: 404 });
  }

  if (
    message.includes("does not support read") ||
    message.includes("Bug description must be at least 10 characters") ||
    message.includes("Invalid URL") ||
    message.includes("URL is required") ||
    message.includes("validation")
  ) {
    return legacyJson({ error: message }, { request, status: 400 });
  }

  console.error("[legacy-api]", error);
  return legacyJson(
    { error: "An unexpected error occurred" },
    { request, status: 500 },
  );
}
