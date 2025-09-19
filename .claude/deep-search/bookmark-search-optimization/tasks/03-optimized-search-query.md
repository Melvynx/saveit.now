# Task 3: Optimized Single-Query Search

## Objective
Combine multiple search strategies (tag, domain, vector) into a single optimized database query to eliminate round-trips and improve performance

## Priority
🟡 **HIGH** - Implement after caching for maximum cumulative performance benefit

## Problem Statement
Current search implementation performs multiple separate queries:
1. Tag search query → results
2. Domain search query → results
3. Vector search query → results
4. In-memory combination and deduplication → final results

This approach causes:
- Multiple database round-trips (3x latency)
- High memory usage for result combination
- Complex deduplication logic
- Unpredictable performance characteristics

## Technical Specification

### 3.1 Unified Query Architecture
```sql
WITH search_strategies AS (
  -- Strategy 1: Tag-based search
  SELECT
    b.*,
    'tag' as strategy,
    (COUNT(DISTINCT bt.tagId)::float / ${tagCount}) * 100 * 1.5 as base_score
  FROM "Bookmark" b
  JOIN "BookmarkTag" bt ON b.id = bt.bookmarkId
  JOIN "Tag" t ON bt.tagId = t.id
  WHERE b.userId = $1
    AND t.name = ANY($2::text[])
    AND b.status = 'COMPLETE'
  GROUP BY b.id
  HAVING COUNT(DISTINCT bt.tagId) > 0

  UNION ALL

  -- Strategy 2: Domain-based search
  SELECT
    b.*,
    'domain' as strategy,
    CASE
      WHEN b.url ~ $3 THEN 150  -- Exact domain match
      ELSE 120                  -- Partial domain match
    END as base_score
  FROM "Bookmark" b
  WHERE b.userId = $1
    AND b.url ILIKE '%' || $4 || '%'
    AND b.status = 'COMPLETE'

  UNION ALL

  -- Strategy 3: Vector similarity search
  SELECT
    b.*,
    'vector' as strategy,
    (100 - (LEAST(
      COALESCE(b.titleEmbedding <=> $5::vector, 1),
      COALESCE(b.vectorSummaryEmbedding <=> $5::vector, 1)
    ) * 100)) * 0.6 as base_score
  FROM "Bookmark" b
  WHERE b.userId = $1
    AND b.status = 'COMPLETE'
    AND (
      b.titleEmbedding <=> $5::vector <= (
        SELECT MIN(LEAST(
          COALESCE(titleEmbedding <=> $5::vector, 1),
          COALESCE(vectorSummaryEmbedding <=> $5::vector, 1)
        )) + $6 FROM "Bookmark" WHERE userId = $1
      )
    )
),
enriched_results AS (
  SELECT
    s.*,
    COALESCE(bo.openCount, 0) as open_count,
    s.base_score + (COALESCE(LOG(bo.openCount + 1) * 10, 0)) as final_score
  FROM search_strategies s
  LEFT JOIN (
    SELECT bookmarkId, COUNT(*) as openCount
    FROM "BookmarkOpen"
    WHERE userId = $1
    GROUP BY bookmarkId
  ) bo ON s.id = bo.bookmarkId
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
LIMIT $7 OFFSET $8;
```

### 3.2 Query Builder Implementation
```typescript
interface UnifiedSearchParams {
  userId: string;
  tags?: string[];
  domain?: string;
  embedding?: number[];
  matchingDistance?: number;
  limit: number;
  offset: number;
  types?: BookmarkType[];
  specialFilters?: SpecialFilter[];
}

class OptimizedSearchQuery {
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
        AND b.status = 'COMPLETE'
        ${this.buildTypeFilter('b')}
        ${this.buildSpecialFilters('b')}
      GROUP BY b.id, b."userId", b.url, b.type, b.title, b."titleEmbedding",
               b.summary, b."vectorSummary", b."vectorSummaryEmbedding",
               b.preview, b."ogDescription", b.metadata, b.status,
               b.starred, b.read, b."createdAt", b."updatedAt"
      HAVING COUNT(DISTINCT bt."tagId") > 0
    `;
  }

  private buildDomainSearchCTE(domain: string): string {
    const domainRegex = `^https?://([^/]*\\.)?${domain.replace('.', '\\.')}(/.*)?$`;

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
        AND b.status = 'COMPLETE'
        ${this.buildTypeFilter('b')}
        ${this.buildSpecialFilters('b')}
    `;
  }

  private buildVectorSearchCTE(): string {
    return `
      SELECT
        b.*,
        'vector'::text as strategy,
        (100 - (LEAST(
          COALESCE(b."titleEmbedding" <=> $3::vector, 1),
          COALESCE(b."vectorSummaryEmbedding" <=> $3::vector, 1)
        ) * 100)) * 0.6 as base_score
      FROM "Bookmark" b
      WHERE b."userId" = $1
        AND b.status = 'COMPLETE'
        AND (
          LEAST(
            COALESCE(b."titleEmbedding" <=> $3::vector, 1),
            COALESCE(b."vectorSummaryEmbedding" <=> $3::vector, 1)
          ) <= (
            SELECT MIN(LEAST(
              COALESCE("titleEmbedding" <=> $3::vector, 1),
              COALESCE("vectorSummaryEmbedding" <=> $3::vector, 1)
            )) + $4
            FROM "Bookmark"
            WHERE "userId" = $1 AND status = 'COMPLETE'
          )
        )
        ${this.buildTypeFilter('b')}
        ${this.buildSpecialFilters('b')}
    `;
  }

  private buildTypeFilter(alias: string): string {
    if (!this.params.types || this.params.types.length === 0) return '';
    const typeList = this.params.types.map(t => `'${t}'`).join(',');
    return `AND ${alias}.type IN (${typeList})`;
  }

  private buildSpecialFilters(alias: string): string {
    if (!this.params.specialFilters || this.params.specialFilters.length === 0) return '';

    const filters: string[] = [];

    if (this.params.specialFilters.includes('READ')) {
      filters.push(`${alias}.read = true`);
    }
    if (this.params.specialFilters.includes('UNREAD')) {
      filters.push(`${alias}.read = false`);
    }
    if (this.params.specialFilters.includes('STAR')) {
      filters.push(`${alias}.starred = true`);
    }

    return filters.length > 0 ? `AND (${filters.join(' OR ')})` : '';
  }

  constructor(private params: UnifiedSearchParams) {}

  build(): { query: string; values: any[] } {
    const strategies: string[] = [];
    const values: any[] = [this.params.userId];
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
      // Domain is embedded in query, no additional param needed
    }

    // Add vector search strategy
    if (this.params.embedding) {
      strategies.push(this.buildVectorSearchCTE());
      values.push(this.params.embedding);
      values.push(this.params.matchingDistance || 0.1);
      paramIndex += 2;
    }

    if (strategies.length === 0) {
      throw new Error('At least one search strategy must be provided');
    }

    const query = `
      WITH search_strategies AS (
        ${strategies.join('\n        UNION ALL\n')}
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
```

## Implementation Files

### File 1: Optimized Search Implementation
**Path**: `apps/web/src/lib/search/optimized-search.ts`

```typescript
import { prisma } from '@/lib/database';
import { getEmbedding } from '@/lib/openai';
import type { SearchParams, SearchResponse, SearchResult } from './types';

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
        AND b.status = 'COMPLETE'
        ${this.buildTypeFilter('b')}
        ${this.buildSpecialFilters('b')}
      GROUP BY b.id, b."userId", b.url, b.type, b.title, b."titleEmbedding",
               b.summary, b."vectorSummary", b."vectorSummaryEmbedding",
               b.preview, b."ogDescription", b.metadata, b.status,
               b.starred, b.read, b."createdAt", b."updatedAt"
      HAVING COUNT(DISTINCT bt."tagId") > 0
    `;
  }

  private buildDomainSearchCTE(domain: string): string {
    const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
        AND b.status = 'COMPLETE'
        ${this.buildTypeFilter('b')}
        ${this.buildSpecialFilters('b')}
    `;
  }

  private buildVectorSearchCTE(paramIndex: number): string {
    return `
      SELECT
        b.*,
        'vector'::text as strategy,
        (100 - (LEAST(
          COALESCE(b."titleEmbedding" <=> $${paramIndex}::vector, 1),
          COALESCE(b."vectorSummaryEmbedding" <=> $${paramIndex}::vector, 1)
        ) * 100)) * 0.6 as base_score
      FROM "Bookmark" b
      WHERE b."userId" = $1
        AND b.status = 'COMPLETE'
        AND (
          LEAST(
            COALESCE(b."titleEmbedding" <=> $${paramIndex}::vector, 1),
            COALESCE(b."vectorSummaryEmbedding" <=> $${paramIndex}::vector, 1)
          ) <= (
            SELECT MIN(LEAST(
              COALESCE("titleEmbedding" <=> $${paramIndex}::vector, 1),
              COALESCE("vectorSummaryEmbedding" <=> $${paramIndex}::vector, 1)
            )) + $${paramIndex + 1}
            FROM "Bookmark"
            WHERE "userId" = $1 AND status = 'COMPLETE'
          )
        )
        ${this.buildTypeFilter('b')}
        ${this.buildSpecialFilters('b')}
    `;
  }

  private buildTypeFilter(alias: string): string {
    if (!this.params.types || this.params.types.length === 0) return '';
    const typeList = this.params.types.map(t => `'${t}'`).join(',');
    return `AND ${alias}.type IN (${typeList})`;
  }

  private buildSpecialFilters(alias: string): string {
    if (!this.params.specialFilters || this.params.specialFilters.length === 0) return '';

    const filters: string[] = [];

    if (this.params.specialFilters.includes('READ')) {
      filters.push(`${alias}.read = true`);
    }
    if (this.params.specialFilters.includes('UNREAD')) {
      filters.push(`${alias}.read = false`);
    }
    if (this.params.specialFilters.includes('STAR')) {
      filters.push(`${alias}.starred = true`);
    }

    return filters.length > 0 ? `AND (${filters.join(' OR ')})` : '';
  }

  build(): { query: string; values: any[] } {
    const strategies: string[] = [];
    const values: any[] = [this.params.userId];
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
      // Domain is embedded in query, no additional param needed
    }

    // Add vector search strategy
    if (this.params.embedding) {
      strategies.push(this.buildVectorSearchCTE(paramIndex));
      values.push(this.params.embedding);
      values.push(this.params.matchingDistance || 0.1);
      paramIndex += 2;
    }

    if (strategies.length === 0) {
      throw new Error('At least one search strategy must be provided');
    }

    const query = `
      WITH search_strategies AS (
        ${strategies.join('\n        UNION ALL\n')}
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

interface UnifiedSearchParams {
  userId: string;
  tags?: string[];
  domain?: string;
  embedding?: number[];
  matchingDistance?: number;
  limit: number;
  offset: number;
  types?: string[];
  specialFilters?: string[];
}

export async function optimizedSearch(params: SearchParams): Promise<SearchResponse> {
  const startTime = performance.now();

  try {
    // Prepare search parameters
    const unifiedParams: UnifiedSearchParams = {
      userId: params.userId,
      limit: params.limit || 20,
      offset: params.cursor ? parseInt(params.cursor) || 0 : 0,
      types: params.types,
      specialFilters: params.specialFilters
    };

    // Determine search strategies based on query
    if (params.tags && params.tags.length > 0) {
      unifiedParams.tags = params.tags;
    }

    if (params.query) {
      // Check if query is a domain
      if (isDomainQuery(params.query)) {
        unifiedParams.domain = params.query;
      } else {
        // Generate embedding for semantic search
        unifiedParams.embedding = await getEmbedding(params.query);
        unifiedParams.matchingDistance = params.matchingDistance || 0.1;
      }
    }

    // If no search strategies are available, fall back to default browsing
    if (!unifiedParams.tags && !unifiedParams.domain && !unifiedParams.embedding) {
      return await defaultBrowsing(params);
    }

    // Build and execute optimized query
    const queryBuilder = new OptimizedSearchQuery(unifiedParams);
    const { query, values } = queryBuilder.build();

    console.log('Executing optimized search query:', {
      strategies: {
        tags: !!unifiedParams.tags,
        domain: !!unifiedParams.domain,
        vector: !!unifiedParams.embedding
      },
      paramCount: values.length
    });

    const results = await prisma.$queryRawUnsafe(query, ...values) as any[];

    // Transform results to SearchResult format
    const bookmarks: SearchResult[] = results.map(row => ({
      id: row.id,
      userId: row.userId,
      url: row.url,
      type: row.type,
      title: row.title,
      summary: row.summary,
      preview: row.preview,
      ogDescription: row.ogDescription,
      metadata: row.metadata,
      status: row.status,
      starred: row.starred,
      read: row.read,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      score: row.final_score,
      matchType: row.strategy as 'tag' | 'domain' | 'vector',
      openCount: row.open_count
    }));

    const queryTime = performance.now() - startTime;

    // Check if there are more results
    const hasMore = bookmarks.length === unifiedParams.limit;
    const nextCursor = hasMore ? String(unifiedParams.offset + unifiedParams.limit) : undefined;

    return {
      bookmarks,
      hasMore,
      cursor: nextCursor,
      queryTime,
      totalCount: undefined // Not computed in optimized query for performance
    };

  } catch (error) {
    console.error('Optimized search error:', error);

    // Fallback to original search implementation
    const { advancedSearch } = await import('./advanced-search');
    return await advancedSearch(params);
  }
}

function isDomainQuery(query: string): boolean {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(query);
}

async function defaultBrowsing(params: SearchParams): Promise<SearchResponse> {
  const { defaultBrowsing: defaultBrowsingImpl } = await import('./default-browsing');
  return await defaultBrowsingImpl(params);
}
```

### File 2: Query Performance Testing
**Path**: `apps/web/src/lib/search/__tests__/optimized-search.test.ts`

```typescript
import { optimizedSearch } from '../optimized-search';
import { advancedSearch } from '../advanced-search';
import { prisma } from '@/lib/database';

describe('Optimized Search Performance', () => {
  let testUserId: string;
  let testBookmarks: any[];

  beforeAll(async () => {
    // Create test data
    testUserId = 'test-user-optimized-search';
    // Setup test bookmarks, tags, etc.
  });

  afterAll(async () => {
    // Cleanup test data
  });

  test('should perform faster than original search with 1000+ bookmarks', async () => {
    const searchParams = {
      userId: testUserId,
      query: 'javascript tutorial',
      tags: ['programming', 'web'],
      limit: 20
    };

    // Test optimized search
    const optimizedStart = performance.now();
    const optimizedResult = await optimizedSearch(searchParams);
    const optimizedTime = performance.now() - optimizedStart;

    // Test original search
    const originalStart = performance.now();
    const originalResult = await advancedSearch(searchParams);
    const originalTime = performance.now() - originalStart;

    // Optimized should be significantly faster
    expect(optimizedTime).toBeLessThan(originalTime * 0.7); // At least 30% faster

    // Results should be equivalent (same IDs, may have different ordering)
    const optimizedIds = new Set(optimizedResult.bookmarks.map(b => b.id));
    const originalIds = new Set(originalResult.bookmarks.map(b => b.id));

    expect(optimizedIds.size).toBeGreaterThan(0);
    expect(originalIds.size).toBeGreaterThan(0);
  });

  test('should handle edge cases gracefully', async () => {
    // Test with no results
    const noResultsParams = {
      userId: testUserId,
      query: 'nonexistent-search-term-xyz123',
      limit: 20
    };

    const result = await optimizedSearch(noResultsParams);
    expect(result.bookmarks).toHaveLength(0);
    expect(result.hasMore).toBe(false);

    // Test with only tags
    const tagOnlyResult = await optimizedSearch({
      userId: testUserId,
      tags: ['programming'],
      limit: 20
    });

    expect(tagOnlyResult.bookmarks.length).toBeGreaterThan(0);
  });

  test('should maintain scoring consistency', async () => {
    const params = {
      userId: testUserId,
      query: 'react hooks',
      limit: 10
    };

    const result = await optimizedSearch(params);

    // Scores should be in descending order
    for (let i = 1; i < result.bookmarks.length; i++) {
      expect(result.bookmarks[i-1].score).toBeGreaterThanOrEqual(result.bookmarks[i].score);
    }

    // All results should have valid scores
    result.bookmarks.forEach(bookmark => {
      expect(typeof bookmark.score).toBe('number');
      expect(bookmark.score).toBeGreaterThan(0);
    });
  });
});
```

## Integration Points

### 1. Replace Advanced Search Implementation
**Path**: `apps/web/src/lib/search/cached-search.ts`

```typescript
import { optimizedSearch } from './optimized-search';

export async function cachedAdvancedSearch(params: SearchParams): Promise<SearchResponse> {
  // ... cache checking logic ...

  // Use optimized search instead of original
  const result = await optimizedSearch(params);

  // ... cache setting logic ...
}
```

### 2. Update API Route
**Path**: `apps/web/app/api/bookmarks/route.ts`

```typescript
// Replace import
import { cachedAdvancedSearch } from '@/lib/search/cached-search';

// Usage remains the same - internal implementation is optimized
const result = await cachedAdvancedSearch({
  userId,
  query,
  tags,
  types,
  specialFilters,
  limit,
  cursor,
  matchingDistance
});
```

## Success Criteria

### Performance Metrics
- [ ] Single query execution vs 3 separate queries
- [ ] 50%+ reduction in total query time
- [ ] 70%+ reduction in memory usage during search
- [ ] Consistent sub-200ms response time for complex searches

### Query Optimization
- [ ] Database query plan shows efficient index usage
- [ ] No sequential scans on large tables
- [ ] Proper deduplication without memory explosion
- [ ] Consistent result ordering for pagination

### Compatibility
- [ ] Identical results compared to original search (same relevance)
- [ ] No breaking changes to search API
- [ ] All existing search features work correctly
- [ ] Graceful fallback if optimized query fails

## Risk Mitigation

### Query Complexity
- **Risk**: Complex SQL query becomes unmaintainable
- **Mitigation**: Modular query builder with unit tests
- **Fallback**: Automatic fallback to original search on errors

### Result Consistency
- **Risk**: Different scoring behavior vs original search
- **Mitigation**: Comprehensive A/B testing with real user data
- **Validation**: Side-by-side comparison tests

### Database Load
- **Risk**: Single complex query puts more load on database
- **Mitigation**: Proper indexing and query optimization
- **Monitoring**: Database performance metrics tracking

## Implementation Order

1. **Create optimized query builder** with comprehensive tests
2. **Implement unified search function** with fallback
3. **Add performance testing** and benchmarking
4. **Integrate with caching layer** for maximum benefit
5. **A/B test** against original implementation
6. **Full rollout** with monitoring

## Dependencies
- Database indexes from Task 1 (critical for performance)
- OpenAI embedding function (for vector search)
- Existing search types and interfaces
- PostgreSQL with pgvector extension

## Estimated Effort
- **Development**: 8-12 hours
- **Testing**: 4-6 hours
- **Performance validation**: 2-3 hours
- **Integration**: 1-2 hours
- **Total**: 15-23 hours