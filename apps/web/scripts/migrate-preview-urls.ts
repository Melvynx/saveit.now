#!/usr/bin/env tsx

/**
 * Migration script to upload external preview URLs to S3
 * This script finds all bookmarks with preview URLs that are not hosted on saveit.mlvcdn.com
 * and uploads them to S3, then updates the database with the new URLs
 */

import { config } from "dotenv";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
config({ path: join(__dirname, "..", ".env") });
config({ path: join(__dirname, "..", ".env.test"), override: true });

interface BookmarkToMigrate {
  id: string;
  userId: string;
  preview: string;
}

async function findBookmarksWithExternalPreviewUrls(
  prisma: any,
): Promise<BookmarkToMigrate[]> {
  console.log("🔍 Finding bookmarks with external preview URLs...");

  const bookmarks = await prisma.bookmark.findMany({
    where: {
      preview: {
        not: {
          contains: "saveit.mlvcdn.com",
        },
      },
      status: "READY",
    },
    select: {
      id: true,
      userId: true,
      preview: true,
    },
  });

  console.log(
    `📊 Found ${bookmarks.length} bookmarks with external preview URLs`,
  );

  return bookmarks.filter(
    (bookmark): bookmark is BookmarkToMigrate => bookmark.preview !== null,
  );
}

async function uploadAndUpdateBookmark(
  bookmark: BookmarkToMigrate,
  prisma: any,
  uploadFileFromURLToS3: any,
): Promise<boolean> {
  try {
    console.log(`📤 Uploading preview for bookmark ${bookmark.id}...`);

    // Upload the external image to S3
    const uploadedUrl = await uploadFileFromURLToS3({
      url: bookmark.preview,
      prefix: `users/${bookmark.userId}/bookmarks/${bookmark.id}`,
      fileName: "preview-migrated",
    });

    if (!uploadedUrl) {
      console.error(`❌ Failed to upload image for bookmark ${bookmark.id}`);
      return false;
    }

    // Update the bookmark with the new S3 URL
    await prisma.bookmark.update({
      where: { id: bookmark.id },
      data: { preview: uploadedUrl },
    });

    console.log(`✅ Successfully migrated bookmark ${bookmark.id}`);
    console.log(`   Old URL: ${bookmark.preview}`);
    console.log(`   New URL: ${uploadedUrl}`);

    return true;
  } catch (error) {
    console.error(`❌ Error migrating bookmark ${bookmark.id}:`, error);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting preview URL migration...");

  try {
    // Import dependencies dynamically
    const { prisma } = await import("@workspace/database");
    const { uploadFileFromURLToS3 } = await import(
      "../src/lib/aws-s3/aws-s3-upload-files.js"
    );

    console.log("✅ Dependencies loaded");

    // Find all bookmarks with external preview URLs
    const bookmarksToMigrate =
      await findBookmarksWithExternalPreviewUrls(prisma);

    if (bookmarksToMigrate.length === 0) {
      console.log(
        "✨ No bookmarks to migrate. All preview URLs are already hosted on S3.",
      );
      return;
    }

    console.log(
      `📋 Starting migration of ${bookmarksToMigrate.length} bookmarks...`,
    );

    let successCount = 0;
    let errorCount = 0;

    // Process bookmarks in batches of 5 to avoid overwhelming the S3 service
    const batchSize = 5;
    for (let i = 0; i < bookmarksToMigrate.length; i += batchSize) {
      const batch = bookmarksToMigrate.slice(i, i + batchSize);

      console.log(
        `📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(bookmarksToMigrate.length / batchSize)}...`,
      );

      const batchPromises = batch.map((bookmark) =>
        uploadAndUpdateBookmark(bookmark, prisma, uploadFileFromURLToS3),
      );
      const results = await Promise.all(batchPromises);

      results.forEach((success) => {
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      });

      // Add a small delay between batches to be respectful to external servers
      if (i + batchSize < bookmarksToMigrate.length) {
        console.log("⏳ Waiting 2 seconds before next batch...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log("\n🎉 Migration completed!");
    console.log(`✅ Successfully migrated: ${successCount} bookmarks`);
    console.log(`❌ Failed to migrate: ${errorCount} bookmarks`);

    if (errorCount > 0) {
      console.log(
        "⚠️  Some bookmarks failed to migrate. Check the logs above for details.",
      );
    }
  } catch (error) {
    console.error("💥 Migration failed with error:", error);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
main()
  .then(() => {
    console.log("🏁 Migration script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration script failed:", error);
    process.exit(1);
  });
