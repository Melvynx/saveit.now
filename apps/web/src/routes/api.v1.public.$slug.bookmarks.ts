import { BookmarkType } from "@workspace/database";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/v1/public/$slug/bookmarks")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const [{ cachedAdvancedSearch }, { prisma }] = await Promise.all([
          import("@/lib/search/cached-search"),
          import("@workspace/database/client"),
        ]);
        const url = new URL(request.url);
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
          return Response.json(
            { error: "Public page not found", success: false },
            { status: 404 },
          );
        }

        const validBookmarkTypes = Object.values(BookmarkType);
        const types = (url.searchParams.get("types") ?? "")
          .split(",")
          .filter(Boolean)
          .filter((type): type is BookmarkType =>
            validBookmarkTypes.includes(type as BookmarkType),
          );

        const tags = (url.searchParams.get("tags") ?? "")
          .split(",")
          .filter(Boolean);

        const result = await cachedAdvancedSearch({
          userId: user.id,
          query: url.searchParams.get("query") ?? undefined,
          tags,
          types,
          specialFilters: [],
          limit: Number(url.searchParams.get("limit") ?? 20),
          cursor: url.searchParams.get("cursor") ?? undefined,
          matchingDistance: 0.3,
        });

        return Response.json({
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
        });
      },
    },
  },
});
