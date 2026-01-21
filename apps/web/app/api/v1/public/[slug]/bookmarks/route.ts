import { cachedAdvancedSearch } from "@/lib/search/cached-search";
import { routeClient } from "@/lib/safe-route";
import { BookmarkType, prisma } from "@workspace/database";
import { NextResponse } from "next/server";
import { z } from "zod";

export const GET = routeClient
  .params(z.object({ slug: z.string() }))
  .query(
    z.object({
      query: z.string().optional(),
      tags: z.string().optional(),
      types: z.string().optional(),
      limit: z.coerce.number().min(1).max(100).optional().default(20),
      cursor: z.string().optional(),
    }),
  )
  .handler(async (_, { params, query }) => {
    const user = await prisma.user.findUnique({
      where: {
        publicLinkSlug: params.slug,
        publicLinkEnabled: true,
      },
      select: {
        id: true,
        name: true,
        image: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Public page not found", success: false },
        { status: 404 },
      );
    }

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
      userId: user.id,
      query: query.query,
      tags,
      types,
      specialFilters: [],
      limit: query.limit,
      cursor: query.cursor,
      matchingDistance: 0.3,
    });

    return {
      success: true,
      user: {
        name: user.name,
        image: user.image,
      },
      bookmarks: result.bookmarks.map((bookmark) => ({
        id: bookmark.id,
        url: bookmark.url,
        title: bookmark.title,
        summary: bookmark.summary,
        type: bookmark.type,
        status: bookmark.status,
        starred: false,
        read: false,
        preview: bookmark.preview,
        faviconUrl: bookmark.faviconUrl,
        ogImageUrl: bookmark.ogImageUrl,
        ogDescription: bookmark.ogDescription,
        createdAt: bookmark.createdAt,
        matchedTags: bookmark.matchedTags,
        metadata: bookmark.metadata,
      })),
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    };
  });
