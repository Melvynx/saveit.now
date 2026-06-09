"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  processTweetBookmark,
  processYouTubeBookmark,
  processArticleBookmark,
  processProductBookmark,
  processImageBookmark,
  processPdfBookmark,
  processPageBookmark,
  isProductPage,
  getVideoId,
} from "./handlers";

/**
 * Processing step numbers (maps to BOOKMARK_STEPS in spec):
 * 0  = pending
 * 1  = get-bookmark
 * 2  = scrap-content
 * 3  = extract-metadata
 * 4  = summary-page
 * 5  = find-tags
 * 6  = screenshot
 * 7  = saving
 * 8  = finish
 * 9  = transcript-video
 * 10 = describe-screenshot
 * 11 = get-tweet
 */

function isYouTubeVideo(url: string): boolean {
  const videoRegex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  return videoRegex.test(url);
}

/**
 * run — the main pipeline internalAction.
 * Orchestrates: limits check → fetch bookmark → start run → dedupe → type detection →
 * type handler → embed → tags → finish
 * On any error: fail run + set ERROR status.
 */
export const run = internalAction({
  args: {
    bookmarkId: v.id("bookmarks"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { bookmarkId, userId }) => {
    // 1. Check processing limits BEFORE any writes
    try {
      await ctx.runMutation(
        internal.billing.limits.assertCanRunProcessingMutation,
        { userId },
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Processing limit exceeded";
      await ctx.runMutation(internal.processing.runs.fail, {
        bookmarkId,
        error: `Limit exceeded: ${message}`,
      });
      // Patch bookmark to ERROR with limit message
      await ctx.runMutation(internal.bookmarks.mutations.updateProcessing, {
        id: bookmarkId,
        patch: {
          status: "ERROR",
          processingError: `Limit exceeded: ${message}`,
        },
      });
      return null;
    }

    // 2. Patch step: get-bookmark (1)
    await ctx.runMutation(internal.processing.runs.patchStep, {
      bookmarkId,
      step: 1,
    });

    // 3. Fetch bookmark
    const bookmark = (await ctx.runQuery(
      internal.bookmarks.queries.getById,
      { id: bookmarkId, userId },
    )) as {
      _id: string;
      url: string;
      status: string;
      userId: string;
      type?: string | null;
      preview?: string | null;
      metadata?: Record<string, unknown> | null;
    } | null;

    if (!bookmark) {
      // Nothing to do — bookmark was deleted
      return null;
    }

    // 4. Start the processing run
    await ctx.runMutation(internal.processing.runs.start, {
      bookmarkId,
      userId,
    });

    try {
      // 5. Dedupe check: find an existing READY bookmark with same URL
      let youtubeId: string | undefined;
      const isYT =
        (bookmark.url.includes("youtube.com") ||
          bookmark.url.includes("youtu.be")) &&
        isYouTubeVideo(bookmark.url);
      if (isYT) {
        try {
          youtubeId = getVideoId(bookmark.url);
        } catch {
          // invalid YT URL, treat as page
        }
      }

      const existingId = await ctx.runQuery(
        internal.processing.runs.findReadyByUrl,
        {
          url: bookmark.url,
          bookmarkId,
          userId,
          youtubeId,
        },
      ) as string | null;

      if (existingId) {
        // Copy from duplicate + mark run complete
        await ctx.runMutation(internal.processing.runs.patchStep, {
          bookmarkId,
          step: 7, // saving
        });
        await ctx.runMutation(internal.processing.runs.copyFromDuplicate, {
          targetId: bookmarkId,
          sourceId: existingId as never,
        });
        await ctx.runMutation(internal.processing.runs.finish, { bookmarkId });
        return null;
      }

      // 6. Patch step: scrap-content (2)
      await ctx.runMutation(internal.processing.runs.patchStep, {
        bookmarkId,
        step: 2,
      });

      // 7. Fetch URL content to detect type
      const isTweet =
        bookmark.url.includes("twitter.com") ||
        bookmark.url.startsWith("https://x.com/");

      if (isTweet) {
        // Tweet — no URL fetch needed
        await ctx.runMutation(internal.processing.runs.patchStep, {
          bookmarkId,
          step: 11, // get-tweet
        });

        const result = await processTweetBookmark(
          ctx,
          bookmark as never,
          userId,
        );
        await persistHandlerResult(ctx, bookmarkId, userId, result);
        await ctx.runMutation(internal.processing.runs.finish, { bookmarkId });
        return null;
      }

      // Fetch URL
      let urlContent: {
        ok: boolean;
        content: string | ArrayBuffer | null;
        contentType: string | null;
        type: string | null;
        fetchFailed: boolean;
      };

      try {
        const response = await fetch(bookmark.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          },
        });

        if (!response.ok) throw new Error("Non-OK response");

        const ct = response.headers.get("content-type") ?? "";
        let content: string | ArrayBuffer | null = null;
        let type: string | null = null;

        if (ct.startsWith("text/") || ct.startsWith("application/json")) {
          content = await response.text();
          type = "PAGE";
        } else if (ct.startsWith("image/")) {
          content = await response.arrayBuffer();
          type = "IMAGE";
        } else if (ct.startsWith("application/pdf")) {
          content = await response.arrayBuffer();
          type = "PDF";
        } else if (ct.startsWith("video/")) {
          type = "VIDEO";
        }

        // Product detection on PAGE/ARTICLE types
        if (
          (type === null || type === "PAGE" || type === "ARTICLE") &&
          typeof content === "string" &&
          isProductPage(bookmark.url, content)
        ) {
          type = "PRODUCT";
        }

        urlContent = {
          ok: true,
          content,
          contentType: ct,
          type,
          fetchFailed: false,
        };
      } catch {
        urlContent = {
          ok: false,
          content: null,
          contentType: null,
          type: "PAGE",
          fetchFailed: true,
        };
      }

      // 8. Handle fetch failure with minimal data
      if (urlContent.fetchFailed) {
        const urlObj = new URL(bookmark.url);
        const fallbackTitle = urlObj.hostname + urlObj.pathname;
        await ctx.runMutation(internal.bookmarks.mutations.updateProcessing, {
          id: bookmarkId,
          patch: {
            status: "READY",
            type: "PAGE",
            title: fallbackTitle,
            metadata: {
              fetchFailed: true,
              fetchError: "Could not retrieve content from URL",
            },
          },
        });
        await ctx.runMutation(internal.processing.runs.finish, { bookmarkId });
        return null;
      }

      // 9. Check YouTube
      if (
        (bookmark.url.includes("youtube.com") ||
          bookmark.url.includes("youtu.be")) &&
        isYouTubeVideo(bookmark.url)
      ) {
        await ctx.runMutation(internal.processing.runs.patchStep, {
          bookmarkId,
          step: 9, // transcript-video
        });

        const result = await processYouTubeBookmark(
          ctx,
          bookmark as never,
          userId,
        );
        await persistHandlerResult(ctx, bookmarkId, userId, result);
        await ctx.runMutation(internal.processing.runs.finish, { bookmarkId });
        return null;
      }

      // 10. Route by detected type
      const htmlContent =
        typeof urlContent.content === "string" ? urlContent.content : "";

      let result: Record<string, unknown>;

      if (urlContent.type === "PRODUCT" && htmlContent) {
        result = await processProductBookmark(
          ctx,
          bookmark as never,
          userId,
          htmlContent,
        );
      } else if (
        urlContent.type === "PAGE" &&
        htmlContent &&
        (htmlContent.includes("<article") ||
          htmlContent.includes('property="og:type" content="article"'))
      ) {
        result = await processArticleBookmark(
          ctx,
          bookmark as never,
          userId,
          htmlContent,
        );
      } else if (urlContent.type === "IMAGE") {
        result = await processImageBookmark(ctx, bookmark as never, userId);
      } else if (urlContent.type === "PDF") {
        result = await processPdfBookmark(ctx, bookmark as never, userId);
      } else {
        // Default PAGE handler
        result = await processPageBookmark(
          ctx,
          bookmark as never,
          userId,
          htmlContent,
        );
      }

      await persistHandlerResult(ctx, bookmarkId, userId, result);
      await ctx.runMutation(internal.processing.runs.finish, { bookmarkId });
      return null;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown processing error";
      await ctx.runMutation(internal.processing.runs.fail, {
        bookmarkId,
        error: message,
      });
      return null;
    }
  },
});

/**
 * persistHandlerResult — apply the handler result fields to the bookmark
 * and create tags via the tags mutation.
 */
async function persistHandlerResult(
  ctx: ActionCtx,
  bookmarkId: string,
  userId: string,
  result: Record<string, unknown>,
) {
  const { tagNames, searchEmbedding, embeddingModel, ...fields } = result;

  // Patch step: saving (7)
  await ctx.runMutation(internal.processing.runs.patchStep, {
    bookmarkId: bookmarkId as never,
    step: 7,
  });

  // Apply result fields (type, title, summary, vectorSummary, preview, etc.)
  await ctx.runMutation(internal.processing.runs.applyResult, {
    bookmarkId: bookmarkId as never,
    fields: {
      ...fields,
      ...(searchEmbedding ? { searchEmbedding, embeddingModel } : {}),
    },
  });

  // Set tags by name (creates IA tags idempotently)
  if (Array.isArray(tagNames) && tagNames.length > 0) {
    await ctx.runMutation(
      internal.tags.mutations.setBookmarkTagsByNameInternal,
      {
        bookmarkId: bookmarkId as never,
        tagNames: tagNames as string[],
        userId,
        type: "IA",
      },
    );
  }
}
