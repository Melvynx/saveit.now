#!/usr/bin/env tsx

/**
 * Simple Search Performance Test
 * Test basique pour valider que la recherche optimisée fonctionne
 */

import { prisma } from '@workspace/database';

async function testDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function testSearchImports() {
  try {
    const { optimizedSearch } = await import('../src/lib/search/optimized-search');
    const { advancedSearch } = await import('../src/lib/search/advanced-search');

    console.log('✅ Search modules imported successfully');
    console.log('  • optimizedSearch:', typeof optimizedSearch);
    console.log('  • advancedSearch:', typeof advancedSearch);

    return { optimizedSearch, advancedSearch };
  } catch (error) {
    console.error('❌ Failed to import search modules:', error);
    return null;
  }
}

async function getTestUser() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ No users found in database');
      return null;
    }
    console.log(`✅ Test user found: ${user.id}`);
    return user.id;
  } catch (error) {
    console.error('❌ Error fetching test user:', error);
    return null;
  }
}

async function simplePerformanceTest(optimizedSearch: any, advancedSearch: any, userId: string) {
  const testParams = {
    userId,
    tags: ['programming'],
    limit: 10
  };

  console.log('\n🧪 Running simple performance test...');
  console.log('Test params:', testParams);

  try {
    // Test optimized search
    console.log('\n⚡ Testing Optimized Search...');
    const optimizedStart = performance.now();
    const optimizedResult = await optimizedSearch(testParams);
    const optimizedTime = performance.now() - optimizedStart;

    console.log(`  • Time: ${optimizedTime.toFixed(2)}ms`);
    console.log(`  • Results: ${optimizedResult?.bookmarks?.length || 0}`);
    console.log(`  • Success: ${optimizedResult ? '✅' : '❌'}`);

    // Brief pause
    await new Promise(resolve => setTimeout(resolve, 100));

    // Test original search
    console.log('\n🐢 Testing Original Search...');
    const originalStart = performance.now();
    const originalResult = await advancedSearch(testParams);
    const originalTime = performance.now() - originalStart;

    console.log(`  • Time: ${originalTime.toFixed(2)}ms`);
    console.log(`  • Results: ${originalResult?.bookmarks?.length || 0}`);
    console.log(`  • Success: ${originalResult ? '✅' : '❌'}`);

    // Compare results
    console.log('\n📊 Performance Comparison:');
    if (originalTime > 0) {
      const improvement = ((originalTime - optimizedTime) / originalTime) * 100;
      console.log(`  • Optimized: ${optimizedTime.toFixed(2)}ms`);
      console.log(`  • Original: ${originalTime.toFixed(2)}ms`);
      console.log(`  • Improvement: ${improvement.toFixed(1)}%`);

      if (improvement > 0) {
        console.log('  🚀 Performance improved!');
      } else {
        console.log('  ⚠️  No performance improvement detected');
      }
    }

    // Check result consistency
    const optimizedCount = optimizedResult?.bookmarks?.length || 0;
    const originalCount = originalResult?.bookmarks?.length || 0;

    console.log('\n🔍 Result Consistency:');
    console.log(`  • Optimized results: ${optimizedCount}`);
    console.log(`  • Original results: ${originalCount}`);
    console.log(`  • Difference: ${Math.abs(optimizedCount - originalCount)}`);

    if (Math.abs(optimizedCount - originalCount) <= 1) {
      console.log('  ✅ Results are consistent');
    } else {
      console.log('  ⚠️  Results differ significantly');
    }

    return {
      optimized: { time: optimizedTime, count: optimizedCount },
      original: { time: originalTime, count: originalCount }
    };

  } catch (error) {
    console.error('❌ Performance test failed:', error);
    return null;
  }
}

async function main() {
  console.log('🚀 Simple Search Performance Test\n');

  // Step 1: Test database connection
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    process.exit(1);
  }

  // Step 2: Test search imports
  const searchModules = await testSearchImports();
  if (!searchModules) {
    process.exit(1);
  }

  // Step 3: Get test user
  const userId = await getTestUser();
  if (!userId) {
    process.exit(1);
  }

  // Step 4: Run performance test
  const results = await simplePerformanceTest(
    searchModules.optimizedSearch,
    searchModules.advancedSearch,
    userId
  );

  if (results) {
    console.log('\n🏁 Test Summary:');
    console.log('✅ All tests completed successfully');

    if (results.optimized.time < results.original.time) {
      console.log('🎉 Optimized search is faster!');
    } else {
      console.log('🤔 Optimized search may need further optimization');
    }
  } else {
    console.log('\n❌ Tests failed');
    process.exit(1);
  }

  await prisma.$disconnect();
  console.log('\n✅ Test completed successfully!');
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

export { main as runSimpleSearchTest };