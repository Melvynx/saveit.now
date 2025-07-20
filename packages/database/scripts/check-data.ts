#!/usr/bin/env tsx

import { prisma } from "../src";

/**
 * Quick data check script - provides a snapshot of current database state
 * Useful for understanding what data exists before making changes
 */
async function checkDatabaseData() {
  console.log("🔍 Database Data Snapshot");
  console.log("=" .repeat(50));

  try {
    // Basic counts
    const userCount = await prisma.user.count();
    const bookmarkCount = await prisma.bookmark.count();
    const tagCount = await prisma.tag.count();

    console.log(`📊 Basic Counts:`);
    console.log(`   Users:     ${userCount}`);
    console.log(`   Bookmarks: ${bookmarkCount}`);
    console.log(`   Tags:      ${tagCount}\n`);

    if (bookmarkCount === 0) {
      console.log("ℹ️  No bookmarks found. Database appears to be empty or test environment.\n");
      return;
    }

    // Quick query to see what types are actually in use
    const typeQuery = await prisma.$queryRaw<Array<{type: string | null, count: string}>>`
      SELECT 
        type,
        COUNT(*) as count
      FROM "Bookmark" 
      GROUP BY type 
      ORDER BY COUNT(*) DESC
    `;

    console.log(`🏷️  BookmarkType Usage:`);
    typeQuery.forEach(row => {
      const type = row.type || 'NULL';
      console.log(`   ${type.padEnd(12)}: ${row.count} bookmarks`);
    });

    console.log("\n" + "=" .repeat(50));
    console.log("✅ Data check complete");

  } catch (error) {
    console.error("❌ Error checking database:", error);
    throw error;
  }
}

async function main() {
  try {
    await checkDatabaseData();
  } catch (error) {
    console.error("❌ Check failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { checkDatabaseData };