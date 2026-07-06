"use node";

/**
 * processing/steps.ts — Node actions invoked as workflow steps.
 *
 * Each action is a thin, retryable unit: it loads what it needs, runs the
 * type handler, and persists its own result so nothing large flows through
 * the workflow journal. Orchestration lives in processing/workflow.ts.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import {
  isProductPage,
  processArticleBookmark,
  processImageBookmark,
  processPageBookmark,
  processPdfBookmark,
  processProductBookmark,
  processTweetBookmark,
  processYouTubeBookmark,
} from "./handlers";
import { safeFetch } from "../lib/safe_fetch";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

export const vRoute = v.union(
  v.literal("PAGE"),
  v.literal("ARTICLE"),
  v.literal("PRODUCT"),
  v.literal("IMAGE"),
  v.literal("PDF"),
  v.literal("FETCH_FAILED"),
);
export type Route =
  | "PAGE"
  | "ARTICLE"
  | "PRODUCT"
  | "IMAGE"
  | "PDF"
  | "FETCH_FAILED";

/**
 * analyzeUrl — fetch the URL once to classify the bookmark.
 * Returns a route only (never page content) to keep the journal small;
 * an unreachable URL routes to FETCH_FAILED without retrying.
 */
export const analyzeUrl = internalAction({
  args: { url: v.string() },
  returns: vRoute,
  handler: async (_ctx, { url }): Promise<Route> => {
    try {
      const response = await safeFetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!response.ok) throw new Error("Non-OK response");

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.startsWith("image/")) return "IMAGE";
      if (contentType.startsWith("application/pdf")) return "PDF";

      if (
        contentType.startsWith("text/") ||
        contentType.startsWith("application/json")
      ) {
        const html = await response.text();
        if (isProductPage(url, html)) return "PRODUCT";
        if (
          html.includes("<article") ||
          html.includes('property="og:type" content="article"')
        ) {
          return "ARTICLE";
        }
        return "PAGE";
      }

      // video/* and other content types use the default page handler
      return "PAGE";
    } catch {
      return "FETCH_FAILED";
    }
  },
});

export const processTweet = internalAction({
  args: { bookmarkId: v.id("bookmarks"), userId: v.string() },
  returns: v.null(),
  handler: async (ctx, { bookmarkId, userId }) => {
    const bookmark = await loadBookmark(ctx, bookmarkId, userId);
    if (!bookmark) return null;
    const result = await processTweetBookmark(ctx, bookmark as never, userId);
    await persistHandlerResult(ctx, bookmarkId, userId, result);
    return null;
  },
});

export const processYouTube = internalAction({
  args: { bookmarkId: v.id("bookmarks"), userId: v.string() },
  returns: v.null(),
  handler: async (ctx, { bookmarkId, userId }) => {
    const bookmark = await loadBookmark(ctx, bookmarkId, userId);
    if (!bookmark) return null;
    const result = await processYouTubeBookmark(
      ctx,
      bookmark as never,
      userId,
    );
    await persistHandlerResult(ctx, bookmarkId, userId, result);
    return null;
  },
});

/**
 * processByRoute — run the type handler picked by analyzeUrl.
 * HTML routes re-fetch the page (a throw here triggers the step retry).
 */
export const processByRoute = internalAction({
  args: {
    bookmarkId: v.id("bookmarks"),
    userId: v.string(),
    route: vRoute,
  },
  returns: v.null(),
  handler: async (ctx, { bookmarkId, userId, route }) => {
    const bookmark = await loadBookmark(ctx, bookmarkId, userId);
    if (!bookmark) return null;

    let result: Record<string, unknown>;
    switch (route) {
      case "IMAGE":
        result = await processImageBookmark(ctx, bookmark as never, userId);
        break;
      case "PDF":
        result = await processPdfBookmark(ctx, bookmark as never, userId);
        break;
      case "PRODUCT":
        result = await processProductBookmark(
          ctx,
          bookmark as never,
          userId,
          await fetchHtml(bookmark.url),
        );
        break;
      case "ARTICLE":
        result = await processArticleBookmark(
          ctx,
          bookmark as never,
          userId,
          await fetchHtml(bookmark.url),
        );
        break;
      default:
        result = await processPageBookmark(
          ctx,
          bookmark as never,
          userId,
          await fetchHtml(bookmark.url),
        );
        break;
    }

    await persistHandlerResult(ctx, bookmarkId, userId, result);
    return null;
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadBookmark(
  ctx: ActionCtx,
  bookmarkId: Id<"bookmarks">,
  userId: string,
) {
  return await ctx.runQuery(internal.bookmarks.queries.getById, {
    id: bookmarkId,
    userId,
  });
}

async function fetchHtml(url: string): Promise<string> {
  const response = await safeFetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch URL content (${response.status})`);
  }
  return await response.text();
}

/**
 * persistHandlerResult — apply the handler result fields to the bookmark
 * and create tags via the tags mutation.
 */
async function persistHandlerResult(
  ctx: ActionCtx,
  bookmarkId: Id<"bookmarks">,
  userId: string,
  result: Record<string, unknown>,
) {
  const { tagNames, searchEmbedding, embeddingModel, ...fields } = result;

  // Patch step: saving (7)
  await ctx.runMutation(internal.processing.runs.patchStep, {
    bookmarkId,
    step: 7,
  });

  // Apply result fields (type, title, summary, vectorSummary, preview, etc.)
  await ctx.runMutation(internal.processing.runs.applyResult, {
    bookmarkId,
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
        bookmarkId,
        tagNames: tagNames as string[],
        userId,
        type: "IA",
      },
    );
  }
}
