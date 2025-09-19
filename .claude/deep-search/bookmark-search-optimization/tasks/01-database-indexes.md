# Task 1: Database Performance Indexes

## Objective
Add critical database indexes to eliminate performance bottlenecks for 1000+ bookmarks search

## Priority
🔴 **CRITICAL** - Must be completed first, this is the root cause of performance issues

## Problem Statement
Current database lacks essential indexes causing:
- Full table scans on filtered queries
- Slow vector similarity searches
- Poor performance with large bookmark collections
- Memory-intensive query execution

## Technical Specification

### 1.1 Composite Filter Indexes
```sql
-- Primary filter index for most common query patterns
CREATE INDEX CONCURRENTLY idx_bookmark_user_filters
ON "Bookmark"(userId, type, starred, read, status)
WHERE status = 'COMPLETE';

-- Chronological sorting optimization
CREATE INDEX CONCURRENTLY idx_bookmark_user_created
ON "Bookmark"(userId, createdAt DESC)
WHERE status = 'COMPLETE';

-- Special filter combinations
CREATE INDEX CONCURRENTLY idx_bookmark_starred
ON "Bookmark"(userId, starred, createdAt DESC)
WHERE starred = true AND status = 'COMPLETE';

CREATE INDEX CONCURRENTLY idx_bookmark_unread
ON "Bookmark"(userId, read, createdAt DESC)
WHERE read = false AND status = 'COMPLETE';
```

### 1.2 Vector Search Indexes
```sql
-- HNSW index for title embeddings (high accuracy)
CREATE INDEX CONCURRENTLY idx_title_embedding_hnsw
ON "Bookmark" USING hnsw (titleEmbedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- HNSW index for summary embeddings (high accuracy)
CREATE INDEX CONCURRENTLY idx_summary_embedding_hnsw
ON "Bookmark" USING hnsw (vectorSummaryEmbedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### 1.3 Tag Search Optimization
```sql
-- Optimize tag join queries
CREATE INDEX CONCURRENTLY idx_bookmark_tag_user
ON "BookmarkTag"(userId, tagId);

CREATE INDEX CONCURRENTLY idx_bookmark_tag_bookmark
ON "BookmarkTag"(bookmarkId, tagId);
```

## Implementation Files

### File 1: Database Migration
**Path**: `packages/database/prisma/migrations/[timestamp]_search_optimization_indexes/migration.sql`

```sql
-- Critical Search Performance Indexes
-- This migration adds indexes to optimize search performance for large bookmark collections

BEGIN;

-- Composite filter indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmark_user_filters
ON "Bookmark"(userId, type, starred, read, status)
WHERE status = 'COMPLETE';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmark_user_created
ON "Bookmark"(userId, createdAt DESC)
WHERE status = 'COMPLETE';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmark_starred
ON "Bookmark"(userId, starred, createdAt DESC)
WHERE starred = true AND status = 'COMPLETE';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmark_unread
ON "Bookmark"(userId, read, createdAt DESC)
WHERE read = false AND status = 'COMPLETE';

-- Vector search indexes (requires pgvector extension)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_title_embedding_hnsw
ON "Bookmark" USING hnsw (titleEmbedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_summary_embedding_hnsw
ON "Bookmark" USING hnsw (vectorSummaryEmbedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Tag search optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmark_tag_user
ON "BookmarkTag"(userId, tagId);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmark_tag_bookmark
ON "BookmarkTag"(bookmarkId, tagId);

COMMIT;
```

### File 2: Schema Updates
**Path**: `packages/database/prisma/schema.prisma`

Add index definitions to the Bookmark model:
```prisma
model Bookmark {
  // ... existing fields ...

  @@index([userId, type, starred, read, status], name: "idx_bookmark_user_filters")
  @@index([userId, createdAt(sort: Desc)], name: "idx_bookmark_user_created")
  @@index([userId, starred, createdAt(sort: Desc)], name: "idx_bookmark_starred")
  @@index([userId, read, createdAt(sort: Desc)], name: "idx_bookmark_unread")
}

model BookmarkTag {
  // ... existing fields ...

  @@index([userId, tagId], name: "idx_bookmark_tag_user")
  @@index([bookmarkId, tagId], name: "idx_bookmark_tag_bookmark")
}
```

## Validation & Testing

### Performance Testing Script
**Path**: `packages/database/scripts/test-search-performance.ts`

```typescript
import { prisma } from '../src/client';
import { performance } from 'perf_hooks';

async function testSearchPerformance() {
  const testUserId = 'test-user-with-1000-bookmarks';

  console.log('Testing search performance with indexes...');

  // Test 1: Filtered query
  const start1 = performance.now();
  const filteredResults = await prisma.bookmark.findMany({
    where: {
      userId: testUserId,
      type: 'ARTICLE',
      starred: true,
      status: 'COMPLETE'
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  const end1 = performance.now();
  console.log(`Filtered query: ${end1 - start1}ms (${filteredResults.length} results)`);

  // Test 2: Vector similarity (requires embedding)
  const start2 = performance.now();
  const embedding = new Array(1536).fill(0.1); // Mock embedding
  const vectorResults = await prisma.$queryRaw`
    SELECT id, title,
           titleEmbedding <=> ${JSON.stringify(embedding)}::vector as distance
    FROM "Bookmark"
    WHERE userId = ${testUserId}
    ORDER BY distance ASC
    LIMIT 20
  `;
  const end2 = performance.now();
  console.log(`Vector query: ${end2 - start2}ms (${vectorResults.length} results)`);

  // Test 3: Tag search
  const start3 = performance.now();
  const tagResults = await prisma.bookmark.findMany({
    where: {
      userId: testUserId,
      tags: {
        some: {
          tag: {
            name: 'javascript'
          }
        }
      }
    },
    take: 20
  });
  const end3 = performance.now();
  console.log(`Tag query: ${end3 - start3}ms (${tagResults.length} results)`);
}

testSearchPerformance().catch(console.error);
```

## Success Criteria

### Performance Metrics
- [ ] Filtered queries complete in < 50ms for 1000+ bookmarks
- [ ] Vector similarity queries complete in < 200ms
- [ ] Tag search queries complete in < 100ms
- [ ] Memory usage for queries reduced by 60%+

### Database Verification
- [ ] All indexes created successfully with `CONCURRENTLY`
- [ ] Query plans show index usage (no Seq Scan on Bookmark table)
- [ ] No performance regression on existing queries
- [ ] Database size increase < 20% (expected for indexes)

## Risk Mitigation

### Index Creation Risks
- **Risk**: Long-running index creation blocks database
- **Mitigation**: Use `CONCURRENTLY` flag for non-blocking creation
- **Rollback**: `DROP INDEX CONCURRENTLY` if performance degrades

### Memory Usage
- **Risk**: Indexes consume additional memory
- **Mitigation**: Monitor database memory usage during creation
- **Threshold**: Cancel if memory usage exceeds 80%

## Implementation Order

1. **Create migration file** with all index definitions
2. **Update schema.prisma** with index annotations
3. **Run migration** on staging environment first
4. **Test performance** with test script
5. **Monitor memory usage** and query performance
6. **Deploy to production** if all tests pass

## Dependencies
- PostgreSQL with pgvector extension
- Sufficient database memory for index creation
- Test data with 1000+ bookmarks for validation

## Estimated Effort
- **Development**: 2-3 hours
- **Testing**: 1-2 hours
- **Deployment**: 30 minutes
- **Total**: 4-6 hours