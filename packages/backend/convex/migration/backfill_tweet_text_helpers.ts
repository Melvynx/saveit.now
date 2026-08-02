/**
 * migration/backfill_tweet_text_helpers.ts — Default-runtime helpers for the
 * tweet-text backfill.  The "use node" action in backfill_tweet_text.ts cannot
 * define queries or mutations, so they live here and are called through
 * ctx.runQuery / ctx.runMutation.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../functions";
import { cleanMetadataForStorage } from "../utils/metadata";

function isMissingTweetText(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return true;
  const stored = (metadata as Record<string, unknown>).tweetText;
  return typeof stored !== "string" || stored.trim().length === 0;
}

/**
 * pageTweetsMissingText — one page of TWEET bookmarks whose metadata has no
 * usable `tweetText`. Paginates the whole table and post-filters, like the
 * re-embed pass does.
 */
export const pageTweetsMissingText = internalQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
    limit: v.number(),
  },
  returns: v.object({
    page: v.array(
      v.object({
        id: v.id("bookmarks"),
        url: v.string(),
      }),
    ),
    continueCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
    scanned: v.number(),
  }),
  handler: async (ctx, { cursor, limit }) => {
    const paginationResult = await ctx.db
      .query("bookmarks")
      .paginate({ cursor: cursor ?? null, numItems: limit });

    const candidates = paginationResult.page.filter(
      (doc) => doc.type === "TWEET" && isMissingTweetText(doc.metadata),
    );

    return {
      page: candidates.map((doc) => ({ id: doc._id, url: doc.url })),
      continueCursor: paginationResult.isDone
        ? null
        : paginationResult.continueCursor,
      isDone: paginationResult.isDone,
      scanned: paginationResult.page.length,
    };
  },
});

/**
 * patchTweetText — merges `tweetText` into an existing bookmark's metadata.
 * Called from the "use node" backfill action via ctx.runMutation.
 */
export const patchTweetText = internalMutation({
  args: {
    id: v.id("bookmarks"),
    tweetText: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { id, tweetText }) => {
    const bookmark = await ctx.db.get(id);
    if (!bookmark) return null;

    const existing =
      bookmark.metadata && typeof bookmark.metadata === "object"
        ? (bookmark.metadata as Record<string, unknown>)
        : {};

    await ctx.db.patch(id, {
      metadata:
        cleanMetadataForStorage({ ...existing, tweetText }) ?? bookmark.metadata,
    });
    return null;
  },
});
