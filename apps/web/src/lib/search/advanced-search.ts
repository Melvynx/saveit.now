import { MODELS } from "@/lib/openai";
import { BookmarkStatus, BookmarkType, prisma } from "@workspace/database";
import { embed } from "ai";

// Types pour les résultats de recherche
export type SearchResultChunk = {
  id: string;
  content: string;
  distance: number;
};

export type SearchResult = {
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
  score: number;
  matchType: "tag" | "vector" | "combined";
  matchedTags?: string[];
  createdAt?: Date;
};

export type SearchResponse = {
  bookmarks: SearchResult[];
  nextCursor?: string;
  hasMore: boolean;
};

type SearchOptions = {
  userId: string;
  query?: string;
  tags?: string[];
  limit?: number;
  cursor?: string;
};

/**
 * Effectue une recherche avancée multi-niveaux dans les bookmarks
 */
export async function advancedSearch({
  userId,
  query = "",
  tags = [],
  limit = 20,
  cursor,
}: SearchOptions): Promise<SearchResponse> {
  // Si aucune requête de recherche et pas de tags, retourner simplement par ordre de création
  if ((!query || query.trim() === "") && (!tags || tags.length === 0)) {
    const recentBookmarks = await prisma.bookmark.findMany({
      where: {
        userId,
        id: cursor ? { lt: cursor } : undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit + 1,
    });

    const hasMore = recentBookmarks.length > limit;
    const bookmarks = hasMore ? recentBookmarks.slice(0, -1) : recentBookmarks;
    const nextCursor = hasMore
      ? bookmarks[bookmarks.length - 1]?.id
      : undefined;

    return {
      bookmarks: bookmarks.map((bookmark) => ({
        id: bookmark.id,
        url: bookmark.url,
        title: bookmark.title,
        summary: bookmark.summary,
        preview: bookmark.preview,
        type: bookmark.type,
        status: bookmark.status,
        ogImageUrl: bookmark.ogImageUrl,
        ogDescription: bookmark.ogDescription,
        faviconUrl: bookmark.faviconUrl,
        score: 0,
        matchType: "tag" as const,
        createdAt: bookmark.createdAt,
      })),
      nextCursor,
      hasMore,
    };
  }

  // Résultats combinés avec déduplication
  const resultMap = new Map<string, SearchResult>();

  // Niveau 1: Recherche par tags si des tags sont fournis
  if (tags && tags.length > 0) {
    const tagResults = await searchByTags(userId, tags);
    for (const result of tagResults) {
      resultMap.set(result.id, {
        ...result,
        score: result.score * 1.5,
        matchType: "tag",
      });
    }
  }

  // Si une requête de recherche est fournie
  if (query && query.trim() !== "") {
    try {
      const { embedding } = await embed({
        model: MODELS.embedding,
        value: query.trim(),
      });

      const vectorResults = await searchByVector(userId, embedding, tags || []);
      for (const result of vectorResults) {
        if (resultMap.has(result.id)) {
          const existing = resultMap.get(result.id)!;
          resultMap.set(result.id, {
            ...existing,
            score: existing.score + result.score * 0.6,
            matchType: "combined",
          });
        } else {
          resultMap.set(result.id, {
            ...result,
            matchType: "vector",
          });
        }
      }
    } catch (error) {
      console.error("Erreur lors de la recherche vectorielle:", error);
    }
  }

  // Trier par score décroissant et appliquer la pagination
  const allResults = Array.from(resultMap.values()).sort(
    (a, b) => b.score - a.score
  );

  let startIndex = 0;
  if (cursor) {
    startIndex = allResults.findIndex((result) => result.id === cursor) + 1;
  }

  const paginatedResults = allResults.slice(startIndex, startIndex + limit + 1);
  const hasMore = paginatedResults.length > limit;
  const bookmarks = hasMore ? paginatedResults.slice(0, -1) : paginatedResults;
  const nextCursor = hasMore ? bookmarks[bookmarks.length - 1]?.id : undefined;

  return {
    bookmarks,
    nextCursor,
    hasMore,
  };
}

async function searchByTags(
  userId: string,
  tags: string[]
): Promise<SearchResult[]> {
  if (!tags || tags.length === 0) return [];

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
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  return bookmarks.map((bookmark) => {
    const matchedTags = bookmark.tags
      .filter((bt) => tags.includes(bt.tag.name))
      .map((bt) => bt.tag.name);

    const tagMatchRatio = matchedTags.length / tags.length;
    const score = tagMatchRatio * 100;

    return {
      id: bookmark.id,
      url: bookmark.url,
      title: bookmark.title,
      summary: bookmark.summary,
      preview: bookmark.preview,
      type: bookmark.type,
      status: bookmark.status,
      ogImageUrl: bookmark.ogImageUrl,
      ogDescription: bookmark.ogDescription,
      faviconUrl: bookmark.faviconUrl,
      score,
      matchType: "tag" as const,
      matchedTags,
      createdAt: bookmark.createdAt,
    };
  });
}

async function searchByVector(
  userId: string,
  embedding: number[],
  tags: string[]
): Promise<SearchResult[]> {
  let tagsCondition = "";
  let tagsParams: any[] = [];

  if (tags.length > 0) {
    tagsCondition = `AND EXISTS (
      SELECT 1 FROM "BookmarkTag" bt
      JOIN "Tag" t ON bt."tagId" = t.id
      WHERE bt."bookmarkId" = b.id
      AND t.name IN (${tags.map((_, i) => `$${i + 3}`).join(",")})
    )`;
    tagsParams = tags;
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
      tagNames?: string;
      createdAt: Date;
    }[]
  >(
    `
    WITH distances AS (
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
        LEAST(
          COALESCE("titleEmbedding" <=> $1::vector, 1),
          COALESCE("summaryEmbedding" <=> $1::vector, 1),
          COALESCE("detailedSummaryEmbedding" <=> $1::vector, 1)
        ) as distance
      FROM "Bookmark" b
      WHERE "userId" = $2
      ${tagsCondition}
    ),
    min_distance AS (
      SELECT MIN(distance) as min_dist
      FROM distances
    )
    SELECT 
      d.*,
      string_agg(t.name, ',') as "tagNames"
    FROM distances d
    LEFT JOIN "BookmarkTag" bt ON d.id = bt."bookmarkId"
    LEFT JOIN "Tag" t ON bt."tagId" = t.id
    WHERE d.distance <= (SELECT min_dist + 0.1 FROM min_distance)
    GROUP BY d.id, d.url, d.title, d.summary, d.preview, d.type, d.status, d."ogImageUrl", d."ogDescription", d."faviconUrl", d."createdAt", d.distance
    ORDER BY distance ASC
    LIMIT 50
  `,
    embedding,
    userId,
    ...tagsParams
  );

  console.log(
    bookmarks.map((b) => ({
      url: b.url,
      distance: b.distance,
    }))
  );

  return bookmarks.map((bookmark) => {
    const score = Math.max(0, 100 * (1 - bookmark.distance));
    const bookmarkTags = bookmark.tagNames ? bookmark.tagNames.split(",") : [];
    const matchedTags = bookmarkTags.filter((tag) => tags.includes(tag));

    return {
      id: bookmark.id,
      url: bookmark.url,
      title: bookmark.title,
      summary: bookmark.summary,
      preview: bookmark.preview,
      type: bookmark.type,
      status: bookmark.status,
      ogImageUrl: bookmark.ogImageUrl,
      ogDescription: bookmark.ogDescription,
      faviconUrl: bookmark.faviconUrl,
      score,
      matchType: "vector" as const,
      matchedTags: matchedTags.length > 0 ? matchedTags : undefined,
      createdAt: bookmark.createdAt,
    };
  });
}
