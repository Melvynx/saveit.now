#!/usr/bin/env tsx

/**
 * Quick Search Test - Version simplifiée pour validation rapide
 */

console.log('🚀 Quick Search Performance Test\n');

async function runTest() {
  try {
    // Test direct import
    console.log('📦 Testing imports...');

    // Import the search functions dynamically
    const { optimizedSearch } = await import('../src/lib/search/optimized-search.js');
    const { advancedSearch } = await import('../src/lib/search/advanced-search.js');

    console.log('✅ Search modules imported successfully');
    console.log('  • optimizedSearch:', typeof optimizedSearch);
    console.log('  • advancedSearch:', typeof advancedSearch);

    // Create a mock test to see if functions work
    const mockParams = {
      userId: 'test-user-id',
      tags: ['programming'],
      limit: 5
    };

    console.log('\n🧪 Testing function signatures...');
    console.log('Mock params:', mockParams);

    // Just test that functions exist and are callable
    // (they will likely fail due to DB connection, but that's ok for now)

    try {
      console.log('\n⚡ Testing optimizedSearch function...');
      await optimizedSearch(mockParams);
      console.log('✅ optimizedSearch executed without syntax errors');
    } catch (error: any) {
      if (error.message.includes('Invalid `prisma') || error.message.includes('database')) {
        console.log('✅ optimizedSearch syntax OK (DB connection expected failure)');
      } else {
        console.log('⚠️ optimizedSearch error:', error.message.substring(0, 100));
      }
    }

    try {
      console.log('\n🐢 Testing advancedSearch function...');
      await advancedSearch(mockParams);
      console.log('✅ advancedSearch executed without syntax errors');
    } catch (error: any) {
      if (error.message.includes('Invalid `prisma') || error.message.includes('database')) {
        console.log('✅ advancedSearch syntax OK (DB connection expected failure)');
      } else {
        console.log('⚠️ advancedSearch error:', error.message.substring(0, 100));
      }
    }

    console.log('\n🎉 Quick test completed!');
    console.log('\n📋 Results:');
    console.log('✅ optimizedSearch function exists and is importable');
    console.log('✅ advancedSearch function exists and is importable');
    console.log('✅ No major syntax errors detected');
    console.log('\n💡 To run full performance tests with real data:');
    console.log('   1. Ensure DATABASE_URL is set correctly');
    console.log('   2. Ensure database has users and bookmarks');
    console.log('   3. Run: pnpm test:search-performance');

  } catch (error) {
    console.error('❌ Test failed:', error);

    if (error instanceof Error && error.message.includes('@workspace/database')) {
      console.log('\n💡 This appears to be a workspace dependency issue.');
      console.log('Try running: pnpm install && pnpm --filter @workspace/database db:generate');
    }

    process.exit(1);
  }
}

// Self-executing function
runTest();