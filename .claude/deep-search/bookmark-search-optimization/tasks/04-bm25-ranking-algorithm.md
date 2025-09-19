# Task 4: BM25 Ranking Algorithm Implementation

## Objective
Replace arbitrary scoring weights with scientifically-proven BM25 ranking algorithm for improved search relevance

## Priority
🟠 **MEDIUM** - Implement after performance optimizations for better relevance

## Problem Statement
Current search scoring uses arbitrary multipliers:
- Tag boost: 1.5x (no scientific basis)
- Vector penalty: 0.6x (reduces semantic search effectiveness)
- Open frequency boost: logarithmic without optimization
- No consideration for document length or term frequency

BM25 provides:
- Scientifically-proven ranking based on term frequency and document length
- Better handling of repeated terms (diminishing returns)
- Established parameters that work well across domains
- Foundation for learning-to-rank improvements

## Technical Specification

### 4.1 BM25 Algorithm Implementation
```typescript
interface BM25Params {
  k1: number;  // Term frequency saturation parameter (default: 1.2)
  b: number;   // Length normalization parameter (default: 0.75)
}

interface DocumentStats {
  totalDocs: number;
  avgDocLength: number;
  termDocFreq: Map<string, number>; // How many docs contain each term
}

interface TermFrequency {
  term: string;
  frequency: number;
  docLength: number;
}

function calculateBM25Score(
  termFrequencies: TermFrequency[],
  documentStats: DocumentStats,
  params: BM25Params = { k1: 1.2, b: 0.75 }
): number {
  let totalScore = 0;

  for (const tf of termFrequencies) {
    // Calculate IDF (Inverse Document Frequency)
    const docsWithTerm = documentStats.termDocFreq.get(tf.term) || 1;
    const idf = Math.log(
      (documentStats.totalDocs - docsWithTerm + 0.5) / (docsWithTerm + 0.5)
    );

    // Calculate TF component with saturation
    const tfComponent = (tf.frequency * (params.k1 + 1)) / (
      tf.frequency + params.k1 * (
        1 - params.b + params.b * (tf.docLength / documentStats.avgDocLength)
      )
    );

    totalScore += idf * tfComponent;
  }

  return totalScore;
}
```

### 4.2 Full-Text Search Integration
```sql
-- Add full-text search columns and indexes
ALTER TABLE "Bookmark" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- Update search vector with title, summary, and content
UPDATE "Bookmark" SET "searchVector" =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE("vectorSummary", '')), 'C') ||
  setweight(to_tsvector('english', COALESCE("ogDescription", '')), 'D');

-- Create GIN index for full-text search
CREATE INDEX CONCURRENTLY idx_bookmark_search_vector
ON "Bookmark" USING gin("searchVector");

-- Function to maintain search vector
CREATE OR REPLACE FUNCTION update_bookmark_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW."vectorSummary", '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW."ogDescription", '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search vector
CREATE TRIGGER bookmark_search_vector_update
  BEFORE INSERT OR UPDATE ON "Bookmark"
  FOR EACH ROW EXECUTE FUNCTION update_bookmark_search_vector();
```

## Implementation Files

### File 1: BM25 Search Engine
**Path**: `apps/web/src/lib/search/bm25-search.ts`

```typescript
import { prisma } from '@/lib/database';
import type { SearchParams, SearchResponse, SearchResult } from './types';

interface BM25Params {
  k1: number;  // Term frequency saturation (1.0-2.0, default 1.2)
  b: number;   // Length normalization (0.0-1.0, default 0.75)
}

interface DocumentStats {
  totalDocs: number;
  avgDocLength: number;
  termDocFreq: Map<string, number>;
}

interface BM25Result {
  id: string;
  bm25Score: number;
  termMatches: number;
  docLength: number;
}

export class BM25SearchEngine {
  private readonly params: BM25Params;
  private documentStats: DocumentStats | null = null;

  constructor(params: BM25Params = { k1: 1.2, b: 0.75 }) {
    this.params = params;
  }

  /**
   * Pre-compute document statistics for BM25 scoring
   */
  private async getDocumentStats(userId: string): Promise<DocumentStats> {
    if (this.documentStats) return this.documentStats;

    // Get total documents and average length for user
    const statsQuery = `
      SELECT
        COUNT(*) as total_docs,
        AVG(
          COALESCE(LENGTH(title), 0) +
          COALESCE(LENGTH(summary), 0) +
          COALESCE(LENGTH("vectorSummary"), 0) +
          COALESCE(LENGTH("ogDescription"), 0)
        ) as avg_doc_length
      FROM "Bookmark"
      WHERE "userId" = $1 AND status = 'COMPLETE'
    `;

    const [statsResult] = await prisma.$queryRawUnsafe<[{
      total_docs: bigint;
      avg_doc_length: number;
    }]>(statsQuery, userId);

    const totalDocs = Number(statsResult.total_docs);
    const avgDocLength = statsResult.avg_doc_length || 100;

    // Note: For term document frequency, we'll compute it on-demand
    // A full implementation would pre-compute this for better performance
    this.documentStats = {
      totalDocs,
      avgDocLength,
      termDocFreq: new Map()
    };

    return this.documentStats;
  }

  /**
   * Execute BM25 search using PostgreSQL full-text search
   */
  async search(params: SearchParams): Promise<SearchResponse> {
    if (!params.query || params.query.trim().length === 0) {
      throw new Error('BM25 search requires a query');
    }

    const startTime = performance.now();
    const stats = await this.getDocumentStats(params.userId);

    // Parse query into terms for BM25 calculation
    const queryTerms = this.parseQuery(params.query);
    const tsQuery = this.buildTSQuery(queryTerms);

    // Build the BM25 query
    const bm25Query = `
      WITH term_stats AS (
        SELECT
          b.id,
          b.title,
          b.summary,
          b."vectorSummary",
          b."ogDescription",
          b.url,
          b.type,
          b.starred,
          b.read,
          b."createdAt",
          b."updatedAt",
          b.metadata,
          -- Calculate document length
          (
            COALESCE(LENGTH(b.title), 0) +
            COALESCE(LENGTH(b.summary), 0) +
            COALESCE(LENGTH(b."vectorSummary"), 0) +
            COALESCE(LENGTH(b."ogDescription"), 0)
          ) as doc_length,
          -- Get full-text search rank
          ts_rank_cd(b."searchVector", to_tsquery('english', $2)) as ts_rank,
          -- Count term matches for BM25
          ${this.buildTermCountQueries(queryTerms)}
        FROM "Bookmark" b
        WHERE b."userId" = $1
          AND b.status = 'COMPLETE'
          AND b."searchVector" @@ to_tsquery('english', $2)
          ${this.buildTypeFilter(params.types)}
          ${this.buildSpecialFilters(params.specialFilters)}
      ),
      bm25_scores AS (
        SELECT
          *,
          ${this.buildBM25Calculation(queryTerms, stats)} as bm25_score
        FROM term_stats
      ),
      final_scores AS (
        SELECT
          b.*,
          -- Combine BM25 with user behavior
          b.bm25_score + COALESCE(LOG(bo.open_count + 1) * 5, 0) as final_score,
          COALESCE(bo.open_count, 0) as open_count
        FROM bm25_scores b
        LEFT JOIN (
          SELECT "bookmarkId", COUNT(*) as open_count
          FROM "BookmarkOpen"
          WHERE "userId" = $1
          GROUP BY "bookmarkId"
        ) bo ON b.id = bo."bookmarkId"
      )
      SELECT * FROM final_scores
      ORDER BY final_score DESC, id DESC
      LIMIT $3 OFFSET $4
    `;

    const offset = params.cursor ? parseInt(params.cursor) || 0 : 0;
    const limit = params.limit || 20;

    try {
      const results = await prisma.$queryRawUnsafe<any[]>(
        bm25Query,
        params.userId,
        tsQuery,
        limit,
        offset
      );

      const bookmarks: SearchResult[] = results.map(row => ({
        id: row.id,
        userId: params.userId,
        url: row.url,
        type: row.type,
        title: row.title,
        summary: row.summary,
        preview: null, // Not selected in query for performance
        ogDescription: row.ogDescription,
        metadata: row.metadata,
        status: 'COMPLETE',
        starred: row.starred,
        read: row.read,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        score: row.final_score,
        matchType: 'bm25' as const,
        openCount: row.open_count,
        // Additional BM25-specific fields
        bm25Score: row.bm25_score,
        tsRank: row.ts_rank,
        docLength: row.doc_length
      }));

      const queryTime = performance.now() - startTime;
      const hasMore = bookmarks.length === limit;

      return {
        bookmarks,
        hasMore,
        cursor: hasMore ? String(offset + limit) : undefined,
        queryTime,
        totalCount: undefined // Not computed for performance
      };

    } catch (error) {
      console.error('BM25 search error:', error);
      throw new Error(`BM25 search failed: ${error.message}`);
    }
  }

  /**
   * Parse query into individual terms
   */
  private parseQuery(query: string): string[] {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2) // Remove short terms
      .slice(0, 10); // Limit to 10 terms for performance
  }

  /**
   * Build PostgreSQL tsquery from terms
   */
  private buildTSQuery(terms: string[]): string {
    return terms
      .map(term => term.replace(/[^a-z0-9]/g, '')) // Sanitize
      .filter(term => term.length > 0)
      .join(' & ');
  }

  /**
   * Build SQL to count term occurrences for BM25
   */
  private buildTermCountQueries(terms: string[]): string {
    return terms.map((term, index) => {
      return `
        (
          COALESCE(array_length(string_to_array(lower(b.title), '${term}'), 1) - 1, 0) +
          COALESCE(array_length(string_to_array(lower(b.summary), '${term}'), 1) - 1, 0) +
          COALESCE(array_length(string_to_array(lower(b."vectorSummary"), '${term}'), 1) - 1, 0) +
          COALESCE(array_length(string_to_array(lower(b."ogDescription"), '${term}'), 1) - 1, 0)
        ) as term_${index}_count
      `;
    }).join(',');
  }

  /**
   * Build BM25 calculation SQL
   */
  private buildBM25Calculation(terms: string[], stats: DocumentStats): string {
    const { k1, b } = this.params;
    const avgDocLength = stats.avgDocLength;
    const totalDocs = stats.totalDocs;

    const termScores = terms.map((term, index) => {
      // Estimate document frequency (simplified)
      const estimatedDocFreq = Math.max(1, Math.floor(totalDocs * 0.1)); // Assume 10% of docs contain term

      const idf = Math.log((totalDocs - estimatedDocFreq + 0.5) / (estimatedDocFreq + 0.5));

      return `
        CASE
          WHEN term_${index}_count > 0 THEN
            ${idf} * (
              (term_${index}_count * ${k1 + 1}) / (
                term_${index}_count + ${k1} * (
                  ${1 - b} + ${b} * (doc_length / ${avgDocLength})
                )
              )
            )
          ELSE 0
        END
      `;
    });

    return `(${termScores.join(' + ')})`;
  }

  private buildTypeFilter(types?: string[]): string {
    if (!types || types.length === 0) return '';
    const typeList = types.map(t => `'${t}'`).join(',');
    return `AND b.type IN (${typeList})`;
  }

  private buildSpecialFilters(specialFilters?: string[]): string {
    if (!specialFilters || specialFilters.length === 0) return '';

    const filters: string[] = [];
    if (specialFilters.includes('READ')) filters.push('b.read = true');
    if (specialFilters.includes('UNREAD')) filters.push('b.read = false');
    if (specialFilters.includes('STAR')) filters.push('b.starred = true');

    return filters.length > 0 ? `AND (${filters.join(' OR ')})` : '';
  }
}
```

### File 2: BM25 Integration with Hybrid Search
**Path**: `apps/web/src/lib/search/hybrid-search.ts`

```typescript
import { BM25SearchEngine } from './bm25-search';
import { optimizedSearch } from './optimized-search';
import type { SearchParams, SearchResponse, SearchResult } from './types';

interface HybridSearchConfig {
  useBM25: boolean;
  bm25Weight: number;
  vectorWeight: number;
  tagWeight: number;
  behaviorWeight: number;
}

export class HybridSearchEngine {
  private bm25Engine: BM25SearchEngine;
  private config: HybridSearchConfig;

  constructor(config: HybridSearchConfig = {
    useBM25: true,
    bm25Weight: 0.7,
    vectorWeight: 0.6,
    tagWeight: 1.5,
    behaviorWeight: 1.0
  }) {
    this.bm25Engine = new BM25SearchEngine();
    this.config = config;
  }

  async search(params: SearchParams): Promise<SearchResponse> {
    // If no query provided, use default browsing
    if (!params.query || params.query.trim().length === 0) {
      return await optimizedSearch(params);
    }

    const startTime = performance.now();

    try {
      // Execute BM25 text search
      const bm25Results = this.config.useBM25
        ? await this.bm25Engine.search(params)
        : { bookmarks: [], hasMore: false, queryTime: 0 };

      // Execute vector/tag search if needed
      const vectorParams = { ...params, query: undefined };
      const hasVectorSearch = params.tags?.length || this.shouldUseVectorSearch(params.query);

      const vectorResults = hasVectorSearch
        ? await optimizedSearch({
            ...vectorParams,
            query: this.shouldUseVectorSearch(params.query) ? params.query : undefined
          })
        : { bookmarks: [], hasMore: false, queryTime: 0 };

      // Combine and re-rank results
      const combinedResults = this.combineResults(
        bm25Results.bookmarks,
        vectorResults.bookmarks,
        params.query
      );

      const queryTime = performance.now() - startTime;

      return {
        bookmarks: combinedResults.slice(0, params.limit || 20),
        hasMore: combinedResults.length > (params.limit || 20),
        cursor: undefined, // Simplified for hybrid results
        queryTime,
        totalCount: undefined
      };

    } catch (error) {
      console.error('Hybrid search error:', error);

      // Fallback to optimized search
      return await optimizedSearch(params);
    }
  }

  private shouldUseVectorSearch(query: string): boolean {
    // Use vector search for conceptual queries
    const conceptualTerms = [
      'tutorial', 'guide', 'how to', 'learn', 'understanding',
      'explanation', 'introduction', 'overview', 'concept'
    ];

    return conceptualTerms.some(term =>
      query.toLowerCase().includes(term)
    );
  }

  private combineResults(
    bm25Results: SearchResult[],
    vectorResults: SearchResult[],
    query: string
  ): SearchResult[] {
    const resultMap = new Map<string, SearchResult>();
    const queryTerms = query.toLowerCase().split(/\s+/);

    // Add BM25 results with boosted scores
    bm25Results.forEach(result => {
      const boostedScore = (result.bm25Score || result.score) * this.config.bm25Weight;

      resultMap.set(result.id, {
        ...result,
        score: boostedScore,
        matchType: 'bm25'
      });
    });

    // Add vector results, combining scores if already present
    vectorResults.forEach(result => {
      const existing = resultMap.get(result.id);
      const vectorScore = result.score * this.config.vectorWeight;

      if (existing) {
        // Combine scores from multiple strategies
        existing.score += vectorScore;
        existing.matchType = 'hybrid';
      } else {
        resultMap.set(result.id, {
          ...result,
          score: vectorScore,
          matchType: result.matchType || 'vector'
        });
      }
    });

    // Apply title boost for exact term matches
    resultMap.forEach(result => {
      const titleBoost = this.calculateTitleBoost(result.title || '', queryTerms);
      result.score += titleBoost;
    });

    // Convert to array and sort by final score
    return Array.from(resultMap.values())
      .sort((a, b) => b.score - a.score);
  }

  private calculateTitleBoost(title: string, queryTerms: string[]): number {
    const titleLower = title.toLowerCase();
    let boost = 0;

    queryTerms.forEach(term => {
      if (titleLower.includes(term)) {
        boost += 10; // Boost for term in title

        // Extra boost for exact title match
        if (titleLower === term || titleLower.startsWith(term + ' ')) {
          boost += 20;
        }
      }
    });

    return boost;
  }

  updateConfig(newConfig: Partial<HybridSearchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
```

### File 3: Database Migration for Full-Text Search
**Path**: `packages/database/prisma/migrations/[timestamp]_add_fulltext_search/migration.sql`

```sql
-- Add full-text search support with BM25
BEGIN;

-- Add search vector column for full-text search
ALTER TABLE "Bookmark" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_bookmark_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW."vectorSummary", '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW."ogDescription", '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing records
UPDATE "Bookmark" SET "searchVector" =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(summary, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE("vectorSummary", '')), 'C') ||
  setweight(to_tsvector('english', COALESCE("ogDescription", '')), 'D')
WHERE "searchVector" IS NULL;

-- Create trigger to auto-update search vector
DROP TRIGGER IF EXISTS bookmark_search_vector_update ON "Bookmark";
CREATE TRIGGER bookmark_search_vector_update
  BEFORE INSERT OR UPDATE ON "Bookmark"
  FOR EACH ROW EXECUTE FUNCTION update_bookmark_search_vector();

-- Create GIN index for full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmark_search_vector
ON "Bookmark" USING gin("searchVector");

-- Create index for BM25 calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmark_text_length
ON "Bookmark"((
  COALESCE(LENGTH(title), 0) +
  COALESCE(LENGTH(summary), 0) +
  COALESCE(LENGTH("vectorSummary"), 0) +
  COALESCE(LENGTH("ogDescription"), 0)
)) WHERE status = 'COMPLETE';

COMMIT;
```

## Integration Points

### 1. Update Main Search Route
**Path**: `apps/web/src/lib/search/cached-search.ts`

```typescript
import { HybridSearchEngine } from './hybrid-search';

const hybridEngine = new HybridSearchEngine();

export async function cachedAdvancedSearch(params: SearchParams): Promise<SearchResponse> {
  // ... cache checking logic ...

  // Use hybrid search with BM25
  const result = await hybridEngine.search(params);

  // ... cache setting logic ...
}
```

### 2. A/B Testing Integration
**Path**: `apps/web/src/lib/search/ab-testing.ts`

```typescript
export async function getSearchImplementation(userId: string): Promise<'hybrid' | 'optimized'> {
  // Simple hash-based A/B testing
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId));
  const hashArray = new Uint8Array(hash);
  const hashValue = hashArray[0];

  // 50% get hybrid search with BM25
  return hashValue < 128 ? 'hybrid' : 'optimized';
}
```

## Success Criteria

### Relevance Metrics
- [ ] Improved click-through rate on search results (+15%)
- [ ] Reduced zero-result queries (-20%)
- [ ] Better user engagement with search results (+25%)
- [ ] More accurate results for long-tail queries

### Performance Metrics
- [ ] BM25 search response time < 300ms
- [ ] No significant performance regression vs current search
- [ ] Efficient use of full-text search indexes
- [ ] Reasonable memory usage for document statistics

### Quality Metrics
- [ ] Scientific scoring vs arbitrary multipliers
- [ ] Consistent ranking across similar queries
- [ ] Better handling of document length variations
- [ ] Improved relevance for term frequency patterns

## Risk Mitigation

### Implementation Complexity
- **Risk**: BM25 implementation becomes too complex
- **Mitigation**: Start with simplified version, iterate
- **Fallback**: Keep existing search as backup

### Performance Impact
- **Risk**: Full-text search slower than vector search
- **Mitigation**: Proper indexing and query optimization
- **Monitoring**: Track query performance metrics

### Relevance Changes
- **Risk**: Users prefer current ranking
- **Mitigation**: A/B testing with careful metrics tracking
- **Rollback**: Easy switch back to optimized search

## Implementation Order

1. **Add database migration** for full-text search support
2. **Implement basic BM25 engine** with proper testing
3. **Create hybrid search** combining BM25 + vector
4. **Add A/B testing framework** for safe rollout
5. **Monitor metrics** and optimize parameters
6. **Full rollout** based on positive results

## Dependencies
- PostgreSQL full-text search capabilities
- Database indexes from Task 1
- Optimized search from Task 3
- Performance monitoring tools

## Estimated Effort
- **Development**: 12-16 hours
- **Testing**: 4-6 hours
- **Database migration**: 2-3 hours
- **A/B testing setup**: 2-3 hours
- **Total**: 20-28 hours