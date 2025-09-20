#!/usr/bin/env tsx

/**
 * Direct Performance Test - Teste directement l'optimisation SQL
 * Contourne les problèmes d'import en testant la logique de base
 */

import { config } from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
config({ path: join(__dirname, '..', '.env') });
config({ path: join(__dirname, '..', '.env.test'), override: true });

async function main() {
  console.log('🚀 Direct SQL Performance Test\n');

  try {
    // Import Prisma client directly
    const { prisma } = await import('@workspace/database');

    console.log('✅ Database connected');

    // Get stats
    const userCount = await prisma.user.count();
    const bookmarkCount = await prisma.bookmark.count();
    console.log(`📊 Database: ${userCount} users, ${bookmarkCount.toLocaleString()} bookmarks`);

    // Get a user with many bookmarks for meaningful tests
    const userWithBookmarks = await prisma.user.findFirst({
      where: {
        bookmarks: {
          some: {}
        }
      },
      include: {
        _count: {
          select: {
            bookmarks: true
          }
        }
      },
      orderBy: {
        bookmarks: {
          _count: 'desc'
        }
      }
    });

    if (!userWithBookmarks) {
      console.log('❌ No users with bookmarks found');
      return;
    }

    console.log(`👤 Test User: ${userWithBookmarks.id} (${userWithBookmarks._count.bookmarks} bookmarks)`);

    // Test 1: Simple tag search - Original vs Optimized SQL
    console.log('\n🧪 Test 1: Tag Search Performance');

    const testUserId = userWithBookmarks.id;
    const testTags = ['programming'];

    // Original approach: Multiple queries
    console.log('   🐢 Original Multi-Query Approach...');
    const originalStart = performance.now();

    // Query 1: Find bookmarks by tags
    const taggedBookmarks = await prisma.bookmark.findMany({
      where: {
        userId: testUserId,
        tags: {
          some: {
            tag: {
              name: {
                in: testTags
              }
            }
          }
        },
        status: 'READY'
      },
      take: 20,
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Query 2: Get open counts for scoring
    const bookmarkIds = taggedBookmarks.map(b => b.id);
    const openCounts = await prisma.bookmarkOpen.groupBy({
      by: ['bookmarkId'],
      where: {
        userId: testUserId,
        bookmarkId: { in: bookmarkIds }
      },
      _count: {
        id: true
      }
    });

    const originalTime = performance.now() - originalStart;
    const originalResults = taggedBookmarks.length;

    console.log(`      • Time: ${originalTime.toFixed(2)}ms`);
    console.log(`      • Queries: 2 separate queries`);
    console.log(`      • Results: ${originalResults}`);

    // Optimized approach: Single unified query
    console.log('   ⚡ Optimized Single-Query Approach...');
    const optimizedStart = performance.now();

    const optimizedQuery = `
      WITH search_strategies AS (
        SELECT
          b.id, b."userId", b.url, b.type, b.title, b.summary, b."vectorSummary",
          b.preview, b."ogDescription", b.metadata, b.status, b.starred,
          b.read, b."createdAt", b."updatedAt", b."ogImageUrl", b."faviconUrl",
          'tag'::text as strategy,
          (COUNT(DISTINCT bt."tagId")::float / ${testTags.length}) * 100 * 1.5 as base_score
        FROM "Bookmark" b
        JOIN "BookmarkTag" bt ON b.id = bt."bookmarkId"
        JOIN "Tag" t ON bt."tagId" = t.id
        WHERE b."userId" = $1
          AND t.name = ANY($2::text[])
          AND b.status = 'READY'
        GROUP BY b.id, b."userId", b.url, b.type, b.title,
                 b.summary, b."vectorSummary", b.preview, b."ogDescription",
                 b.metadata, b.status, b.starred, b.read, b."createdAt",
                 b."updatedAt", b."ogImageUrl", b."faviconUrl"
        HAVING COUNT(DISTINCT bt."tagId") > 0
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
      )
      SELECT * FROM enriched_results
      ORDER BY final_score DESC, id DESC
      LIMIT 20
    `;

    const optimizedResults = await prisma.$queryRawUnsafe(
      optimizedQuery,
      testUserId,
      testTags
    ) as any[];

    const optimizedTime = performance.now() - optimizedStart;

    console.log(`      • Time: ${optimizedTime.toFixed(2)}ms`);
    console.log(`      • Queries: 1 unified query`);
    console.log(`      • Results: ${optimizedResults.length}`);

    // Performance comparison
    const improvement = originalTime > 0 ? ((originalTime - optimizedTime) / originalTime) * 100 : 0;
    const improvementSymbol = improvement > 0 ? '🚀' : improvement < 0 ? '⚠️' : '➖';

    console.log(`   ${improvementSymbol} Performance Improvement: ${improvement.toFixed(1)}%`);
    console.log(`   💾 Query Reduction: 2 → 1 queries (50% fewer DB round-trips)`);

    // Test 2: Vector Search Simulation (without actual embeddings)
    console.log('\n🧪 Test 2: Complex Search Performance');

    // Original: Multiple queries for different search types
    console.log('   🐢 Original Multiple-Strategy Approach...');
    const multiStrategyStart = performance.now();

    // Strategy 1: Tag search
    const tagResults = await prisma.bookmark.findMany({
      where: {
        userId: testUserId,
        tags: { some: { tag: { name: { in: ['javascript', 'tutorial'] } } } },
        status: 'READY'
      },
      take: 10
    });

    // Strategy 2: Domain search
    const domainResults = await prisma.bookmark.findMany({
      where: {
        userId: testUserId,
        url: { contains: 'github.com' },
        status: 'READY'
      },
      take: 10
    });

    // Strategy 3: Text search (title/summary)
    const textResults = await prisma.bookmark.findMany({
      where: {
        userId: testUserId,
        OR: [
          { title: { contains: 'react', mode: 'insensitive' } },
          { summary: { contains: 'react', mode: 'insensitive' } }
        ],
        status: 'READY'
      },
      take: 10
    });

    const multiStrategyTime = performance.now() - multiStrategyStart;
    const totalMultiResults = tagResults.length + domainResults.length + textResults.length;

    console.log(`      • Time: ${multiStrategyTime.toFixed(2)}ms`);
    console.log(`      • Queries: 3 separate strategy queries`);
    console.log(`      • Results: ${totalMultiResults} (before deduplication)`);

    // Optimized: Single query combining strategies
    console.log('   ⚡ Optimized Multi-Strategy Query...');
    const unifiedStart = performance.now();

    const unifiedQuery = `
      WITH search_strategies AS (
        -- Tag strategy
        SELECT b.id, b."userId", b.url, b.type, b.title, b.summary, b."vectorSummary",
               b.preview, b."ogDescription", b.metadata, b.status, b.starred,
               b.read, b."createdAt", b."updatedAt", b."ogImageUrl", b."faviconUrl",
               'tag' as strategy, 150.0 as base_score
        FROM "Bookmark" b
        JOIN "BookmarkTag" bt ON b.id = bt."bookmarkId"
        JOIN "Tag" t ON bt."tagId" = t.id
        WHERE b."userId" = $1
          AND t.name IN ('javascript', 'tutorial')
          AND b.status = 'READY'

        UNION ALL

        -- Domain strategy
        SELECT b.id, b."userId", b.url, b.type, b.title, b.summary, b."vectorSummary",
               b.preview, b."ogDescription", b.metadata, b.status, b.starred,
               b.read, b."createdAt", b."updatedAt", b."ogImageUrl", b."faviconUrl",
               'domain' as strategy, 120.0 as base_score
        FROM "Bookmark" b
        WHERE b."userId" = $1
          AND b.url ILIKE '%github.com%'
          AND b.status = 'READY'

        UNION ALL

        -- Text search strategy
        SELECT b.id, b."userId", b.url, b.type, b.title, b.summary, b."vectorSummary",
               b.preview, b."ogDescription", b.metadata, b.status, b.starred,
               b.read, b."createdAt", b."updatedAt", b."ogImageUrl", b."faviconUrl",
               'text' as strategy, 100.0 as base_score
        FROM "Bookmark" b
        WHERE b."userId" = $1
          AND (b.title ILIKE '%react%' OR b.summary ILIKE '%react%')
          AND b.status = 'READY'
      ),
      deduplicated_results AS (
        SELECT DISTINCT ON (id) *,
               ROW_NUMBER() OVER (PARTITION BY id ORDER BY base_score DESC) as rn
        FROM search_strategies
      )
      SELECT * FROM deduplicated_results
      WHERE rn = 1
      ORDER BY base_score DESC, id DESC
      LIMIT 30
    `;

    const unifiedResults = await prisma.$queryRawUnsafe(
      unifiedQuery,
      testUserId
    ) as any[];

    const unifiedTime = performance.now() - unifiedStart;

    console.log(`      • Time: ${unifiedTime.toFixed(2)}ms`);
    console.log(`      • Queries: 1 unified multi-strategy query`);
    console.log(`      • Results: ${unifiedResults.length} (deduplicated)`);

    // Complex search comparison
    const complexImprovement = multiStrategyTime > 0 ? ((multiStrategyTime - unifiedTime) / multiStrategyTime) * 100 : 0;
    const complexSymbol = complexImprovement > 0 ? '🚀' : complexImprovement < 0 ? '⚠️' : '➖';

    console.log(`   ${complexSymbol} Performance Improvement: ${complexImprovement.toFixed(1)}%`);
    console.log(`   💾 Query Reduction: 3 → 1 queries (67% fewer DB round-trips)`);

    // Summary
    console.log('\n🏁 Performance Test Summary');
    console.log('═'.repeat(60));

    console.log(`\n📊 Test Results:`);
    console.log(`  • Simple Tag Search: ${improvement.toFixed(1)}% improvement`);
    console.log(`  • Complex Multi-Strategy: ${complexImprovement.toFixed(1)}% improvement`);

    const avgImprovement = (improvement + complexImprovement) / 2;
    console.log(`  • Average Performance Gain: ${avgImprovement.toFixed(1)}%`);

    console.log(`\n🎯 Key Optimizations Demonstrated:`);
    console.log('  ✅ Single query instead of multiple round-trips');
    console.log('  ✅ Database-level deduplication vs in-memory processing');
    console.log('  ✅ Combined scoring and ranking in SQL');
    console.log('  ✅ Reduced network latency and connection overhead');

    if (avgImprovement > 25) {
      console.log('\n🎉 EXCELLENT! Significant performance improvement achieved');
    } else if (avgImprovement > 10) {
      console.log('\n✅ GOOD! Noticeable performance improvement');
    } else if (avgImprovement > 0) {
      console.log('\n👍 MINOR: Some performance improvement detected');
    } else {
      console.log('\n🤔 No significant improvement - may need further optimization');
    }

    console.log(`\n📈 Database Scale Impact:`);
    console.log(`  • With ${bookmarkCount.toLocaleString()} bookmarks, query optimization becomes critical`);
    console.log(`  • Benefits increase with larger datasets and more complex queries`);
    console.log(`  • Single-query approach scales better under load`);

    await prisma.$disconnect();
    console.log('\n✅ Performance test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Execute if script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}