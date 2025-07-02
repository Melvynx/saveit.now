"use server";

import { createBookmark } from "@/lib/database/create-bookmark";
import { getUserLimits } from "@/lib/auth-session";
import { ApplicationError } from "@/lib/errors";
import { userAction } from "@/lib/safe-action";
import { prisma } from "@workspace/database";
import { z } from "zod";
import { URL_REGEX } from "./url-regex";

interface ImportResult {
  url: string;
  success: boolean;
  error?: string;
  bookmark?: unknown;
}

export const importBookmarksAction = userAction
  .schema(
    z.object({
      text: z.string(),
    }),
  )
  .action(async ({ parsedInput: { text }, ctx: { user } }) => {
    const urls = text.match(URL_REGEX) || [];
    const uniqueUrls = [...new Set(urls)];

    // Pre-import quota validation
    const userLimits = await getUserLimits();
    const currentBookmarkCount = await prisma.bookmark.count({
      where: { userId: user.id },
    });

    const availableSlots = userLimits.limits.bookmarks - currentBookmarkCount;

    if (availableSlots <= 0) {
      throw new ApplicationError(
        "You have reached your bookmark limit. Please upgrade your plan or delete some bookmarks.",
        "BOOKMARK_LIMIT_REACHED"
      );
    }

    // Limit URLs to available slots
    const urlsToProcess = uniqueUrls.slice(0, availableSlots);
    const skippedUrls = uniqueUrls.slice(availableSlots);

    // Sequential processing to prevent race conditions
    const results: ImportResult[] = [];
    let successCount = 0;

    for (const url of urlsToProcess) {
      try {
        const bookmark = await createBookmark({
          url,
          userId: user.id,
        });

        results.push({
          url,
          success: true,
          bookmark,
        });
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to create bookmark for ${url}:`, error);
        
        results.push({
          url,
          success: false,
          error: errorMessage,
        });

        // If we hit a limit error, stop processing
        if (errorMessage.includes("maximum number of bookmarks")) {
          break;
        }
      }
    }

    return {
      totalUrls: uniqueUrls.length,
      processedUrls: urlsToProcess.length,
      skippedUrls: skippedUrls.length,
      createdBookmarks: successCount,
      failedBookmarks: results.filter(r => !r.success).length,
      availableSlots,
      results,
      hasMoreUrls: skippedUrls.length > 0,
      limitReached: availableSlots < uniqueUrls.length,
    };
  });
