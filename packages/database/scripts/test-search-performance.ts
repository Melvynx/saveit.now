import { prisma } from '../src/client';
import { performance } from 'perf_hooks';

async function runSingleTest(testUser: any) {
  // Test 1: Default browsing
  const start1 = performance.now();
  await prisma.bookmark.findMany({
    where: { userId: testUser.id, status: 'READY' },
    select: { id: true, title: true, url: true, type: true },
    orderBy: { id: 'desc' },
    take: 20
  });
  const browsing = performance.now() - start1;

  // Test 2: YouTube unread
  const start2 = performance.now();
  const youtube = await prisma.bookmark.findMany({
    where: { userId: testUser.id, type: 'YOUTUBE', read: false, status: 'READY' },
    select: { id: true, title: true },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  const filtered = performance.now() - start2;

  // Test 3: All unread
  const start3 = performance.now();
  const unread = await prisma.bookmark.findMany({
    where: { userId: testUser.id, read: false, status: 'READY' },
    select: { id: true, title: true },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  const unreadTime = performance.now() - start3;

  return {
    browsing: Math.round(browsing),
    filtered: Math.round(filtered),
    unread: Math.round(unreadTime),
    youtubeCount: youtube.length,
    unreadCount: unread.length
  };
}

async function testSearchPerformance() {
  console.log('🚀 Running 10 performance tests...\n');

  const testUser = await prisma.user.findFirst({
    where: { email: 'melvynmal@gmail.com' },
    include: { _count: { select: { bookmarks: true } } }
  });

  if (!testUser) {
    console.log('❌ User not found');
    return;
  }

  console.log(`📊 User: ${testUser.email} (${testUser._count.bookmarks} bookmarks)\n`);

  const results = [];

  for (let i = 1; i <= 10; i++) {
    process.stdout.write(`Test ${i}/10... `);
    const result = await runSingleTest(testUser);
    results.push(result);
    console.log(`✅ ${result.browsing}ms | ${result.filtered}ms | ${result.unread}ms`);
  }

  // Calculate averages
  const avgBrowsing = Math.round(results.reduce((a, b) => a + b.browsing, 0) / 10);
  const avgFiltered = Math.round(results.reduce((a, b) => a + b.filtered, 0) / 10);
  const avgUnread = Math.round(results.reduce((a, b) => a + b.unread, 0) / 10);

  console.log('\n📈 AVERAGES (10 runs):');
  console.log(`   • Default browsing: ${avgBrowsing}ms`);
  console.log(`   • YouTube unread: ${avgFiltered}ms (${results[0].youtubeCount} results)`);
  console.log(`   • All unread: ${avgUnread}ms (${results[0].unreadCount} results)`);

  console.log('\n✅ TARGET VALIDATION:');
  console.log(`   • Browsing ${avgBrowsing < 100 ? '✅ PASS' : '❌ FAIL'} (target: <100ms)`);
  console.log(`   • Filters ${avgFiltered < 50 ? '✅ PASS' : '❌ FAIL'} (target: <50ms)`);

  await prisma.$disconnect();
}

testSearchPerformance().catch(console.error);