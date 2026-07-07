/**
 * processing/workflow.ts — durable bookmark-processing workflow.
 *
 * Replaces the monolithic pipeline action with a @convex-dev/workflow
 * definition: every phase is a journaled step that survives restarts and
 * retries independently (the Convex equivalent of the old Inngest job).
 *
 * Flow:
 *   check-limits → get-bookmark → find-duplicate
 *     → route (tweet / youtube / scrape-and-classify)
 *     → type handler (Node action, retried)
 *     → finish
 *
 * `processingStep` is patched between steps so the pending card animates
 * live. Errors and cancellations land in `onComplete` instead of a giant
 * try/catch. The workflow handler runs in the default V8 runtime — all
 * Node work lives in processing/steps.ts actions.
 */

import {
  cancel,
  cleanup,
  defineWorkflow,
  start,
  vResultValidator,
  vWorkflowId,
  type WorkflowId,
} from "@convex-dev/workflow";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { STEP, errorMessage, getYouTubeVideoId, isTweetUrl } from "./detect";
import { failProcessing } from "./runs";

const RETRY = { maxAttempts: 3, initialBackoffMs: 1000, base: 2 };

export const processBookmark = defineWorkflow(components.workflow, {
  args: {
    bookmarkId: v.id("bookmarks"),
    userId: v.string(),
  },
  workpoolOptions: {
    retryActionsByDefault: true,
    defaultRetryBehavior: RETRY,
  },
}).handler(async (step, { bookmarkId, userId }): Promise<null> => {
  // ── check-limits — enforce the plan's processing quota before any write ──
  try {
    await step.runMutation(
      internal.billing.limits.assertCanRunProcessingMutation,
      { userId },
      { name: "check-limits" },
    );
  } catch (err) {
    await step.runMutation(
      internal.processing.runs.fail,
      {
        bookmarkId,
        error: `Limit exceeded: ${errorMessage(err, "Processing limit exceeded")}`,
      },
      { name: "fail-limit" },
    );
    return null;
  }

  // ── get-bookmark — load the document and open a processing run ──
  const bookmark = await step.runQuery(
    internal.processing.runs.getForProcessing,
    { bookmarkId, userId },
    { name: "get-bookmark" },
  );
  if (!bookmark) return null; // deleted before processing started

  await step.runMutation(
    internal.processing.runs.start,
    { bookmarkId, userId },
    { name: "start-run" },
  );

  // ── find-duplicate — reuse data from an existing READY bookmark ──
  const youtubeId = getYouTubeVideoId(bookmark.url);
  const duplicateId = await step.runQuery(
    internal.processing.runs.findReadyByUrl,
    { url: bookmark.url, bookmarkId, userId, youtubeId: youtubeId ?? undefined },
    { name: "find-duplicate" },
  );
  if (duplicateId) {
    await step.runMutation(
      internal.processing.runs.patchStep,
      { bookmarkId, step: STEP.saving },
      { name: "step-saving" },
    );
    await step.runMutation(
      internal.processing.runs.copyFromDuplicate,
      { targetId: bookmarkId, sourceId: duplicateId },
      { name: "copy-duplicate" },
    );
    await step.runMutation(
      internal.processing.runs.finish,
      { bookmarkId },
      { name: "finish" },
    );
    return null;
  }

  // ── tweet / youtube — URL-routed types need no scraping pass ──
  if (isTweetUrl(bookmark.url)) {
    await step.runMutation(
      internal.processing.runs.patchStep,
      { bookmarkId, step: STEP.getTweet },
      { name: "step-get-tweet" },
    );
    await step.runAction(
      internal.processing.steps.processTweet,
      { bookmarkId, userId },
      { name: "process-tweet" },
    );
    await step.runMutation(
      internal.processing.runs.finish,
      { bookmarkId },
      { name: "finish" },
    );
    return null;
  }

  if (youtubeId) {
    await step.runMutation(
      internal.processing.runs.patchStep,
      { bookmarkId, step: STEP.transcriptVideo },
      { name: "step-transcript-video" },
    );
    await step.runAction(
      internal.processing.steps.processYouTube,
      { bookmarkId, userId },
      { name: "process-youtube" },
    );
    await step.runMutation(
      internal.processing.runs.finish,
      { bookmarkId },
      { name: "finish" },
    );
    return null;
  }

  // ── scrape-and-classify — fetch the URL and detect the bookmark type ──
  await step.runMutation(
    internal.processing.runs.patchStep,
    { bookmarkId, step: STEP.scrapContent },
    { name: "step-scrap-content" },
  );
  const route = await step.runAction(
    internal.processing.steps.analyzeUrl,
    { url: bookmark.url },
    { name: "analyze-url" },
  );

  if (route === "FETCH_FAILED") {
    await step.runMutation(
      internal.processing.runs.markFetchFailed,
      { bookmarkId },
      { name: "mark-fetch-failed" },
    );
    await step.runMutation(
      internal.processing.runs.finish,
      { bookmarkId },
      { name: "finish" },
    );
    return null;
  }

  // ── process — type handler (scrape, AI metadata/summary/tags, screenshot,
  //    embeddings); persists its own result to keep the journal small ──
  await step.runAction(
    internal.processing.steps.processByRoute,
    { bookmarkId, userId, route },
    { name: `process-${route.toLowerCase()}` },
  );

  await step.runMutation(
    internal.processing.runs.finish,
    { bookmarkId },
    { name: "finish" },
  );
  return null;
});

/**
 * kickoff — single entry point used by every caller (create, retry,
 * extension upload, Stripe upgrade re-run). Starts the workflow and stores
 * its id on the bookmark so deletion can cancel an in-flight run.
 */
export const kickoff = internalMutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { bookmarkId, userId }) => {
    const bookmark = await ctx.db.get(bookmarkId);
    if (!bookmark || bookmark.userId !== userId) return null;

    // Re-processing: stop and discard the previous run's journal first.
    if (bookmark.workflowId) {
      const previousId = bookmark.workflowId as WorkflowId;
      try {
        await cancel(ctx, components.workflow, previousId);
      } catch {
        // previous workflow already finished or was cleaned up
      }
      try {
        await cleanup(ctx, components.workflow, previousId);
      } catch {
        // nothing to clean
      }
    }

    const workflowId: string = await start(
      ctx,
      internal.processing.workflow.processBookmark,
      { bookmarkId, userId },
      {
        onComplete: internal.processing.workflow.onComplete,
        context: { bookmarkId },
        startAsync: true,
      },
    );

    await ctx.db.patch(bookmarkId, { workflowId });
    return null;
  },
});

/**
 * onComplete — terminal handler for every workflow outcome.
 * Success cleans up the journal; failed runs keep theirs so `restart`
 * can replay from the failing step while debugging.
 */
export const onComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.object({ bookmarkId: v.id("bookmarks") }),
  },
  returns: v.null(),
  handler: async (ctx, { workflowId, result, context }) => {
    const bookmark = await ctx.db.get(context.bookmarkId);

    if (result.kind === "success") {
      await cleanup(ctx, components.workflow, workflowId);
      return null;
    }

    if (!bookmark) return null; // bookmark deleted mid-run — nothing to report

    // A newer run owns this bookmark (kickoff cancels the previous workflow
    // and starts a fresh one) — don't clobber the new run's state.
    if (bookmark.workflowId !== workflowId) return null;

    if (result.kind === "failed") {
      await failProcessing(ctx, context.bookmarkId, result.error);
    } else if (
      result.kind === "canceled" &&
      (bookmark.status === "PENDING" || bookmark.status === "PROCESSING")
    ) {
      await failProcessing(ctx, context.bookmarkId, "Processing was canceled");
    }
    return null;
  },
});
