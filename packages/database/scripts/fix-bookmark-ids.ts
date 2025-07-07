import { ulid } from "ulid";
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function isValidUlid(id: string): Promise<boolean> {
  // Valid ULID: 26 characters, using Crockford's Base32
  return id.length === 26 && /^[0-9A-HJKMNP-TV-Z]{26}$/.test(id);
}

async function fixBookmarkIds() {
  console.log("🔍 Finding bookmarks with invalid ULID format...");

  // Find all bookmarks with invalid ULID format
  const bookmarks = await prisma.bookmark.findMany({
    select: {
      id: true,
    },
  });

  console.log(`📊 Total bookmarks found: ${bookmarks.length}`);

  const invalidBookmarks = [];
  for (const bookmark of bookmarks) {
    if (!(await isValidUlid(bookmark.id))) {
      invalidBookmarks.push(bookmark.id);
      console.log(`  ❌ Invalid ULID: ${bookmark.id}`);
    }
  }

  console.log(
    `📊 Found ${invalidBookmarks.length} bookmarks with invalid ULID format`,
  );

  if (invalidBookmarks.length === 0) {
    console.log("✅ All bookmark IDs are already valid ULIDs");
    return;
  }

  console.log("🔄 Starting ID migration...");

  // Process each invalid bookmark
  for (const oldId of invalidBookmarks) {
    const newId = ulid();

    console.log(`  📝 Updating bookmark: ${oldId} -> ${newId}`);

    try {
      await prisma.$transaction(async (tx) => {
        // First, update the bookmark itself to create the new ID
        await tx.bookmark.update({
          where: { id: oldId },
          data: { id: newId },
        });

        // Then update foreign key references
        await tx.bookmarkTag.updateMany({
          where: { bookmarkId: oldId },
          data: { bookmarkId: newId },
        });

        await tx.bookmarkChunk.updateMany({
          where: { bookmarkId: oldId },
          data: { bookmarkId: newId },
        });

        await tx.bookmarkOpen.updateMany({
          where: { bookmarkId: oldId },
          data: { bookmarkId: newId },
        });
      });

      console.log(`  ✅ Successfully updated bookmark ${oldId}`);
    } catch (error) {
      console.error(`  ❌ Failed to update bookmark ${oldId}:`, error);
      throw error;
    }
  }

  console.log("🎉 Bookmark ID migration completed successfully!");
}

async function main() {
  try {
    await fixBookmarkIds();
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
