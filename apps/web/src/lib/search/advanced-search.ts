import { OPENAI_MODELS } from "@/lib/openai";
import {
  BookmarkStatus,
  BookmarkType,
  prisma,
  Prisma,
} from "@workspace/database";
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
  metadata?: Prisma.JsonValue;
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
  matchingDistance?: number;
};

type SearchByVectorOptions = {
  userId: string;
  embedding: number[];
  tags: string[];
  matchingDistance: number;
};

type SearchByTagsOptions = {
  userId: string;
  tags: string[];
};

type SearchByDomainOptions = {
  userId: string;
  domain: string;
};

/**
 * Détecte si une query est un domaine
 */
function isDomainQuery(query: string): boolean {
  // Nettoie la query
  const cleanQuery = query.trim().toLowerCase();

  // Patterns pour détecter un domaine
  const domainPatterns = [
    /^[a-z0-9.-]+\.[a-z]{2,}$/i, // domain.com
    /^www\.[a-z0-9.-]+\.[a-z]{2,}$/i, // www.domain.com
    /^https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i, // http(s)://domain.com
  ];

  return domainPatterns.some((pattern) => pattern.test(cleanQuery));
}

/**
 * Extrait le domaine d'une query
 */
function extractDomain(query: string): string {
  let domain = query.trim().toLowerCase();

  // Enlève le protocole
  domain = domain.replace(/^https?:\/\//, "");

  // Enlève www.
  domain = domain.replace(/^www\./, "");

  // Enlève le path et les paramètres
  domain = domain.split("/")[0] || domain;
  domain = domain.split("?")[0] || domain;
  domain = domain.split("#")[0] || domain;

  return domain;
}

/**
 * Recherche par domaine
 */
async function searchByDomain({
  userId,
  domain,
}: SearchByDomainOptions): Promise<SearchResult[]> {
  const bookmarks = await prisma.bookmark.findMany({
    where: {
      userId,
      url: {
        contains: domain,
        mode: "insensitive",
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

  return bookmarks
    .filter((bookmark) => {
      // Vérifie que l'URL contient vraiment le domaine
      const bookmarkDomain = extractDomain(bookmark.url);
      return bookmarkDomain.includes(domain) || domain.includes(bookmarkDomain);
    })
    .map((bookmark) => {
      const bookmarkDomain = extractDomain(bookmark.url);
      // Score élevé si c'est un match exact de domaine
      const isExactMatch = bookmarkDomain === domain;
      const score = isExactMatch ? 150 : 120; // Score très élevé pour les domaines

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
        matchType: "tag" as const, // On utilise "tag" pour les domaines
        matchedTags: bookmark.tags.map((bt) => bt.tag.name),
        createdAt: bookmark.createdAt,
        metadata: bookmark.metadata,
      };
    });
}

/**
 * Effectue une recherche avancée multi-niveaux dans les bookmarks
 */
export async function advancedSearch({
  userId,
  query = "",
  tags = [],
  limit = 20,
  cursor,
  matchingDistance = 0.1,
}: SearchOptions): Promise<SearchResponse> {
  // Si aucune requête de recherche et pas de tags, retourner simplement par ordre de création
  if ((!query || query.trim() === "") && (!tags || tags.length === 0)) {
    // Récupérer le bookmark de référence pour la pagination si cursor est fourni
    let cursorRef;
    if (cursor) {
      cursorRef = await prisma.bookmark.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });
    }

    const recentBookmarks = await prisma.bookmark.findMany({
      where: {
        userId,
        ...(cursorRef
          ? {
              createdAt: {
                lt: cursorRef.createdAt,
              },
            }
          : {}),
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
        metadata: bookmark.metadata,
      })),
      nextCursor,
      hasMore,
    };
  }

  // Résultats combinés avec déduplication
  const resultMap = new Map<string, SearchResult>();

  // Niveau 1: Recherche par tags si des tags sont fournis
  if (tags && tags.length > 0) {
    const tagResults = await searchByTags({ userId, tags });
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
    // Vérifier si c'est une recherche par domaine
    if (isDomainQuery(query)) {
      const domain = extractDomain(query);
      const domainResults = await searchByDomain({ userId, domain });
      for (const result of domainResults) {
        if (resultMap.has(result.id)) {
          const existing = resultMap.get(result.id)!;
          resultMap.set(result.id, {
            ...existing,
            score: existing.score + result.score,
            matchType: "combined",
          });
        } else {
          resultMap.set(result.id, {
            ...result,
            matchType: "tag", // Les domaines sont traités comme des tags
          });
        }
      }
    }

    try {
      const { embedding } = await embed({
        model: OPENAI_MODELS.embedding,
        value: query.trim(),
      });

      const vectorResults = await searchByVector({
        userId,
        embedding,
        tags: tags || [],
        matchingDistance,
      });
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
    (a, b) => b.score - a.score,
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

async function searchByTags({
  userId,
  tags,
}: SearchByTagsOptions): Promise<SearchResult[]> {
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
      metadata: bookmark.metadata,
    };
  });
}

async function searchByVector({
  userId,
  embedding,
  tags,
  matchingDistance,
}: SearchByVectorOptions): Promise<SearchResult[]> {
  let tagsCondition = "";
  let tagsParams: any[] = [];

  if (tags.length > 0) {
    tagsCondition = `AND EXISTS (
      SELECT 1 FROM "BookmarkTag" bt
      JOIN "Tag" t ON bt."tagId" = t.id
      WHERE bt."bookmarkId" = b.id
      AND t.name IN (${tags.map((_, i) => `$${i + 4}`).join(",")})
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
      metadata?: Prisma.JsonValue;
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
        metadata,
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
    WHERE d.distance <= (SELECT min_dist + $3 FROM min_distance)
    GROUP BY d.id, d.url, d.title, d.summary, d.preview, d.type, d.status, d."ogImageUrl", d."ogDescription", d."faviconUrl", d."createdAt", d.metadata, d.distance
    ORDER BY distance ASC
    LIMIT 50
  `,
    embedding,
    userId,
    matchingDistance,
    ...tagsParams,
  );

  console.log(
    bookmarks.map((b) => ({
      url: b.url,
      distance: b.distance,
    })),
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
      metadata: bookmark.metadata,
    };
  });
}
