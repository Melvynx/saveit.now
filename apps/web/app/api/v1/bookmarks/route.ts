import { createApiErrorResponse, validateApiKey } from "@/lib/auth/api-key-auth";
import { createBookmark } from "@/lib/database/create-bookmark";
import { advancedSearch } from "@/lib/search/advanced-search";
import { BookmarkType } from "@workspace/database";
import { NextRequest } from "next/server";
import { z } from "zod";

const CreateBookmarkSchema = z.object({
  url: z.string().url("Invalid URL format"),
  transcript: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const SearchBookmarksSchema = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
  special: z.enum(["READ", "UNREAD", "STAR"]).optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const validation = await validateApiKey(request);
  
  if ("error" in validation) {
    return createApiErrorResponse(validation.error || "Authentication failed", validation.status || 401);
  }

  const { user } = validation as { user: { id: string } };

  try {
    const body = await request.json();
    const validatedData = CreateBookmarkSchema.parse(body);

    const bookmark = await createBookmark({
      url: validatedData.url,
      userId: user.id,
      transcript: validatedData.transcript,
      metadata: validatedData.metadata,
    });

    return Response.json({
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
    });
  } catch (error) {
    console.error("Create bookmark error:", error);
    
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(
        `Validation error: ${error.errors.map(e => e.message).join(", ")}`,
        400
      );
    }

    if (error instanceof Error) {
      return createApiErrorResponse(error.message, 400);
    }

    return createApiErrorResponse("Failed to create bookmark", 500);
  }
}

export async function GET(request: NextRequest) {
  const validation = await validateApiKey(request);
  
  if ("error" in validation) {
    return createApiErrorResponse(validation.error || "Authentication failed", validation.status || 401);
  }

  const { user } = validation as { user: { id: string } };

  try {
    const { searchParams } = new URL(request.url);
    
    const queryParams = {
      query: searchParams.get("query") || undefined,
      tags: searchParams.get("tags")?.split(",") || undefined,
      types: searchParams.get("types")?.split(",") as BookmarkType[] || undefined,
      special: searchParams.get("special") as "READ" | "UNREAD" | "STAR" | undefined,
      limit: parseInt(searchParams.get("limit") || "20"),
      cursor: searchParams.get("cursor") || undefined,
    };

    const validatedParams = SearchBookmarksSchema.parse(queryParams);

    const validTypes = validatedParams.types?.filter((type): type is BookmarkType => 
      Object.values(BookmarkType).includes(type as BookmarkType)
    );

    const result = await advancedSearch({
      userId: user.id,
      query: validatedParams.query,
      tags: validatedParams.tags,
      types: validTypes,
      specialFilters: validatedParams.special ? [validatedParams.special] : [],
      limit: validatedParams.limit,
      cursor: validatedParams.cursor,
    });

    return Response.json({
      success: true,
      bookmarks: result.bookmarks.map(bookmark => ({
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
    });
  } catch (error) {
    console.error("Search bookmarks error:", error);
    
    if (error instanceof z.ZodError) {
      return createApiErrorResponse(
        `Validation error: ${error.errors.map(e => e.message).join(", ")}`,
        400
      );
    }

    return createApiErrorResponse("Failed to search bookmarks", 500);
  }
}