import { parseBookmarkBody } from "@/lib/api/parse-bookmark-body";
import { BookmarkValidationError } from "@/lib/database/bookmark-validation";
import { createBookmark } from "@/lib/database/create-bookmark";
import { userRoute } from "@/lib/safe-route";
import { cachedAdvancedSearch } from "@/lib/search/cached-search";
import { BookmarkType } from "@workspace/database";
import { NextResponse } from "next/server";
import { z } from "zod";

export const POST = userRoute.body(z.any()).handler(async (req, { ctx, body }) => {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const result = await parseBookmarkBody(req, ctx.user.id);
      if (!result.success) return result.error;
      const { url, transcript, metadata } = result.data;
      const bookmark = await createBookmark({
        url,
        userId: ctx.user.id,
        transcript,
        metadata: metadata as Record<string, any> | undefined,
      });
      return { status: "ok", bookmark };
    }

    const url = body?.url;
    const transcript = body?.transcript;
    const metadata = body?.metadata;

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
      metadata: metadata as Record<string, any> | undefined,
    });

    return { status: "ok", bookmark };
  } catch (error: unknown) {
    if (error instanceof BookmarkValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
});

export const GET = userRoute
  .query(
    z.object({
      query: z.string().optional(),
      tags: z.string().optional(),
      types: z.string().optional(),
      special: z.string().optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().min(1).max(50).optional(),
      matchingDistance: z.coerce.number().min(0.1).max(2).optional(),
    }),
  )
  .handler(async (req, { ctx, query }) => {
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

    const validSpecialFilters = ["READ", "UNREAD", "STAR"];

    const specialFilters = query.special
      ? query.special
          .split(",")
          .filter(Boolean)
          .filter((filter): filter is "READ" | "UNREAD" | "STAR" =>
            validSpecialFilters.includes(filter),
          )
      : [];

    const searchResults = await cachedAdvancedSearch({
      userId: ctx.user.id,
      query: query.query,
      tags,
      types,
      specialFilters,
      limit: query.limit || 20,
      cursor: query.cursor,
      matchingDistance: query.matchingDistance || 0.1,
    });

    return searchResults;
  });
