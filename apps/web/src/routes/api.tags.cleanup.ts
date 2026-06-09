import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tags/cleanup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [{ generateTagCleanupSuggestions }, { requireUser }, { prisma }] =
          await Promise.all([
            import("@/lib/ai-tag-cleanup"),
            import("@/lib/safe-route"),
            import("@workspace/database/client"),
          ]);
        const user = await requireUser(request);
        if (user instanceof Response) return user;

        try {
          const tags = await prisma.tag.findMany({
            where: {
              userId: user.id,
            },
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  bookmarks: true,
                },
              },
            },
            orderBy: {
              bookmarks: {
                _count: "desc",
              },
            },
          });

          if (tags.length < 2) {
            return Response.json({
              suggestions: [],
              totalTags: tags.length,
            });
          }

          const tagNames = tags.map((tag) => tag.name);
          const suggestions = await generateTagCleanupSuggestions(tagNames);

          const enhancedSuggestions = suggestions.map((suggestion) => {
            const refactorTagsWithMeta = suggestion.refactorTags
              .map((tagName) => {
                const tag = tags.find((candidate) => candidate.name === tagName);
                return tag
                  ? {
                      id: tag.id,
                      name: tag.name,
                      bookmarkCount: tag._count.bookmarks,
                    }
                  : null;
              })
              .filter((tag): tag is NonNullable<typeof tag> => tag !== null);

            const bestTagMeta = tags.find(
              (tag) => tag.name === suggestion.bestTag,
            );

            return {
              bestTag: suggestion.bestTag,
              bestTagExists: !!bestTagMeta,
              bestTagId: bestTagMeta?.id,
              bestTagBookmarkCount: bestTagMeta?._count.bookmarks || 0,
              refactorTags: refactorTagsWithMeta,
              totalBookmarks: refactorTagsWithMeta.reduce(
                (sum, tag) => sum + tag.bookmarkCount,
                0,
              ),
            };
          });

          return Response.json({
            suggestions: enhancedSuggestions,
            totalTags: tags.length,
          });
        } catch (error) {
          console.error("Tag cleanup suggestion error:", error);
          return Response.json(
            { error: "Failed to generate cleanup suggestions" },
            { status: 500 },
          );
        }
      },
    },
  },
});
