#!/usr/bin/env tsx

/**
 * Performance Tests with Neon Database
 * Tests la recherche optimisée avec de vraies données de production
 */

import { config } from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment (override DATABASE_URL)
config({ path: join(__dirname, '..', '.env') });
config({ path: join(__dirname, '..', '.env.test'), override: true });

async function main() {
  console.log('🚀 Search Performance Test with Neon Database\n');

  // Verify environment
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('🔗 Database:', process.env.DATABASE_URL.split('@')[1]?.split('/')[0]);

  try {
    // Import Prisma client
    const { prisma } = await import('@workspace/database');

    // Test database connection
    console.log('\n📡 Testing database connection...');
    const testConnection = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful:', testConnection);

    // Get basic stats
    console.log('\n📊 Database Statistics:');
    const userCount = await prisma.user.count();
    const bookmarkCount = await prisma.bookmark.count();
    const tagCount = await prisma.tag.count();

    console.log(`  • Users: ${userCount.toLocaleString()}`);
    console.log(`  • Bookmarks: ${bookmarkCount.toLocaleString()}`);
    console.log(`  • Tags: ${tagCount.toLocaleString()}`);

    if (bookmarkCount === 0) {
      console.log('⚠️  No bookmarks found - tests may not be meaningful');
      return;
    }

    // Get a real user for testing
    const testUser = await prisma.user.findFirst({
      include: {
        _count: {
          select: {
            bookmarks: true
          }
        }
      }
    });

    if (!testUser) {
      console.log('❌ No users found in database');
      return;
    }

    console.log(`\n👤 Test User: ${testUser.id}`);
    console.log(`  • Bookmarks: ${testUser._count.bookmarks}`);

    if (testUser._count.bookmarks < 10) {
      console.log('⚠️  User has few bookmarks - tests may not be representative');
    }

    // Import search functions
    console.log('\n🔍 Loading search functions...');
    const { optimizedSearch } = await import('../src/lib/search/optimized-search');
    const { advancedSearch } = await import('../src/lib/search/advanced-search');

    console.log('✅ Search functions loaded');

    // Test scenarios
    const testScenarios = [
      {
        name: 'Tag Search',
        params: {
          userId: testUser.id,
          tags: ['programming'],
          limit: 20
        }
      },
      {
        name: 'Text/Vector Search',
        params: {
          userId: testUser.id,
          query: 'javascript tutorial',
          limit: 20
        }
      },
      {
        name: 'Domain Search',
        params: {
          userId: testUser.id,
          query: 'github.com',
          limit: 20
        }
      },
      {
        name: 'Combined Search',
        params: {
          userId: testUser.id,
          query: 'react hooks',
          tags: ['programming'],
          limit: 20
        }
      }
    ];

    console.log('\n🧪 Running Performance Tests...\n');

    let totalOptimizedTime = 0;
    let totalOriginalTime = 0;
    let testCount = 0;

    for (const scenario of testScenarios) {
      console.log(`📋 Test: ${scenario.name}`);
      console.log(`   Params: ${JSON.stringify(scenario.params, null, 2).replace(/\n/g, ' ')}`);

      try {
        // Test optimized search
        console.log('   ⚡ Optimized Search...');
        const optimizedStart = performance.now();
        const optimizedResult = await optimizedSearch(scenario.params);
        const optimizedTime = performance.now() - optimizedStart;

        console.log(`      • Time: ${optimizedTime.toFixed(2)}ms`);
        console.log(`      • Results: ${optimizedResult?.bookmarks?.length || 0}`);
        console.log(`      • Cache: ${optimizedResult?.fromCache ? 'HIT' : 'MISS'}`);

        // Brief pause
        await new Promise(resolve => setTimeout(resolve, 200));

        // Test original search
        console.log('   🐢 Original Search...');
        const originalStart = performance.now();
        const originalResult = await advancedSearch(scenario.params);
        const originalTime = performance.now() - originalStart;

        console.log(`      • Time: ${originalTime.toFixed(2)}ms`);
        console.log(`      • Results: ${originalResult?.bookmarks?.length || 0}`);
        console.log(`      • Cache: ${originalResult?.fromCache ? 'HIT' : 'MISS'}`);

        // Calculate improvement
        const improvement = originalTime > 0 ? ((originalTime - optimizedTime) / originalTime) * 100 : 0;
        const improvementSymbol = improvement > 0 ? '🚀' : improvement < 0 ? '⚠️' : '➖';

        console.log(`   ${improvementSymbol} Performance: ${improvement.toFixed(1)}% improvement`);

        // Check result consistency
        const optimizedCount = optimizedResult?.bookmarks?.length || 0;
        const originalCount = originalResult?.bookmarks?.length || 0;
        const resultDiff = Math.abs(optimizedCount - originalCount);

        if (resultDiff <= 2) {
          console.log('   ✅ Results consistent');
        } else {
          console.log(`   ⚠️  Results differ by ${resultDiff} bookmarks`);
        }

        totalOptimizedTime += optimizedTime;
        totalOriginalTime += originalTime;
        testCount++;

      } catch (error) {
        console.log(`   ❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      console.log(); // Empty line between tests
    }

    // Summary
    console.log('🏁 Performance Test Summary');
    console.log('═'.repeat(50));

    if (testCount > 0) {
      const avgOptimized = totalOptimizedTime / testCount;
      const avgOriginal = totalOriginalTime / testCount;
      const overallImprovement = avgOriginal > 0 ? ((avgOriginal - avgOptimized) / avgOriginal) * 100 : 0;

      console.log(`📊 Average Performance:`);
      console.log(`  • Optimized Search: ${avgOptimized.toFixed(2)}ms`);
      console.log(`  • Original Search: ${avgOriginal.toFixed(2)}ms`);
      console.log(`  • Overall Improvement: ${overallImprovement.toFixed(1)}%`);

      console.log(`\n📈 Total Times:`);
      console.log(`  • Optimized Total: ${totalOptimizedTime.toFixed(2)}ms`);
      console.log(`  • Original Total: ${totalOriginalTime.toFixed(2)}ms`);
      console.log(`  • Time Saved: ${(totalOriginalTime - totalOptimizedTime).toFixed(2)}ms`);

      // Verdict
      console.log(`\n🎯 Performance Verdict:`);
      if (overallImprovement > 30) {
        console.log('🎉 Excellent! Optimized search shows significant improvement');
      } else if (overallImprovement > 15) {
        console.log('✅ Good! Noticeable performance improvement');
      } else if (overallImprovement > 0) {
        console.log('👍 Minor improvement detected');
      } else if (overallImprovement < -10) {
        console.log('❌ Performance regression - needs investigation');
      } else {
        console.log('➖ No significant performance difference');
      }
    }

    await prisma.$disconnect();
    console.log('\n✅ Tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);

    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        console.log('\n💡 Database connection issue. Check:');
        console.log('  1. DATABASE_URL in .env.test');
        console.log('  2. Network connectivity');
        console.log('  3. Neon database status');
      } else if (error.message.includes('@workspace/database')) {
        console.log('\n💡 Workspace dependency issue. Try:');
        console.log('  pnpm install && pnpm --filter @workspace/database db:generate');
      }
    }

    process.exit(1);
  }
}

// Execute if script is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}