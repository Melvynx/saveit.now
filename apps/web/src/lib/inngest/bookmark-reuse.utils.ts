import { BookmarkType, prisma } from "@workspace/database";
import { getVideoId } from "./bookmark-type/process-youtube-bookmark";

/**
 * Check if a bookmark with the same content already exists and can be reused
 */
export async function findExistingBookmark(params: {
  url: string;
  bookmarkId: string;
}): Promise<string | null> {
  const { url, bookmarkId } = params;
  
  let whereClause = {};
  
  // For tweets, check by URL (exact match)
  if (url.includes("twitter.com") || url.startsWith("https://x.com/")) {
    whereClause = {
      url,
      status: "READY",
      NOT: { id: bookmarkId },
    };
  }
  // For YouTube videos, check by YouTube ID
  else if ((url.includes("youtube.com") || url.includes("youtu.be")) && isYouTubeVideo(url)) {
    try {
      const youtubeId = getVideoId(url);
      whereClause = {
        type: BookmarkType.YOUTUBE,
        metadata: {
          path: ["youtubeId"],
          equals: youtubeId,
        },
        status: "READY",
        NOT: { id: bookmarkId },
      };
    } catch {
      // Invalid YouTube URL, proceed with normal processing
      return null;
    }
  }
  // For other content types, check by URL with age restrictions
  else {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const baseWhere = {
      url,
      status: "READY",
      NOT: { id: bookmarkId },
    };
    
    // For PAGE type, add age restriction (within 1 month)
    if (url.startsWith("http")) {
      whereClause = {
        ...baseWhere,
        OR: [
          {
            type: { not: BookmarkType.PAGE },
          },
          {
            type: BookmarkType.PAGE,
            createdAt: { gte: oneMonthAgo },
          },
        ],
      };
    } else {
      whereClause = baseWhere;
    }
  }

  const existingBookmark = await prisma.bookmark.findFirst({
    where: whereClause,
    select: { id: true },
  });

  return existingBookmark?.id || null;
}

/**
 * Copy all data from an existing bookmark to a new bookmark
 */
export async function copyBookmarkData(copyParams: {
  fromBookmarkId: string;
  toBookmarkId: string;
  url: string;
}): Promise<void> {
  const { fromBookmarkId, toBookmarkId } = copyParams;

  // Simple approach: copy everything at once with raw SQL
  await prisma.$executeRaw`
    UPDATE "Bookmark" 
    SET 
      type = source.type,
      title = source.title,
      summary = source.summary,
      "vectorSummary" = source."vectorSummary",
      preview = source.preview,
      "faviconUrl" = source."faviconUrl",
      "ogImageUrl" = source."ogImageUrl", 
      "ogDescription" = source."ogDescription",
      "imageDescription" = source."imageDescription",
      "titleEmbedding" = source."titleEmbedding",
      "vectorSummaryEmbedding" = source."vectorSummaryEmbedding",
      status = 'READY',
      metadata = jsonb_set(
        COALESCE(source.metadata, '{}'::jsonb),
        '{dataCopiedFrom}',
        to_jsonb(${fromBookmarkId}::text)
      )
    FROM "Bookmark" source
    WHERE "Bookmark".id = ${toBookmarkId} AND source.id = ${fromBookmarkId}
  `;

  // Copy tags
  await prisma.$executeRaw`
    INSERT INTO "BookmarkTag" ("bookmarkId", "tagId")
    SELECT ${toBookmarkId}, "tagId" 
    FROM "BookmarkTag" 
    WHERE "bookmarkId" = ${fromBookmarkId}
    ON CONFLICT DO NOTHING
  `;

  // Mark processing as completed
  await prisma.$executeRaw`
    UPDATE "BookmarkProcessingRun"
    SET status = 'COMPLETED', "completedAt" = NOW()
    WHERE "inngestRunId" = (
      SELECT "inngestRunId" FROM "Bookmark" WHERE id = ${toBookmarkId}
    )
  `;
}

function isYouTubeVideo(url: string): boolean {
  const videoRegex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/.+|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  return videoRegex.test(url);
}