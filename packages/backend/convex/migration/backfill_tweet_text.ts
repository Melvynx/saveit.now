"use node";

/**
 * migration/backfill_tweet_text.ts — Node-runtime action that re-fetches the
 * body of tweets saved before `metadata.tweetText` existed.
 *
 * Those bookmarks stored the tweet body under `metadata.text`, which the
 * metadata sanitizer strips as a sensitive key, so the dashboard fell back to
 * the AI summary. This pass re-reads each tweet from the syndication API and
 * writes the body back under the whitelisted `tweetText` key.
 *
 * Kick it off from the CLI:
 *   npx convex run migration/backfill_tweet_text:backfillTweetTextBatch '{"cursor":null}'
 * Batches chain themselves through the scheduler to stay under action limits.
 * Its query/mutation helpers live in backfill_tweet_text_helpers.ts because a
 * "use node" file cannot define them.
 */

import { v } from "convex/values";
import { getTweet } from "react-tweet/api";
import { internal } from "../_generated/api";
import { internalAction } from "../functions";
import { getTweetId, toStoredTweetText } from "../processing/handlers";

const BATCH_DELAY_MS = 2_000;
const REQUEST_DELAY_MS = 250;

type BackfillStats = {
  scanned: number;
  candidates: number;
  patched: number;
  skipped: number;
  failed: number;
  continueCursor: string | null;
  scheduledNext: boolean;
};

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export const backfillTweetTextBatch = internalAction({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    scanned: v.number(),
    candidates: v.number(),
    patched: v.number(),
    skipped: v.number(),
    failed: v.number(),
    continueCursor: v.union(v.string(), v.null()),
    scheduledNext: v.boolean(),
  }),
  handler: async (ctx, { cursor, batchSize }): Promise<BackfillStats> => {
    const limit = batchSize ?? 25;

    const { page, continueCursor, isDone, scanned } = await ctx.runQuery(
      internal.migration.backfill_tweet_text_helpers.pageTweetsMissingText,
      { cursor, limit },
    );

    let patched = 0;
    let skipped = 0;
    let failed = 0;

    for (const bookmark of page) {
      const tweetId = getTweetId(bookmark.url);
      if (!tweetId) {
        skipped += 1;
        continue;
      }

      try {
        const tweet = await getTweet(tweetId);
        const tweetText = toStoredTweetText(
          (tweet as Record<string, unknown> | undefined)?.text,
        );

        if (!tweetText) {
          skipped += 1;
          continue;
        }

        await ctx.runMutation(
          internal.migration.backfill_tweet_text_helpers.patchTweetText,
          { id: bookmark.id, tweetText },
        );
        patched += 1;
      } catch (err) {
        console.error(
          `[backfill-tweet-text] failed for bookmark ${bookmark.id}:`,
          err,
        );
        failed += 1;
      }

      await delay(REQUEST_DELAY_MS);
    }

    const scheduledNext = !isDone && continueCursor !== null;
    if (scheduledNext) {
      await ctx.scheduler.runAfter(
        BATCH_DELAY_MS,
        internal.migration.backfill_tweet_text.backfillTweetTextBatch,
        { cursor: continueCursor, batchSize: limit },
      );
    } else {
      console.log("[backfill-tweet-text] Backfill complete.");
    }

    const stats: BackfillStats = {
      scanned,
      candidates: page.length,
      patched,
      skipped,
      failed,
      continueCursor,
      scheduledNext,
    };
    console.log("[backfill-tweet-text] batch complete", stats);
    return stats;
  },
});
