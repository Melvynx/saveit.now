#!/usr/bin/env tsx

/**
 * Database Query Monitoring Script
 *
 * This script monitors and analyzes database queries executed during search operations
 * to verify that the optimized search actually reduces the number of database calls.
 */

import { prisma } from '@workspace/database';
import { optimizedSearch } from '../src/lib/search/optimized-search';
import { advancedSearch } from '../src/lib/search/advanced-search';
import type { SearchOptions } from '../src/lib/search/search-helpers';

interface QueryLog {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any[];
}

interface SearchAnalysis {
  searchType: 'optimized' | 'original';
  totalTime: number;
  queryCount: number;
  queries: QueryLog[];
  resultCount: number;
  success: boolean;
  error?: string;
}

class DatabaseQueryMonitor {
  private queryLogs: QueryLog[] = [];
  private isMonitoring = false;

  startMonitoring() {
    this.queryLogs = [];
    this.isMonitoring = true;

    // Monkey patch Prisma's query methods to log all database calls
    const originalQueryRaw = prisma.$queryRaw;
    const originalQueryRawUnsafe = prisma.$queryRawUnsafe;
    const originalExecuteRaw = prisma.$executeRaw;
    const originalExecuteRawUnsafe = prisma.$executeRawUnsafe;

    prisma.$queryRaw = this.wrapQuery(originalQueryRaw.bind(prisma), '$queryRaw');
    prisma.$queryRawUnsafe = this.wrapQuery(originalQueryRawUnsafe.bind(prisma), '$queryRawUnsafe');
    prisma.$executeRaw = this.wrapQuery(originalExecuteRaw.bind(prisma), '$executeRaw');
    prisma.$executeRawUnsafe = this.wrapQuery(originalExecuteRawUnsafe.bind(prisma), '$executeRawUnsafe');

    // Also monitor Prisma Client queries (findMany, findFirst, etc.)
    this.patchPrismaClient();
  }

  private wrapQuery(originalMethod: Function, methodName: string) {
    return async (...args: any[]) => {
      if (!this.isMonitoring) return originalMethod(...args);

      const startTime = performance.now();

      try {
        const result = await originalMethod(...args);
        const endTime = performance.now();

        this.queryLogs.push({
          query: `${methodName}(${args[0]?.toString?.() || 'unknown'})`,
          duration: endTime - startTime,
          timestamp: new Date(),
          params: args.slice(1)
        });

        return result;
      } catch (error) {
        const endTime = performance.now();

        this.queryLogs.push({
          query: `${methodName}(${args[0]?.toString?.() || 'unknown'}) [ERROR]`,
          duration: endTime - startTime,
          timestamp: new Date(),
          params: args.slice(1)
        });

        throw error;
      }
    };
  }

  private patchPrismaClient() {
    // Patch common Prisma operations
    const operations = ['findMany', 'findFirst', 'findUnique', 'count', 'groupBy'];
    const models = ['bookmark', 'tag', 'bookmarkTag', 'bookmarkOpen', 'user'];

    models.forEach(modelName => {
      const model = (prisma as any)[modelName];
      if (!model) return;

      operations.forEach(operation => {
        if (typeof model[operation] === 'function') {
          const originalMethod = model[operation];
          model[operation] = this.wrapPrismaOperation(originalMethod.bind(model), `${modelName}.${operation}`);
        }
      });
    });
  }

  private wrapPrismaOperation(originalMethod: Function, operationName: string) {
    return async (...args: any[]) => {
      if (!this.isMonitoring) return originalMethod(...args);

      const startTime = performance.now();

      try {
        const result = await originalMethod(...args);
        const endTime = performance.now();

        this.queryLogs.push({
          query: `${operationName}(${JSON.stringify(args[0] || {}).substring(0, 100)}...)`,
          duration: endTime - startTime,
          timestamp: new Date()
        });

        return result;
      } catch (error) {
        const endTime = performance.now();

        this.queryLogs.push({
          query: `${operationName}(...) [ERROR]`,
          duration: endTime - startTime,
          timestamp: new Date()
        });

        throw error;
      }
    };
  }

  stopMonitoring(): QueryLog[] {
    this.isMonitoring = false;
    return [...this.queryLogs];
  }

  reset() {
    this.queryLogs = [];
  }
}

const monitor = new DatabaseQueryMonitor();

async function analyzeSearch(
  searchFn: (options: SearchOptions) => Promise<any>,
  searchType: 'optimized' | 'original',
  options: SearchOptions
): Promise<SearchAnalysis> {
  monitor.reset();
  monitor.startMonitoring();

  const startTime = performance.now();
  let success = true;
  let error: string | undefined;
  let resultCount = 0;

  try {
    const result = await searchFn(options);
    resultCount = result?.bookmarks?.length || 0;
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : String(err);
  }

  const totalTime = performance.now() - startTime;
  const queries = monitor.stopMonitoring();

  return {
    searchType,
    totalTime,
    queryCount: queries.length,
    queries,
    resultCount,
    success,
    error
  };
}

function printQueryAnalysis(analysis: SearchAnalysis) {
  const { searchType, totalTime, queryCount, queries, resultCount, success, error } = analysis;

  console.log(`\n📊 === ${searchType.toUpperCase()} SEARCH ANALYSIS ===`);
  console.log(`Status: ${success ? '✅ Success' : '❌ Failed'}`);
  console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
  console.log(`Query Count: ${queryCount}`);
  console.log(`Result Count: ${resultCount}`);

  if (error) {
    console.log(`Error: ${error}`);
  }

  if (queries.length > 0) {
    console.log(`\n🔍 Database Queries:`);
    queries.forEach((query, index) => {
      const truncatedQuery = query.query.length > 80
        ? query.query.substring(0, 80) + '...'
        : query.query;
      console.log(`  ${index + 1}. [${query.duration.toFixed(2)}ms] ${truncatedQuery}`);
    });

    const totalQueryTime = queries.reduce((sum, q) => sum + q.duration, 0);
    console.log(`\n📈 Query Statistics:`);
    console.log(`  • Total Query Time: ${totalQueryTime.toFixed(2)}ms`);
    console.log(`  • Average Query Time: ${(totalQueryTime / queries.length).toFixed(2)}ms`);
    console.log(`  • Network/Processing Overhead: ${(totalTime - totalQueryTime).toFixed(2)}ms`);
  }
}

function compareAnalyses(optimized: SearchAnalysis, original: SearchAnalysis) {
  console.log(`\n⚖️  === COMPARISON SUMMARY ===`);

  // Query count comparison
  const queryReduction = original.queryCount - optimized.queryCount;
  const queryReductionPercent = original.queryCount > 0
    ? (queryReduction / original.queryCount) * 100
    : 0;

  console.log(`\n🔢 Query Count:`);
  console.log(`  • Optimized: ${optimized.queryCount} queries`);
  console.log(`  • Original: ${original.queryCount} queries`);
  console.log(`  • Reduction: ${queryReduction} queries (${queryReductionPercent.toFixed(1)}%)`);

  // Performance comparison
  const timeImprovement = original.totalTime - optimized.totalTime;
  const timeImprovementPercent = original.totalTime > 0
    ? (timeImprovement / original.totalTime) * 100
    : 0;

  console.log(`\n⏱️  Performance:`);
  console.log(`  • Optimized: ${optimized.totalTime.toFixed(2)}ms`);
  console.log(`  • Original: ${original.totalTime.toFixed(2)}ms`);
  console.log(`  • Improvement: ${timeImprovement.toFixed(2)}ms (${timeImprovementPercent.toFixed(1)}%)`);

  // Success rate
  console.log(`\n✅ Success Rate:`);
  console.log(`  • Optimized: ${optimized.success ? 'Success' : 'Failed'}`);
  console.log(`  • Original: ${original.success ? 'Success' : 'Failed'}`);

  // Results consistency
  if (optimized.success && original.success) {
    console.log(`\n📊 Result Consistency:`);
    console.log(`  • Optimized Results: ${optimized.resultCount}`);
    console.log(`  • Original Results: ${original.resultCount}`);
    console.log(`  • Difference: ${Math.abs(optimized.resultCount - original.resultCount)}`);
  }

  // Performance verdict
  console.log(`\n🏆 Performance Verdict:`);
  if (queryReduction > 0) {
    console.log(`  ✅ Query count reduced by ${queryReduction} (${queryReductionPercent.toFixed(1)}%)`);
  } else if (queryReduction < 0) {
    console.log(`  ⚠️  Query count increased by ${Math.abs(queryReduction)} (${Math.abs(queryReductionPercent).toFixed(1)}%)`);
  } else {
    console.log(`  ➖ Query count unchanged`);
  }

  if (timeImprovementPercent > 5) {
    console.log(`  🚀 Significant performance improvement: ${timeImprovementPercent.toFixed(1)}%`);
  } else if (timeImprovementPercent > 0) {
    console.log(`  ✅ Minor performance improvement: ${timeImprovementPercent.toFixed(1)}%`);
  } else if (timeImprovementPercent < -5) {
    console.log(`  ⚠️  Performance regression: ${Math.abs(timeImprovementPercent).toFixed(1)}%`);
  } else {
    console.log(`  ➖ Performance unchanged`);
  }
}

const TEST_SCENARIOS: { name: string; options: SearchOptions }[] = [
  {
    name: 'Simple Tag Search',
    options: { userId: 'test-user', tags: ['programming'], limit: 20 }
  },
  {
    name: 'Vector Search',
    options: { userId: 'test-user', query: 'javascript tutorial', limit: 20 }
  },
  {
    name: 'Domain Search',
    options: { userId: 'test-user', query: 'github.com', limit: 20 }
  },
  {
    name: 'Complex Combined Search',
    options: {
      userId: 'test-user',
      query: 'react hooks',
      tags: ['programming', 'react'],
      types: ['ARTICLE', 'BLOG'],
      specialFilters: ['UNREAD'],
      limit: 30
    }
  }
];

async function main() {
  console.log('🔍 Starting Database Query Monitoring\n');

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Get a real user ID for testing
  const firstUser = await prisma.user.findFirst();
  if (!firstUser) {
    console.error('❌ No users found in database');
    process.exit(1);
  }

  const testUserId = firstUser.id;
  console.log(`✅ Using test user: ${testUserId}\n`);

  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n🧪 Testing Scenario: ${scenario.name}`);
    console.log(`Options: ${JSON.stringify({ ...scenario.options, userId: testUserId }, null, 2)}`);

    const testOptions = { ...scenario.options, userId: testUserId };

    // Test optimized search
    const optimizedAnalysis = await analyzeSearch(
      optimizedSearch,
      'optimized',
      testOptions
    );

    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test original search
    const originalAnalysis = await analyzeSearch(
      advancedSearch,
      'original',
      testOptions
    );

    // Print individual analyses
    printQueryAnalysis(optimizedAnalysis);
    printQueryAnalysis(originalAnalysis);

    // Compare the two
    compareAnalyses(optimizedAnalysis, originalAnalysis);

    console.log('\n' + '='.repeat(80));
  }

  await prisma.$disconnect();
  console.log('\n✅ Database query monitoring completed!');
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Monitoring failed:', error);
    process.exit(1);
  });
}

export { main as runQueryMonitoring };