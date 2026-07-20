import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation, internalQuery } from "../_generated/server";
import { cleanMetadataForStorage } from "../utils/metadata";

// Embedding model key constant (duplicated here to avoid importing from "use node" module)
const EMBEDDING_MODEL_KEY = "gemini-embedding-2:1536";

/**
 * getForProcessing — minimal lookup for the workflow's get-bookmark step.
 * Returns only what routing needs so the workflow journal stays small.
 */
export const getForProcessing = internalQuery({
  args: {
    bookmarkId: v.id("bookmarks"),
    userId: v.string(),
  },
  returns: v.union(v.object({ url: v.string() }), v.null()),
  handler: async (ctx, { bookmarkId, userId }) => {
    const bookmark = await ctx.db.get(bookmarkId);
    if (!bookmark || bookmark.userId !== userId) return null;
    return { url: bookmark.url };
  },
});

/**
 * Snapshot the fields that define a bookmark's semantic-search document.
 * The refresh mutation compares this snapshot before applying its result so
 * an older embedding can never overwrite a newer title or vector summary.
 */
export const getForEmbeddingRefresh = internalQuery({
  args: {
    bookmarkId: v.id("bookmarks"),
  },
  returns: v.union(
    v.object({
      title: v.union(v.string(), v.null()),
      vectorSummary: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, { bookmarkId }) => {
    const bookmark = await ctx.db.get(bookmarkId);
    if (!bookmark) return null;

    return {
      title: bookmark.title ?? null,
      vectorSummary: bookmark.vectorSummary ?? null,
    };
  },
});

export const applyRefreshedEmbedding = internalMutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    expectedTitle: v.union(v.string(), v.null()),
    expectedVectorSummary: v.union(v.string(), v.null()),
    searchEmbedding: v.array(v.float64()),
    embeddingModel: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark) return false;

    if (
      (bookmark.title ?? null) !== args.expectedTitle ||
      (bookmark.vectorSummary ?? null) !== args.expectedVectorSummary
    ) {
      return false;
    }

    await ctx.db.patch(args.bookmarkId, {
      searchEmbedding: args.searchEmbedding,
      embeddingModel: args.embeddingModel,
    });
    return true;
  },
});

/**
 * start — set bookmark status=PROCESSING, insert bookmarkProcessingRun (STARTED).
 * Guards: bookmark must exist, userId must match, status must not already be PROCESSING.
 */
export const start = internalMutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    userId: v.string(),
  },
  returns: v.id("bookmarkProcessingRuns"),
  handler: async (ctx, { bookmarkId, userId }) => {
    const bookmark = await ctx.db.get(bookmarkId);
    if (!bookmark) {
      throw new Error("Bookmark not found");
    }
    if (bookmark.userId !== userId) {
      throw new Error("Ownership check failed");
    }
    // Idempotency guard: don't re-start already-processing bookmarks
    if (bookmark.status === "PROCESSING") {
      // Return the most recent processing run for this bookmark
      const existingRun = await ctx.db
        .query("bookmarkProcessingRuns")
        .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmarkId))
        .order("desc")
        .first();
      if (existingRun) return existingRun._id;
    }

    await ctx.db.patch(bookmarkId, {
      status: "PROCESSING",
      processingStep: 1, // get-bookmark
      processingError: undefined,
    });

    const runId = await ctx.db.insert("bookmarkProcessingRuns", {
      bookmarkId,
      userId,
      status: "STARTED",
      startedAt: Date.now(),
    });

    return runId;
  },
});

/**
 * finish — set bookmark status=READY, mark processingRun COMPLETED.
 */
export const finish = internalMutation({
  args: {
    bookmarkId: v.id("bookmarks"),
  },
  returns: v.null(),
  handler: async (ctx, { bookmarkId }) => {
    await ctx.db.patch(bookmarkId, {
      status: "READY",
      processingStep: 8, // finish
    });

    // Mark the most recent processing run as COMPLETED
    const run = await ctx.db
      .query("bookmarkProcessingRuns")
      .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmarkId))
      .order("desc")
      .first();

    if (run && run.status === "STARTED") {
      await ctx.db.patch(run._id, {
        status: "COMPLETED",
        completedAt: Date.now(),
      });
    }
    return null;
  },
});

/**
 * failProcessing — set bookmark status=ERROR, mark processingRun FAILED.
 * Tolerates a deleted bookmark (the workflow onComplete callback can fire
 * after the user removed it).
 */
export async function failProcessing(
  ctx: MutationCtx,
  bookmarkId: Id<"bookmarks">,
  error: string,
): Promise<void> {
  const bookmark = await ctx.db.get(bookmarkId);
  if (bookmark) {
    await ctx.db.patch(bookmarkId, {
      status: "ERROR",
      processingError: error,
    });
  }

  // Mark the most recent processing run as FAILED
  const run = await ctx.db
    .query("bookmarkProcessingRuns")
    .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmarkId))
    .order("desc")
    .first();

  if (run && run.status === "STARTED") {
    await ctx.db.patch(run._id, {
      status: "FAILED",
      failureReason: error,
      completedAt: Date.now(),
    });
  }
}

/**
 * fail — internalMutation wrapper around failProcessing.
 */
export const fail = internalMutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { bookmarkId, error }) => {
    await failProcessing(ctx, bookmarkId, error);
    return null;
  },
});

/**
 * markFetchFailed — minimal READY bookmark when the URL can't be fetched
 * (same behavior as the legacy Inngest job: fallback title, no preview).
 */
export const markFetchFailed = internalMutation({
  args: {
    bookmarkId: v.id("bookmarks"),
  },
  returns: v.null(),
  handler: async (ctx, { bookmarkId }) => {
    const bookmark = await ctx.db.get(bookmarkId);
    if (!bookmark) return null;

    const urlObj = new URL(bookmark.url);
    await ctx.db.patch(bookmarkId, {
      status: "READY",
      type: "PAGE",
      title: urlObj.hostname + urlObj.pathname,
      metadata: {
        fetchFailed: true,
        fetchError: "Could not retrieve content from URL",
      },
    });
    return null;
  },
});

/**
 * patchStep — update processingStep for reactive UI progress.
 */
export const patchStep = internalMutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    step: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { bookmarkId, step }) => {
    await ctx.db.patch(bookmarkId, { processingStep: step });
    return null;
  },
});

/**
 * applyResult — patch bookmark with type-handler result fields.
 * Does NOT set status to READY — finish() handles that.
 * Handlers return `null` for absent values (e.g. no favicon found); the
 * schema uses v.optional(...), so nulls map to undefined (field removed).
 */
export const applyResult = internalMutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    fields: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, { bookmarkId, fields }) => {
    const existing = await ctx.db.get(bookmarkId);
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      fields as Record<string, unknown>,
    )) {
      if (key === "preview" && (value === null || value === undefined)) {
        if (existing?.preview) continue;
      }
      if (key === "metadata") {
        patch[key] =
          value === null || value === undefined
            ? undefined
            : (cleanMetadataForStorage(value) ?? undefined);
        continue;
      }
      patch[key] = value === null ? undefined : value;
    }
    await ctx.db.patch(bookmarkId, patch);
    return null;
  },
});

/**
 * copyFromDuplicate — copy all relevant fields + tags from source to target bookmark.
 * Sets target status=READY and marks processing run COMPLETED.
 */
export const copyFromDuplicate = internalMutation({
  args: {
    targetId: v.id("bookmarks"),
    sourceId: v.id("bookmarks"),
  },
  returns: v.null(),
  handler: async (ctx, { targetId, sourceId }) => {
    const source = await ctx.db.get(sourceId);
    if (!source) {
      throw new Error("Source bookmark not found");
    }
    if (source.status !== "READY") {
      throw new Error("Source bookmark is not READY");
    }

    // Build existing metadata to preserve dataCopiedFrom
    const existingTarget = await ctx.db.get(targetId);
    const existingMetadata =
      existingTarget?.metadata &&
      typeof existingTarget.metadata === "object" &&
      !Array.isArray(existingTarget.metadata)
        ? (existingTarget.metadata as Record<string, unknown>)
        : {};

    await ctx.db.patch(targetId, {
      type: source.type,
      title: source.title,
      summary: source.summary,
      vectorSummary: source.vectorSummary,
      preview: source.preview,
      faviconUrl: source.faviconUrl,
      ogImageUrl: source.ogImageUrl,
      ogDescription: source.ogDescription,
      imageDescription: source.imageDescription,
      searchEmbedding: source.searchEmbedding,
      embeddingModel: source.embeddingModel,
      status: "READY",
      metadata: {
        ...existingMetadata,
        dataCopiedFrom: sourceId,
      },
    });

    // Copy tags: insert bookmarkTags for all tags from source
    const sourceTags = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_bookmark", (q) => q.eq("bookmarkId", sourceId))
      .collect();

    // Get target's existing tags to avoid duplicates
    const targetExistingTags = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_bookmark", (q) => q.eq("bookmarkId", targetId))
      .collect();

    const targetTagIds = new Set(
      targetExistingTags.map((t) => t.tagId.toString()),
    );

    // Get target bookmark userId (already fetched above)
    const targetUserId = existingTarget?.userId ?? source.userId;

    for (const sourceTag of sourceTags) {
      if (!targetTagIds.has(sourceTag.tagId.toString())) {
        await ctx.db.insert("bookmarkTags", {
          bookmarkId: targetId,
          tagId: sourceTag.tagId,
          userId: targetUserId,
        });
      }
    }

    // Mark the most recent processing run as COMPLETED
    const run = await ctx.db
      .query("bookmarkProcessingRuns")
      .withIndex("by_bookmark", (q) => q.eq("bookmarkId", targetId))
      .order("desc")
      .first();

    if (run && run.status === "STARTED") {
      await ctx.db.patch(run._id, {
        status: "COMPLETED",
        completedAt: Date.now(),
      });
    }

    return null;
  },
});

/**
 * findReadyByUrl — internalQuery for deduplication.
 * Returns a READY bookmark with the current embedding model at the same URL,
 * excluding bookmarkId itself.
 */
export const findReadyByUrl = internalQuery({
  args: {
    url: v.string(),
    bookmarkId: v.id("bookmarks"),
    userId: v.string(),
    youtubeId: v.optional(v.string()),
  },
  returns: v.union(v.id("bookmarks"), v.null()),
  handler: async (ctx, { url, bookmarkId, userId, youtubeId }) => {
    const isTweet =
      url.includes("twitter.com") || url.startsWith("https://x.com/");
    const isYouTube =
      youtubeId !== undefined &&
      (url.includes("youtube.com") || url.includes("youtu.be"));

    if (isTweet || isYouTube) {
      // For tweets/YouTube: exact URL match within same user
      const candidates = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_url", (q) => q.eq("userId", userId).eq("url", url))
        .collect();

      const match = candidates.find(
        (b) =>
          b._id !== bookmarkId &&
          b.status === "READY" &&
          b.embeddingModel === EMBEDDING_MODEL_KEY,
      );

      return match?._id ?? null;
    }

    // For other URLs: match within same user + URL, with 1-month age window for PAGE type
    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const candidates = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_url", (q) => q.eq("userId", userId).eq("url", url))
      .collect();

    const match = candidates.find((b) => {
      if (b._id === bookmarkId) return false;
      if (b.status !== "READY") return false;
      if (b.embeddingModel !== EMBEDDING_MODEL_KEY) return false;
      // For PAGE type, apply 1-month age restriction
      if (b.type === "PAGE" && b.createdAt < oneMonthAgo) return false;
      return true;
    });

    return match?._id ?? null;
  },
});
