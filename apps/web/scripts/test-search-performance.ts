#!/usr/bin/env tsx

/**
 * Performance Testing Script for Optimized Search
 *
 * This script compares the performance between the original advanced search
 * and the new optimized search implementation.
 */

import { prisma } from '@workspace/database';
import { optimizedSearch } from '../src/lib/search/optimized-search';
import { advancedSearch } from '../src/lib/search/advanced-search';
import type { SearchOptions } from '../src/lib/search/search-helpers';

interface PerformanceResult {
  name: string;
  queryTime: number;
  resultCount: number;
  memoryUsage: number;
  success: boolean;
  error?: string;
}

interface BenchmarkSuite {
  name: string;
  tests: SearchOptions[];
}

// Test user ID - vous devrez peut-être ajuster cela
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-id';

const BENCHMARK_SUITES: BenchmarkSuite[] = [
  {
    name: 'Tag Search',
    tests: [
      { userId: TEST_USER_ID, tags: ['programming'], limit: 20 },
      { userId: TEST_USER_ID, tags: ['javascript', 'tutorial'], limit: 20 },
      { userId: TEST_USER_ID, tags: ['react', 'nextjs', 'typescript'], limit: 20 },
    ]
  },
  {
    name: 'Vector Search',
    tests: [
      { userId: TEST_USER_ID, query: 'javascript tutorial', limit: 20 },
      { userId: TEST_USER_ID, query: 'react hooks guide', limit: 20 },
      { userId: TEST_USER_ID, query: 'database optimization techniques', limit: 20 },
    ]
  },
  {
    name: 'Domain Search',
    tests: [
      { userId: TEST_USER_ID, query: 'github.com', limit: 20 },
      { userId: TEST_USER_ID, query: 'stackoverflow.com', limit: 20 },
      { userId: TEST_USER_ID, query: 'medium.com', limit: 20 },
    ]
  },
  {
    name: 'Combined Search',
    tests: [
      {
        userId: TEST_USER_ID,
        query: 'react tutorial',
        tags: ['programming'],
        limit: 20
      },
      {
        userId: TEST_USER_ID,
        query: 'database optimization',
        tags: ['performance', 'database'],
        limit: 20
      },
      {
        userId: TEST_USER_ID,
        query: 'nextjs guide',
        tags: ['react', 'javascript'],
        types: ['ARTICLE', 'BLOG'],
        limit: 20
      },
    ]
  },
  {
    name: 'Complex Queries',
    tests: [
      {
        userId: TEST_USER_ID,
        query: 'machine learning algorithms',
        tags: ['ai', 'python', 'data-science'],
        specialFilters: ['UNREAD'],
        limit: 50
      },
      {
        userId: TEST_USER_ID,
        query: 'web development best practices',
        tags: ['frontend', 'backend'],
        types: ['ARTICLE', 'BLOG', 'YOUTUBE'],
        specialFilters: ['STAR'],
        limit: 30
      },
    ]
  }
];

async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<PerformanceResult> {
  const memBefore = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  try {
    const result = await fn();
    const endTime = performance.now();
    const memAfter = process.memoryUsage().heapUsed;

    return {
      name,
      queryTime: endTime - startTime,
      resultCount: Array.isArray(result) ? result.length : (result as any)?.bookmarks?.length || 0,
      memoryUsage: memAfter - memBefore,
      success: true
    };
  } catch (error) {
    const endTime = performance.now();
    const memAfter = process.memoryUsage().heapUsed;

    return {
      name,
      queryTime: endTime - startTime,
      resultCount: 0,
      memoryUsage: memAfter - memBefore,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function runBenchmarkTest(searchOptions: SearchOptions): Promise<{
  optimized: PerformanceResult;
  original: PerformanceResult;
}> {
  console.log(`\n🔍 Testing: ${JSON.stringify(searchOptions, null, 2)}`);

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Test optimized search
  const optimized = await measurePerformance(
    'Optimized Search',
    () => optimizedSearch(searchOptions)
  );

  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 100));

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Test original search
  const original = await measurePerformance(
    'Original Search',
    () => advancedSearch(searchOptions)
  );

  return { optimized, original };
}

function calculateStats(results: PerformanceResult[]): {
  avg: number;
  min: number;
  max: number;
  median: number;
} {
  const times = results.filter(r => r.success).map(r => r.queryTime);
  if (times.length === 0) {
    return { avg: 0, min: 0, max: 0, median: 0 };
  }

  times.sort((a, b) => a - b);

  return {
    avg: times.reduce((sum, time) => sum + time, 0) / times.length,
    min: times[0],
    max: times[times.length - 1],
    median: times[Math.floor(times.length / 2)]
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function printResults(
  suiteName: string,
  optimizedResults: PerformanceResult[],
  originalResults: PerformanceResult[]
) {
  console.log(`\n📊 === ${suiteName} Results ===`);

  const optimizedStats = calculateStats(optimizedResults);
  const originalStats = calculateStats(originalResults);

  const optimizedSuccess = optimizedResults.filter(r => r.success).length;
  const originalSuccess = originalResults.filter(r => r.success).length;

  console.log(`\n⚡ Performance Comparison:`);
  console.log(`Optimized Search:`);
  console.log(`  • Success Rate: ${optimizedSuccess}/${optimizedResults.length} (${(optimizedSuccess/optimizedResults.length*100).toFixed(1)}%)`);
  console.log(`  • Avg Time: ${optimizedStats.avg.toFixed(2)}ms`);
  console.log(`  • Min Time: ${optimizedStats.min.toFixed(2)}ms`);
  console.log(`  • Max Time: ${optimizedStats.max.toFixed(2)}ms`);
  console.log(`  • Median Time: ${optimizedStats.median.toFixed(2)}ms`);

  console.log(`\nOriginal Search:`);
  console.log(`  • Success Rate: ${originalSuccess}/${originalResults.length} (${(originalSuccess/originalResults.length*100).toFixed(1)}%)`);
  console.log(`  • Avg Time: ${originalStats.avg.toFixed(2)}ms`);
  console.log(`  • Min Time: ${originalStats.min.toFixed(2)}ms`);
  console.log(`  • Max Time: ${originalStats.max.toFixed(2)}ms`);
  console.log(`  • Median Time: ${originalStats.median.toFixed(2)}ms`);

  if (originalStats.avg > 0) {
    const improvement = ((originalStats.avg - optimizedStats.avg) / originalStats.avg) * 100;
    const symbol = improvement > 0 ? '🚀' : '⚠️';
    console.log(`\n${symbol} Performance Improvement: ${improvement.toFixed(1)}%`);
  }

  // Memory usage comparison
  const optimizedMemory = optimizedResults.reduce((sum, r) => sum + r.memoryUsage, 0);
  const originalMemory = originalResults.reduce((sum, r) => sum + r.memoryUsage, 0);

  console.log(`\n💾 Memory Usage:`);
  console.log(`  • Optimized: ${formatBytes(optimizedMemory)}`);
  console.log(`  • Original: ${formatBytes(originalMemory)}`);

  if (originalMemory !== 0) {
    const memoryImprovement = ((originalMemory - optimizedMemory) / Math.abs(originalMemory)) * 100;
    const memorySymbol = memoryImprovement > 0 ? '💚' : '🔴';
    console.log(`  ${memorySymbol} Memory Improvement: ${memoryImprovement.toFixed(1)}%`);
  }

  // Error reporting
  const optimizedErrors = optimizedResults.filter(r => !r.success);
  const originalErrors = originalResults.filter(r => !r.success);

  if (optimizedErrors.length > 0) {
    console.log(`\n❌ Optimized Search Errors:`);
    optimizedErrors.forEach(error => {
      console.log(`  • ${error.error}`);
    });
  }

  if (originalErrors.length > 0) {
    console.log(`\n❌ Original Search Errors:`);
    originalErrors.forEach(error => {
      console.log(`  • ${error.error}`);
    });
  }
}

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function checkTestUser(): Promise<boolean> {
  try {
    const user = await prisma.user.findFirst({
      where: { id: TEST_USER_ID }
    });

    if (!user) {
      console.log(`⚠️  Test user ${TEST_USER_ID} not found. Using first available user...`);

      const firstUser = await prisma.user.findFirst();
      if (firstUser) {
        process.env.TEST_USER_ID = firstUser.id;
        console.log(`✅ Using user: ${firstUser.id}`);
        return true;
      } else {
        console.error('❌ No users found in database');
        return false;
      }
    }

    console.log(`✅ Test user found: ${user.id}`);
    return true;
  } catch (error) {
    console.error('❌ Error checking test user:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Search Performance Benchmark\n');

  // Pre-flight checks
  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    process.exit(1);
  }

  const userExists = await checkTestUser();
  if (!userExists) {
    process.exit(1);
  }

  const actualUserId = process.env.TEST_USER_ID || TEST_USER_ID;

  console.log('\n📋 Benchmark Configuration:');
  console.log(`  • Test User ID: ${actualUserId}`);
  console.log(`  • Test Suites: ${BENCHMARK_SUITES.length}`);
  console.log(`  • Total Tests: ${BENCHMARK_SUITES.reduce((sum, suite) => sum + suite.tests.length, 0)}`);

  const allOptimizedResults: PerformanceResult[] = [];
  const allOriginalResults: PerformanceResult[] = [];

  for (const suite of BENCHMARK_SUITES) {
    console.log(`\n🧪 Running ${suite.name} benchmark...`);

    const optimizedResults: PerformanceResult[] = [];
    const originalResults: PerformanceResult[] = [];

    for (const searchOptions of suite.tests) {
      // Update user ID in case it was changed
      const testOptions = { ...searchOptions, userId: actualUserId };

      const { optimized, original } = await runBenchmarkTest(testOptions);

      optimizedResults.push(optimized);
      originalResults.push(original);

      console.log(`  ⚡ ${optimized.name}: ${optimized.queryTime.toFixed(2)}ms (${optimized.success ? '✅' : '❌'})`);
      console.log(`  🐢 ${original.name}: ${original.queryTime.toFixed(2)}ms (${original.success ? '✅' : '❌'})`);

      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    allOptimizedResults.push(...optimizedResults);
    allOriginalResults.push(...originalResults);

    printResults(suite.name, optimizedResults, originalResults);
  }

  // Overall summary
  console.log('\n🏁 === OVERALL PERFORMANCE SUMMARY ===');
  printResults('All Tests', allOptimizedResults, allOriginalResults);

  // Database query count analysis
  console.log('\n📈 === QUERY ANALYSIS ===');
  console.log('The optimized search should show:');
  console.log('  • Reduced total query time');
  console.log('  • Lower memory usage');
  console.log('  • Single database query vs multiple queries');
  console.log('  • Consistent performance across different query types');

  await prisma.$disconnect();
  console.log('\n✅ Benchmark completed successfully!');
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  });
}

export { main as runPerformanceBenchmark };