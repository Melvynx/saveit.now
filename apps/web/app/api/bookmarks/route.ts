import {
  BookmarkCreationError,
  createBookmark,
} from "@/lib/database/create-bookmark";
import { userRoute } from "@/lib/safe-route";
import { advancedSearch } from "@/lib/search/advanced-search";
import { BookmarkType } from "@workspace/database";
import { NextResponse } from "next/server";
import { z } from "zod";

export const POST = userRoute
  .body(z.object({ url: z.string().url() }))
  .handler(async (req, { body, ctx }) => {
    try {
      const bookmark = await createBookmark({
        url: body.url,
        userId: ctx.user.id,
      });
      return { status: "ok", bookmark };
    } catch (error) {
      if (error instanceof BookmarkCreationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      throw error;
    }
  });

export const GET = userRoute
  .query(
    z.object({
      query: z.string().optional(),
      tags: z.array(z.string()).optional(),
      types: z.array(z.nativeEnum(BookmarkType)).optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().min(1).max(50).optional(),
      matchingDistance: z.coerce.number().min(0.1).max(2).optional(),
    }),
  )
  .handler(async (req, { ctx, query }) => {
    const searchResults = await advancedSearch({
      userId: ctx.user.id,
      query: query.query,
      tags: query.tags || [],
      types: query.types || [],
      limit: query.limit || 20,
      cursor: query.cursor,
      matchingDistance: query.matchingDistance || 0.1,
    });

    return searchResults;
  });
