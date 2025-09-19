import { BookmarkValidationError } from "@/lib/database/bookmark-validation";
import { createBookmark } from "@/lib/database/create-bookmark";
import { userRoute } from "@/lib/safe-route";
import { cachedAdvancedSearch } from "@/lib/search/cached-search";
import { BookmarkType } from "@workspace/database";
import { NextResponse } from "next/server";
import { z } from "zod";

export const POST = userRoute
  .body(
    z.object({
      url: z.string().url(),
      transcript: z.string().optional(),
      metadata: z.any().optional(),
    }),
  )
  .handler(async (req, { body, ctx }) => {
    try {
      const bookmark = await createBookmark({
        url: body.url,
        userId: ctx.user.id,
        transcript: body.transcript,
        metadata: body.metadata,
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
    // Validate and filter bookmark types
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

    // Validate and filter special filters
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
