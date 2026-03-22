import { parseBookmarkBody } from "@/lib/api/parse-bookmark-body";
import { BookmarkValidationError } from "@/lib/database/bookmark-validation";
import { createBookmark } from "@/lib/database/create-bookmark";
import { apiRoute } from "@/lib/safe-route";
import { cachedAdvancedSearch } from "@/lib/search/cached-search";
import { BookmarkType } from "@workspace/database";
import { NextResponse } from "next/server";
import { z } from "zod";

export const POST = apiRoute.body(z.any()).handler(async (req, { ctx, body }) => {
  try {
    const contentType = req.headers.get("content-type") || "";
    let url: string | undefined;
    let transcript: string | undefined;
    let metadata: Record<string, unknown> | undefined;

    if (contentType.includes("multipart/form-data")) {
      const result = await parseBookmarkBody(req, ctx.user.id);
      if (!result.success) return result.error;
      url = result.data.url;
      transcript = result.data.transcript;
      metadata = result.data.metadata;
    } else {
      url = body?.url;
      transcript = body?.transcript;
      metadata = body?.metadata;
    }

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required", success: false },
        { status: 400 },
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format", success: false },
        { status: 400 },
      );
    }

    const bookmark = await createBookmark({
      url,
      userId: ctx.user.id,
      transcript,
      metadata,
    });

    return {
      success: true,
      bookmark: {
        id: bookmark.id,
        url: bookmark.url,
        title: bookmark.title,
        summary: bookmark.summary,
        type: bookmark.type,
        status: bookmark.status,
        starred: bookmark.starred,
        read: bookmark.read,
        createdAt: bookmark.createdAt,
        updatedAt: bookmark.updatedAt,
      },
    };
  } catch (error: unknown) {
    if (error instanceof BookmarkValidationError) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 400 },
      );
    }

    throw error;
  }
});

export const GET = apiRoute
  .query(
    z.object({
      query: z.string().optional(),
      tags: z.string().optional(),
      types: z.string().optional(),
      special: z.enum(["READ", "UNREAD", "STAR"]).optional(),
      limit: z.coerce.number().min(1).max(100).optional().default(20),
      cursor: z.string().optional(),
      matchingDistance: z.coerce.number().min(0.1).max(2).optional(),
    }),
  )
  .handler(async (_, { ctx, query }) => {
    const validBookmarkTypes = Object.values(BookmarkType);
    const types = query.types
      ? query.types
          .split(",")
          .filter(Boolean)
          .filter((type): type is BookmarkType =>
            validBookmarkTypes.includes(type as BookmarkType),
          )
      : [];

    const tags = query.tags ? query.tags.split(",").filter(Boolean) : [];

    const result = await cachedAdvancedSearch({
      userId: ctx.user.id,
      query: query.query,
      tags,
      types,
      specialFilters: query.special ? [query.special] : [],
      limit: query.limit,
      cursor: query.cursor,
      matchingDistance: query.matchingDistance || 0.3,
    });

    return {
      success: true,
      bookmarks: result.bookmarks.map((bookmark) => ({
        id: bookmark.id,
        url: bookmark.url,
        title: bookmark.title,
        summary: bookmark.summary,
        type: bookmark.type,
        status: bookmark.status,
        starred: bookmark.starred,
        read: bookmark.read,
        preview: bookmark.preview,
        faviconUrl: bookmark.faviconUrl,
        ogImageUrl: bookmark.ogImageUrl,
        ogDescription: bookmark.ogDescription,
        createdAt: bookmark.createdAt,
        metadata: bookmark.metadata,
        matchedTags: bookmark.matchedTags,
        score: bookmark.score,
        matchType: bookmark.matchType,
      })),
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    };
  });
