import { prisma } from '../src/client';
import { performance } from 'perf_hooks';

async function testSearchPerformance() {
  console.log('🚀 Testing search performance with new indexes...\n');

  try {
    // Get a test user with bookmarks
    const testUser = await prisma.user.findFirst({
      include: {
        _count: {
          select: { bookmarks: true }
        }
      }
    });

    if (!testUser) {
      console.log('❌ No users found. Cannot run performance tests.');
      return;
    }

    console.log(`📊 Testing with user: ${testUser.email} (${testUser._count.bookmarks} bookmarks)\n`);

    // Test 1: Default browsing query (most common pattern)
    console.log('🔍 Test 1: Default browsing query');
    const start1 = performance.now();
    const defaultBrowsing = await prisma.bookmark.findMany({
      where: {
        userId: testUser.id,
        status: 'COMPLETE'
      },
      select: {
        id: true,
        title: true,
        url: true,
        type: true,
        starred: true,
        read: true,
        createdAt: true,
        faviconUrl: true,
        ogImageUrl: true,
        preview: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { id: 'desc' },
      take: 20
    });
    const end1 = performance.now();
    console.log(`   ✅ Completed in ${(end1 - start1).toFixed(2)}ms (${defaultBrowsing.length} results)`);

    // Test 2: Filtered query with multiple conditions
    console.log('🔍 Test 2: Filtered query (starred articles)');
    const start2 = performance.now();
    const filteredResults = await prisma.bookmark.findMany({
      where: {
        userId: testUser.id,
        type: 'ARTICLE',
        starred: true,
        status: 'COMPLETE'
      },
      select: {
        id: true,
        title: true,
        url: true,
        type: true,
        starred: true,
        read: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    const end2 = performance.now();
    console.log(`   ✅ Completed in ${(end2 - start2).toFixed(2)}ms (${filteredResults.length} results)`);

    // Test 3: Unread filter query
    console.log('🔍 Test 3: Unread filter query');
    const start3 = performance.now();
    const unreadResults = await prisma.bookmark.findMany({
      where: {
        userId: testUser.id,
        read: false,
        status: 'COMPLETE'
      },
      select: {
        id: true,
        title: true,
        url: true,
        type: true,
        read: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    const end3 = performance.now();
    console.log(`   ✅ Completed in ${(end3 - start3).toFixed(2)}ms (${unreadResults.length} results)`);

    // Test 4: Vector similarity search (if embeddings exist)
    console.log('🔍 Test 4: Vector similarity search');
    const bookmarkWithEmbedding = await prisma.bookmark.findFirst({
      where: {
        userId: testUser.id,
        titleEmbedding: { not: null }
      },
      select: {
        titleEmbedding: true,
        vectorSummaryEmbedding: true
      }
    });

    if (bookmarkWithEmbedding?.titleEmbedding) {
      const start4 = performance.now();
      const vectorResults = await prisma.$queryRawUnsafe(`
        SELECT id, title, url, type,
               LEAST(
                 titleEmbedding <=> $1::vector,
                 COALESCE(vectorSummaryEmbedding <=> $1::vector, 1)
               ) as distance
        FROM "Bookmark"
        WHERE userId = $2 AND status = 'COMPLETE'
        ORDER BY distance ASC
        LIMIT 20
      `, JSON.stringify(bookmarkWithEmbedding.titleEmbedding), testUser.id);
      const end4 = performance.now();
      console.log(`   ✅ Completed in ${(end4 - start4).toFixed(2)}ms (${(vectorResults as any[]).length} results)`);
    } else {
      console.log('   ⏭️  Skipped - No embeddings found');
    }

    // Test 5: Tag relationship query
    console.log('🔍 Test 5: Tag relationship query');
    const start5 = performance.now();
    const tagResults = await prisma.bookmark.findMany({
      where: {
        userId: testUser.id,
        status: 'COMPLETE',
        tags: {
          some: {
            tag: {
              name: {
                contains: 'javascript',
                mode: 'insensitive'
              }
            }
          }
        }
      },
      select: {
        id: true,
        title: true,
        url: true,
        tags: {
          select: {
            tag: {
              select: {
                name: true
              }
            }
          }
        }
      },
      take: 20
    });
    const end5 = performance.now();
    console.log(`   ✅ Completed in ${(end5 - start5).toFixed(2)}ms (${tagResults.length} results)`);

    // Performance summary
    console.log('\n📈 Performance Summary:');
    console.log(`   • Default browsing: ${(end1 - start1).toFixed(2)}ms`);
    console.log(`   • Filtered query: ${(end2 - start2).toFixed(2)}ms`);
    console.log(`   • Unread filter: ${(end3 - start3).toFixed(2)}ms`);
    if (bookmarkWithEmbedding?.titleEmbedding) {
      console.log(`   • Vector search: ${((performance.now() - start4 + end4 - start4) / 2).toFixed(2)}ms`);
    }
    console.log(`   • Tag search: ${(end5 - start5).toFixed(2)}ms`);

    // Success criteria validation
    console.log('\n✅ Index Performance Validation:');
    const avgFilterTime = (end2 - start2 + end3 - start3) / 2;
    console.log(`   • Filtered queries: ${avgFilterTime.toFixed(2)}ms ${avgFilterTime < 50 ? '✅ PASS' : '❌ FAIL'} (target: <50ms)`);

    if (bookmarkWithEmbedding?.titleEmbedding) {
      const vectorTime = performance.now() - start4 + end4 - start4;
      console.log(`   • Vector searches: ${vectorTime.toFixed(2)}ms ${vectorTime < 200 ? '✅ PASS' : '❌ FAIL'} (target: <200ms)`);
    }

    console.log(`   • Tag searches: ${(end5 - start5).toFixed(2)}ms ${(end5 - start5) < 100 ? '✅ PASS' : '❌ FAIL'} (target: <100ms)`);

  } catch (error) {
    console.error('❌ Performance test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSearchPerformance().catch(console.error);