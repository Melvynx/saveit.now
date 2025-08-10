import { generateTagCleanupSuggestions } from "@/lib/ai-tag-cleanup";
import { userRoute } from "@/lib/safe-route";
import { prisma } from "@workspace/database";
import { NextResponse } from "next/server";

export const POST = userRoute.handler(async (req, { ctx }) => {
  try {
    // Fetch all user tags
    const tags = await prisma.tag.findMany({
      where: {
        userId: ctx.user.id,
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
      return NextResponse.json({
        suggestions: [],
        message: "Need at least 2 tags to generate cleanup suggestions",
      });
    }

    const tagNames = tags.map((tag) => tag.name);
    const suggestions = await generateTagCleanupSuggestions(tagNames);

    // Enhance suggestions with tag metadata
    const enhancedSuggestions = suggestions.map((suggestion) => {
      const refactorTagsWithMeta = suggestion.refactorTags
        .map((tagName) => {
          const tag = tags.find((t) => t.name === tagName);
          return tag
            ? {
                id: tag.id,
                name: tag.name,
                bookmarkCount: tag._count.bookmarks,
              }
            : null;
        })
        .filter((tag): tag is NonNullable<typeof tag> => tag !== null);

      const bestTagMeta = tags.find((t) => t.name === suggestion.bestTag);

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

    return NextResponse.json({
      suggestions: enhancedSuggestions,
      totalTags: tags.length,
    });
  } catch (error) {
    console.error("Tag cleanup suggestion error:", error);
    return NextResponse.json(
      { error: "Failed to generate cleanup suggestions" },
      { status: 500 },
    );
  }
});
