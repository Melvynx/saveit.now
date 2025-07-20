#!/usr/bin/env tsx

import { BookmarkType, prisma } from "../src";

/**
 * Query script to analyze current BookmarkType usage in the database
 * This script helps understand what bookmark types are currently in use
 */
async function queryBookmarkTypes() {
  console.log("🔍 Querying current BookmarkType usage...\n");

  try {
    // Get total count of bookmarks
    const totalBookmarks = await prisma.bookmark.count();
    console.log(`📊 Total bookmarks in database: ${totalBookmarks}\n`);

    if (totalBookmarks === 0) {
      console.log("ℹ️  No bookmarks found in database.\n");
      return;
    }

    // Get count of bookmarks by type
    console.log("📈 Bookmark distribution by type:");
    console.log("─".repeat(40));

    const typeDistribution = await prisma.bookmark.groupBy({
      by: ['type'],
      _count: {
        type: true,
      },
      orderBy: {
        _count: {
          type: 'desc',
        },
      },
    });

    let totalTyped = 0;
    for (const group of typeDistribution) {
      const type = group.type;
      const count = group._count.type;
      totalTyped += count;
      
      if (type === null) {
        console.log(`  NULL (untyped):     ${count.toString().padStart(6)} bookmarks`);
      } else {
        console.log(`  ${type.padEnd(12)}: ${count.toString().padStart(6)} bookmarks`);
      }
    }

    console.log("─".repeat(40));
    console.log(`  Total:              ${totalTyped.toString().padStart(6)} bookmarks\n`);

    // Show available BookmarkType enum values
    console.log("🏷️  Available BookmarkType enum values:");
    console.log("─".repeat(40));
    const enumValues = Object.values(BookmarkType);
    enumValues.forEach(type => {
      console.log(`  • ${type}`);
    });
    console.log();

    // Get some sample bookmarks for each type (limited to 3 per type)
    console.log("📄 Sample bookmarks by type:");
    console.log("─".repeat(60));

    for (const enumValue of enumValues) {
      const samples = await prisma.bookmark.findMany({
        where: { type: enumValue },
        select: {
          id: true,
          url: true,
          title: true,
          createdAt: true,
        },
        take: 3,
        orderBy: { createdAt: 'desc' },
      });

      if (samples.length > 0) {
        console.log(`\n${enumValue} (${samples.length} shown):`);
        samples.forEach(bookmark => {
          const title = bookmark.title || 'No title';
          const truncatedTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
          console.log(`  • ${truncatedTitle}`);
          console.log(`    URL: ${bookmark.url}`);
          console.log(`    Created: ${bookmark.createdAt.toISOString().split('T')[0]}`);
        });
      }
    }

    // Check for NULL type bookmarks
    const nullTypeCount = await prisma.bookmark.count({
      where: { type: null }
    });

    if (nullTypeCount > 0) {
      console.log(`\n⚠️  Found ${nullTypeCount} bookmarks with NULL type`);
      
      const nullSamples = await prisma.bookmark.findMany({
        where: { type: null },
        select: {
          id: true,
          url: true,
          title: true,
          createdAt: true,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      console.log("\nSample NULL type bookmarks:");
      nullSamples.forEach(bookmark => {
        const title = bookmark.title || 'No title';
        const truncatedTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
        console.log(`  • ${truncatedTitle}`);
        console.log(`    URL: ${bookmark.url}`);
        console.log(`    Created: ${bookmark.createdAt.toISOString().split('T')[0]}`);
      });
    }

  } catch (error) {
    console.error("❌ Error querying database:", error);
    throw error;
  }
}

async function main() {
  try {
    await queryBookmarkTypes();
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();