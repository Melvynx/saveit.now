import { OPENAI_MODELS } from "@/lib/openai";
import {
  BookmarkStatus,
  BookmarkType,
  Prisma,
  prisma,
} from "@workspace/database";
import { embed } from "ai";
import { EmbeddingCache } from "./embedding-cache";
import {
  SearchOptions,
  SearchResponse,
  SearchResult,
  extractDomain,
  isDomainQuery,
} from "./search-helpers";

interface UnifiedSearchParams {
  userId: string;
  tags?: string[];
  domain?: string;
  embedding?: number[];
  matchingDistance?: number;
  limit: number;
  offset: number;
  types?: BookmarkType[];
  specialFilters?: ("READ" | "UNREAD" | "STAR")[];
  isSearchQuery?: boolean;
  skipDistanceFilter?: boolean;
}

interface QueryResult {
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
  createdAt: Date;
  metadata: Prisma.JsonValue;
  starred: boolean;
  read: boolean;
  final_score: number;
  strategy: "tag" | "domain" | "vector";
  open_count: number;
}

class OptimizedSearchQuery {
  private params: UnifiedSearchParams;

  constructor(params: UnifiedSearchParams) {
    this.params = params;
  }

  private buildTagSearchCTE(tags: string[]): string {
    return `
      SELECT
        b.*,
        'tag'::text as strategy,
        (COUNT(DISTINCT bt."tagId")::float / ${tags.length}) * 100 * 1.5 as base_score
      FROM "Bookmark" b
      JOIN "BookmarkTag" bt ON b.id = bt."bookmarkId"
      JOIN "Tag" t ON bt."tagId" = t.id
      WHERE b."userId" = $1
        AND t.name = ANY($2::text[])
        ${this.buildStatusFilter("b")}
        ${this.buildTypeFilter("b")}
        ${this.buildSpecialFilters("b")}
      GROUP BY b.id, b."userId", b.url, b.type, b.title, b."titleEmbedding",
               b.summary, b."vectorSummary", b."vectorSummaryEmbedding",
               b.preview, b."ogDescription", b.metadata, b.status,
               b.starred, b.read, b."createdAt", b."updatedAt",
               b."ogImageUrl", b."faviconUrl"
      HAVING COUNT(DISTINCT bt."tagId") > 0
    `;
  }

  private buildDomainSearchCTE(domain: string): string {
    const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const domainRegex = `^https?://([^/]*\\.)?${escapedDomain}(/.*)?$`;

    return `
      SELECT
        b.*,
        'domain'::text as strategy,
        CASE
          WHEN b.url ~ '${domainRegex}' THEN 150.0
          ELSE 120.0
        END as base_score
      FROM "Bookmark" b
      WHERE b."userId" = $1
        AND (b.url ILIKE '%' || '${domain}' || '%')
        ${this.buildStatusFilter("b")}
        ${this.buildTypeFilter("b")}
        ${this.buildSpecialFilters("b")}
    `;
  }

  private buildVectorSearchCTE(paramIndex: number, skipDistanceFilter: boolean = false): string {
    // Build filter conditions for the MIN subquery
    const statusFilter = this.buildStatusFilter("").replace("AND ", "AND ");
    const typeFilter = this.buildTypeFilter("").replace("AND ", "AND ");
    const specialFilter = this.buildSpecialFilters("").replace("AND ", "AND ");

    if (skipDistanceFilter) {
      // Return top results by distance without threshold filtering
      return `
        SELECT
          b.*,
          'vector'::text as strategy,
          (100 - ((0.2 * COALESCE(b."titleEmbedding" <=> $${paramIndex}::vector, 1) +
                    0.8 * COALESCE(b."vectorSummaryEmbedding" <=> $${paramIndex}::vector, 1)) * 100)) * 0.6 as base_score
        FROM "Bookmark" b
        WHERE b."userId" = $1
          ${this.buildStatusFilter("b")}
          ${this.buildTypeFilter("b")}
          ${this.buildSpecialFilters("b")}
        ORDER BY (0.2 * COALESCE(b."titleEmbedding" <=> $${paramIndex}::vector, 1) +
                  0.8 * COALESCE(b."vectorSummaryEmbedding" <=> $${paramIndex}::vector, 1)) ASC
      `;
    }

    return `
      SELECT
        b.*,
        'vector'::text as strategy,
        (100 - ((0.2 * COALESCE(b."titleEmbedding" <=> $${paramIndex}::vector, 1) +
                  0.8 * COALESCE(b."vectorSummaryEmbedding" <=> $${paramIndex}::vector, 1)) * 100)) * 0.6 as base_score
      FROM "Bookmark" b
      WHERE b."userId" = $1
        ${this.buildStatusFilter("b")}
        AND (
          (0.2 * COALESCE(b."titleEmbedding" <=> $${paramIndex}::vector, 1) +
           0.8 * COALESCE(b."vectorSummaryEmbedding" <=> $${paramIndex}::vector, 1)) <= (
            SELECT MIN(
              0.2 * COALESCE("titleEmbedding" <=> $${paramIndex}::vector, 1) +
              0.8 * COALESCE("vectorSummaryEmbedding" <=> $${paramIndex}::vector, 1)
            ) + $${paramIndex + 1}
            FROM "Bookmark"
            WHERE "userId" = $1
              ${statusFilter}
              ${typeFilter}
              ${specialFilter}
          )
        )
        ${this.buildTypeFilter("b")}
        ${this.buildSpecialFilters("b")}
    `;
  }

  private buildStatusFilter(alias: string): string {
    // If it's a search query, only return READY bookmarks
    // If it's browsing (no query), return all statuses
    if (this.params.isSearchQuery) {
      return `AND ${alias}.status = 'READY'`;
    }
    return "";
  }

  private buildTypeFilter(alias: string): string {
    if (!this.params.types || this.params.types.length === 0) return "";
    const typeList = this.params.types.map((t) => `'${t}'`).join(",");
    return `AND ${alias}.type IN (${typeList})`;
  }

  private buildSpecialFilters(alias: string): string {
    if (!this.params.specialFilters || this.params.specialFilters.length === 0)
      return "";

    const conditions: string[] = [];

    if (this.params.specialFilters.includes("READ")) {
      conditions.push(`${alias}.read = true`);
    }
    if (this.params.specialFilters.includes("UNREAD")) {
      conditions.push(`${alias}.read = false`);
    }
    if (this.params.specialFilters.includes("STAR")) {
      conditions.push(`${alias}.starred = true`);
    }

    return conditions.length > 0 ? `AND (${conditions.join(" OR ")})` : "";
  }

  build(): {
    query: string;
    values: (string | number | string[] | number[])[];
  } {
    const strategies: string[] = [];
    const values: (string | number | string[] | number[])[] = [
      this.params.userId,
    ];
    let paramIndex = 2;

    // Add tag search strategy
    if (this.params.tags && this.params.tags.length > 0) {
      strategies.push(this.buildTagSearchCTE(this.params.tags));
      values.push(this.params.tags);
      paramIndex++;
    }

    // Add domain search strategy
    if (this.params.domain) {
      strategies.push(this.buildDomainSearchCTE(this.params.domain));
    }

    // Add vector search strategy
    if (this.params.embedding) {
      strategies.push(this.buildVectorSearchCTE(paramIndex, this.params.skipDistanceFilter));
      values.push(this.params.embedding);
      if (!this.params.skipDistanceFilter) {
        values.push(this.params.matchingDistance || 0.1);
        paramIndex += 2;
      } else {
        paramIndex += 1;
      }
    }

    if (strategies.length === 0) {
      throw new Error("At least one search strategy must be provided");
    }

    const query = `
      WITH search_strategies AS (
        ${strategies.join("\n        UNION ALL\n")}
      ),
      enriched_results AS (
        SELECT
          s.*,
          COALESCE(bo.open_count, 0) as open_count,
          s.base_score + COALESCE(LOG(bo.open_count + 1) * 10, 0) as final_score
        FROM search_strategies s
        LEFT JOIN (
          SELECT "bookmarkId", COUNT(*) as open_count
          FROM "BookmarkOpen"
          WHERE "userId" = $1
          GROUP BY "bookmarkId"
        ) bo ON s.id = bo."bookmarkId"
      ),
      deduplicated_results AS (
        SELECT DISTINCT ON (id)
          *,
          ROW_NUMBER() OVER (PARTITION BY id ORDER BY final_score DESC) as rn
        FROM enriched_results
      )
      SELECT * FROM deduplicated_results
      WHERE rn = 1
      ORDER BY final_score DESC, id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(this.params.limit);
    values.push(this.params.offset);

    return { query, values };
  }
}

export async function optimizedSearch(
  params: SearchOptions,
): Promise<SearchResponse> {
  const startTime = performance.now();

  try {
    // Determine if this is a search query or not
    const hasQuery = params.query && params.query.trim() !== "";
    const hasSearchCriteria =
      hasQuery || (params.tags && params.tags.length > 0);

    // Prepare search parameters
    const unifiedParams: UnifiedSearchParams = {
      userId: params.userId,
      limit: params.limit || 20,
      offset: params.cursor ? parseInt(params.cursor) || 0 : 0,
      types: params.types,
      specialFilters: params.specialFilters,
      isSearchQuery: hasSearchCriteria,
    };

    // Determine search strategies based on query
    if (params.tags && params.tags.length > 0) {
      unifiedParams.tags = params.tags;
    }

    if (params.query) {
      // Check if query is a domain
      if (isDomainQuery(params.query)) {
        unifiedParams.domain = extractDomain(params.query);
      } else {
        // Generate embedding for semantic search
        const trimmedQuery = params.query.trim();

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

        unifiedParams.embedding = embedding;
        unifiedParams.matchingDistance = params.matchingDistance || 0.1;
      }
    }

    // If no search strategies are available, fall back to default browsing
    if (
      !unifiedParams.tags &&
      !unifiedParams.domain &&
      !unifiedParams.embedding
    ) {
      return await defaultBrowsing(params);
    }

    // Build and execute optimized query
    const queryBuilder = new OptimizedSearchQuery(unifiedParams);
    const { query, values } = queryBuilder.build();

    console.log("Executing optimized search query:", {
      strategies: {
        tags: !!unifiedParams.tags,
        domain: !!unifiedParams.domain,
        vector: !!unifiedParams.embedding,
      },
      paramCount: values.length,
    });

    let results = (await prisma.$queryRawUnsafe(
      query,
      ...values,
    )) as QueryResult[];

    // Fallback 1: If no results and it's a vector search, retry with larger matchingDistance
    if (
      results.length === 0 &&
      unifiedParams.embedding &&
      unifiedParams.matchingDistance &&
      !unifiedParams.skipDistanceFilter
    ) {
      console.log(
        `No results found with matchingDistance ${unifiedParams.matchingDistance}, retrying with 1.0`,
      );
      unifiedParams.matchingDistance = 1.0;
      const retryBuilder = new OptimizedSearchQuery(unifiedParams);
      const { query: retryQuery, values: retryValues } = retryBuilder.build();

      results = (await prisma.$queryRawUnsafe(
        retryQuery,
        ...retryValues,
      )) as QueryResult[];

      // Fallback 2: If still no results, skip distance filter and return top matches
      if (results.length === 0) {
        console.log(
          "No results found with matchingDistance 1.0, returning top matches without distance filter",
        );
        unifiedParams.skipDistanceFilter = true;
        const finalRetryBuilder = new OptimizedSearchQuery(unifiedParams);
        const { query: finalRetryQuery, values: finalRetryValues } =
          finalRetryBuilder.build();

        results = (await prisma.$queryRawUnsafe(
          finalRetryQuery,
          ...finalRetryValues,
        )) as QueryResult[];
      }
    }

    // Transform results to SearchResult format
    const bookmarks: SearchResult[] = results.map((row) => ({
      id: row.id,
      url: row.url,
      title: row.title,
      summary: row.summary,
      preview: row.preview,
      type: row.type,
      status: row.status,
      ogImageUrl: row.ogImageUrl,
      ogDescription: row.ogDescription,
      faviconUrl: row.faviconUrl,
      score: row.final_score,
      matchType:
        row.strategy === "domain" ? "tag" : (row.strategy as "tag" | "vector"),
      openCount: row.open_count,
      starred: row.starred,
      read: row.read,
      createdAt: row.createdAt,
      metadata: row.metadata,
    }));

    const queryTime = performance.now() - startTime;

    // Check if there are more results
    const hasMore = bookmarks.length === unifiedParams.limit;
    const nextCursor = hasMore
      ? String(unifiedParams.offset + unifiedParams.limit)
      : undefined;

    return {
      bookmarks,
      hasMore,
      nextCursor,
      queryTime,
      totalCount: undefined, // Not computed in optimized query for performance
    };
  } catch (error) {
    console.error("Optimized search error:", error);

    // Fallback to original search implementation
    const { advancedSearch } = await import("./advanced-search");
    return await advancedSearch(params);
  }
}

async function defaultBrowsing(params: SearchOptions): Promise<SearchResponse> {
  const { advancedSearch } = await import("./advanced-search");
  return await advancedSearch(params);
}
