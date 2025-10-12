import { OPENAI_MODELS } from "@/lib/openai";
import { logger } from "@/lib/logger";
import {
  BookmarkStatus,
  BookmarkType,
  prisma,
  Prisma,
} from "@workspace/database";
import { embed } from "ai";
import { EmbeddingCache } from "./embedding-cache";
import {
  SearchByDomainOptions,
  SearchByTagsOptions,
  SearchByVectorOptions,
  SearchResult,
  extractDomain,
  getBookmarkOpenCounts,
  applyOpenFrequencyBoost,
  bookmarkToSearchResult,
  buildSpecialFilterConditions,
} from "./search-helpers";

/**
 * Fetches tags for given bookmark IDs
 */
async function getBookmarkTags(bookmarkIds: string[]) {
  if (bookmarkIds.length === 0) return [];

  return prisma.bookmarkTag.findMany({
    where: {
      bookmarkId: {
        in: bookmarkIds,
      },
    },
    select: {
      bookmarkId: true,
      tag: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });
}

/**
 * Groups bookmark tags by bookmark ID
 */
function groupTagsByBookmarkId(
  bookmarkTags: {
    bookmarkId: string;
    tag: { id: string; name: string; type: string };
  }[],
) {
  return bookmarkTags.reduce((acc, bt) => {
    if (!acc.has(bt.bookmarkId)) {
      acc.set(bt.bookmarkId, []);
    }
    acc.get(bt.bookmarkId)!.push(bt);
    return acc;
  }, new Map<string, { tag: { id: string; name: string; type: string } }[]>());
}

/**
 * Searches bookmarks by domain
 */
export async function searchByDomain({
  userId,
  domain,
  types,
  specialFilters = [],
}: SearchByDomainOptions): Promise<SearchResult[]> {
  const specialFilterConditions = buildSpecialFilterConditions(specialFilters);

  const bookmarks = await prisma.bookmark.findMany({
    where: {
      userId,
      url: {
        contains: domain,
        mode: "insensitive",
      },
      ...(types && types.length > 0 ? { type: { in: types } } : {}),
      ...specialFilterConditions,
    },
    select: {
      id: true,
      url: true,
      title: true,
      summary: true,
      preview: true,
      type: true,
      status: true,
      ogImageUrl: true,
      ogDescription: true,
      faviconUrl: true,
      createdAt: true,
      metadata: true,
      starred: true,
      read: true,
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
    },
  });

  const filteredBookmarks = bookmarks.filter((bookmark) => {
    // Verify that the URL actually contains the domain
    const bookmarkDomain = extractDomain(bookmark.url);
    return bookmarkDomain.includes(domain) || domain.includes(bookmarkDomain);
  });

  // Get open counts for filtered bookmarks
  const bookmarkIds = filteredBookmarks.map((bookmark) => bookmark.id);
  const openCounts = await getBookmarkOpenCounts(userId, bookmarkIds);

  return filteredBookmarks.map((bookmark) => {
    const bookmarkDomain = extractDomain(bookmark.url);
    // High score for exact domain matches
    const isExactMatch = bookmarkDomain === domain;
    const baseScore = isExactMatch ? 150 : 120;

    // Apply open frequency boost
    const openCount = openCounts.get(bookmark.id) || 0;
    const score = applyOpenFrequencyBoost(baseScore, openCount);

    return bookmarkToSearchResult(
      bookmark,
      score,
      "tag", // Use "tag" for domain searches
      bookmark.tags.map((bt: { tag: { name: string } }) => bt.tag.name),
      openCount,
    );
  });
}

/**
 * Searches bookmarks by tags
 */
export async function searchByTags({
  userId,
  tags,
  types,
  specialFilters = [],
}: SearchByTagsOptions): Promise<SearchResult[]> {
  if (!tags || tags.length === 0) return [];

  const specialFilterConditions = buildSpecialFilterConditions(specialFilters);

  const bookmarks = await prisma.bookmark.findMany({
    where: {
      userId,
      tags: {
        some: {
          tag: {
            name: {
              in: tags,
            },
          },
        },
      },
      ...(types && types.length > 0 ? { type: { in: types } } : {}),
      ...specialFilterConditions,
    },
    select: {
      id: true,
      url: true,
      title: true,
      summary: true,
      preview: true,
      type: true,
      status: true,
      ogImageUrl: true,
      ogDescription: true,
      faviconUrl: true,
      createdAt: true,
      metadata: true,
      starred: true,
      read: true,
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
    },
  });

  // Get open counts for all bookmarks
  const bookmarkIds = bookmarks.map((bookmark) => bookmark.id);
  const openCounts = await getBookmarkOpenCounts(userId, bookmarkIds);

  return bookmarks.map((bookmark) => {
    const matchedTags = bookmark.tags
      .filter((bt: { tag: { name: string } }) => tags.includes(bt.tag.name))
      .map((bt: { tag: { name: string } }) => bt.tag.name);

    const tagMatchRatio = matchedTags.length / tags.length;
    const baseScore = tagMatchRatio * 100;

    // Apply open frequency boost
    const openCount = openCounts.get(bookmark.id) || 0;
    const score = applyOpenFrequencyBoost(baseScore, openCount);

    return bookmarkToSearchResult(
      bookmark,
      score,
      "tag",
      matchedTags,
      openCount,
    );
  });
}

/**
 * Searches bookmarks by vector similarity
 */
export async function searchByVector({
  userId,
  embedding,
  tags,
  types,
  specialFilters = [],
  matchingDistance,
}: SearchByVectorOptions): Promise<SearchResult[]> {
  let tagsCondition = "";
  let typesCondition = "";
  let specialFiltersCondition = "";
  let params: unknown[] = [];

  if (tags.length > 0) {
    tagsCondition = `AND EXISTS (
      SELECT 1 FROM "BookmarkTag" bt
      JOIN "Tag" t ON bt."tagId" = t.id
      WHERE bt."bookmarkId" = b.id
      AND t.name IN (${tags.map((_, i) => `$${i + 4}`).join(",")})
    )`;
    params = [...params, ...tags];
  }

  if (types && types.length > 0) {
    const typesParamStart = 4 + tags.length;
    typesCondition = `AND b.type IN (${types.map((_, i) => `$${typesParamStart + i}::"BookmarkType"`).join(",")})`;
    params = [...params, ...types];
  }

  if (specialFilters && specialFilters.length > 0) {
    const conditions: string[] = [];

    if (specialFilters.includes("READ")) {
      conditions.push("b.read = true");
    }

    if (specialFilters.includes("UNREAD")) {
      conditions.push("b.read = false");
    }

    if (specialFilters.includes("STAR")) {
      conditions.push("b.starred = true");
    }

    if (conditions.length > 0) {
      specialFiltersCondition = `AND (${conditions.join(" OR ")})`;
    }
  }

  const bookmarks = await prisma.$queryRawUnsafe<
    {
      id: string;
      url: string;
      title: string | null;
      summary: string | null;
      preview: string | null;
      type: BookmarkType | null;
      status: BookmarkStatus;
      ogImageUrl: string | null;
      ogDescription: string | null;
      faviconUrl: string | null;
      distance: number;
      createdAt: Date;
      metadata?: Prisma.JsonValue;
      starred?: boolean;
      read?: boolean;
    }[]
  >(
    `
    WITH bookmark_distances AS (
      SELECT 
        id,
        url,
        title,
        summary,
        preview,
        type,
        status,
        "ogImageUrl",
        "ogDescription",
        "faviconUrl",
        "createdAt",
        metadata,
        starred,
        read,
        (0.2 * COALESCE("titleEmbedding" <=> $1::vector, 1) +
         0.8 * COALESCE("vectorSummaryEmbedding" <=> $1::vector, 1)) as distance
      FROM "Bookmark" b
      WHERE "userId" = $2
      ${tagsCondition}
      ${typesCondition}
      ${specialFiltersCondition}
    )
    SELECT *
    FROM bookmark_distances
    WHERE distance <= (
      SELECT MIN(distance) + $3 
      FROM bookmark_distances
    )
    ORDER BY distance ASC
    LIMIT 50
  `,
    embedding,
    userId,
    matchingDistance,
    ...params,
  );

  logger.info(
    bookmarks.map((b) => ({
      url: b.url,
      distance: b.distance,
    })),
  );

  // Get both tags and open counts in parallel for better performance
  const bookmarkIds = bookmarks.map((bookmark) => bookmark.id);

  const [bookmarkTags, openCounts] = await Promise.all([
    getBookmarkTags(bookmarkIds),
    getBookmarkOpenCounts(userId, bookmarkIds),
  ]);

  // Group tags by bookmark ID
  const tagsMap = groupTagsByBookmarkId(bookmarkTags);

  return bookmarks.map((bookmark) => {
    const baseScore = Math.max(0, 100 * (1 - bookmark.distance));
    const bookmarkTagsList = tagsMap.get(bookmark.id) || [];
    const bookmarkTagNames = bookmarkTagsList.map((bt) => bt.tag.name);
    const matchedTags = bookmarkTagNames.filter((tag) => tags.includes(tag));

    // Apply open frequency boost
    const openCount = openCounts.get(bookmark.id) || 0;
    const score = applyOpenFrequencyBoost(baseScore, openCount);

    // Create bookmark object with complete tag structure
    const bookmarkWithTags = {
      ...bookmark,
      tags: bookmarkTagsList,
    };

    return bookmarkToSearchResult(
      bookmarkWithTags,
      score,
      "vector",
      matchedTags.length > 0 ? matchedTags : undefined,
      openCount,
    );
  });
}

/**
 * Performs a search using text embedding
 */
export async function searchByText({
  userId,
  query,
  tags = [],
  types,
  specialFilters = [],
  matchingDistance,
}: {
  userId: string;
  query: string;
  tags?: string[];
  types?: BookmarkType[];
  specialFilters?: ("READ" | "UNREAD" | "STAR")[];
  matchingDistance: number;
}): Promise<SearchResult[]> {
  try {
    const trimmedQuery = query.trim();

    // Try to get embedding from cache first
    let embedding = await EmbeddingCache.get(
      trimmedQuery,
      "text-embedding-3-small",
    );

    if (!embedding) {
      // Cache miss - generate new embedding
      const { embedding: newEmbedding } = await embed({
        model: OPENAI_MODELS.embedding,
        value: trimmedQuery,
      });

      embedding = newEmbedding;

      // Cache for future use (fire and forget)
      EmbeddingCache.set(
        trimmedQuery,
        embedding,
        "text-embedding-3-small",
      ).catch(console.error);
    }

    return await searchByVector({
      userId,
      embedding,
      tags,
      types,
      specialFilters,
      matchingDistance,
    });
  } catch (error) {
    console.error("Error during vector search:", error);
    return [];
  }
}
