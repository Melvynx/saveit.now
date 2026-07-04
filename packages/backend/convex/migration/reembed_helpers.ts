/**
 * migration/reembed_helpers.ts — Default-runtime (no "use node") helpers for
 * the re-embed pass.  The "use node" action in reembed.ts cannot define queries
 * or mutations, so they live here and are called via ctx.runQuery / ctx.runMutation.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  adminMutation,
  adminQuery,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../functions";
import { throwForbidden } from "../utils/errors";

// Keep in sync with processing/embeddings.ts (cannot import "use node" module here).
const CURRENT_EMBEDDING_MODEL_KEY = "gemini-embedding-2:1536";
const CURRENT_EMBEDDING_DIMENSIONS = 1536;
const DEFAULT_INSPECT_LIMIT = 100;
const MAX_INSPECT_LIMIT = 500;
const DEFAULT_BATCH_SIZE = 20;
const MAX_BATCH_SIZE = 50;
const SEARCH_REPAIR_JOB_KIND = "SEARCH_EMBEDDINGS" as const;

const reembedReason = v.union(
  v.literal("missingEmbedding"),
  v.literal("invalidDimensions"),
  v.literal("staleModel"),
);

const reembedJobStatus = v.union(
  v.literal("RUNNING"),
  v.literal("COMPLETED"),
  v.literal("FAILED"),
);

const reembedBacklogResult = v.object({
  currentModel: v.string(),
  currentDimensions: v.number(),
  scanned: v.number(),
  needsEmbedding: v.number(),
  continueCursor: v.union(v.string(), v.null()),
  isDone: v.boolean(),
  sample: v.array(
    v.object({
      id: v.id("bookmarks"),
      title: v.union(v.string(), v.null()),
      reason: reembedReason,
    }),
  ),
});

const reembedJobSummary = v.object({
  id: v.id("searchEmbeddingRepairJobs"),
  status: reembedJobStatus,
  startedByUserId: v.string(),
  batchSize: v.number(),
  scanned: v.number(),
  candidates: v.number(),
  embedded: v.number(),
  skipped: v.number(),
  failed: v.number(),
  currentCursor: v.union(v.string(), v.null()),
  createdAt: v.number(),
  updatedAt: v.number(),
  completedAt: v.union(v.number(), v.null()),
});

type ReembedReason = "missingEmbedding" | "invalidDimensions" | "staleModel";

function assertMigrationAllowed(migrationSecret: string): void {
  if (process.env.ALLOW_MIGRATION !== "true") {
    throwForbidden("Migration not enabled");
  }
  const expectedSecret = process.env.MIGRATION_SECRET;
  if (!expectedSecret || migrationSecret !== expectedSecret) {
    throwForbidden("Migration not authorized");
  }
}

function clampInspectLimit(limit: number | undefined): number {
  const value = limit ?? DEFAULT_INSPECT_LIMIT;
  if (!Number.isFinite(value)) {
    return DEFAULT_INSPECT_LIMIT;
  }
  return Math.min(MAX_INSPECT_LIMIT, Math.max(1, Math.trunc(value)));
}

function clampBatchSize(batchSize: number | undefined): number {
  const value = batchSize ?? DEFAULT_BATCH_SIZE;
  if (!Number.isFinite(value)) {
    return DEFAULT_BATCH_SIZE;
  }
  return Math.min(MAX_BATCH_SIZE, Math.max(1, Math.trunc(value)));
}

function getReembedReason(doc: {
  searchEmbedding?: number[];
  embeddingModel?: string;
}): ReembedReason | null {
  if (!Array.isArray(doc.searchEmbedding) || doc.searchEmbedding.length === 0) {
    return "missingEmbedding";
  }
  if (doc.searchEmbedding.length !== CURRENT_EMBEDDING_DIMENSIONS) {
    return "invalidDimensions";
  }
  if (doc.embeddingModel !== CURRENT_EMBEDDING_MODEL_KEY) {
    return "staleModel";
  }
  return null;
}

async function inspectBacklogPage(
  ctx: { db: any },
  args: { cursor?: string | null; limit?: number },
) {
  const limit = clampInspectLimit(args.limit);

  const paginationResult = await ctx.db
    .query("bookmarks")
    .paginate({ cursor: args.cursor ?? null, numItems: limit });

  const sample = paginationResult.page.flatMap((doc: any) => {
    const reason = getReembedReason(doc);
    if (!reason) return [];
    return [
      {
        id: doc._id,
        title: doc.title ?? null,
        reason,
      },
    ];
  });

  return {
    currentModel: CURRENT_EMBEDDING_MODEL_KEY,
    currentDimensions: CURRENT_EMBEDDING_DIMENSIONS,
    scanned: paginationResult.page.length,
    needsEmbedding: sample.length,
    continueCursor: paginationResult.isDone
      ? null
      : paginationResult.continueCursor,
    isDone: paginationResult.isDone,
    sample,
  };
}

function toJobSummary(
  job: {
    _id: any;
    status: "RUNNING" | "COMPLETED" | "FAILED";
    startedByUserId: string;
    batchSize: number;
    scanned: number;
    candidates: number;
    embedded: number;
    skipped: number;
    failed: number;
    currentCursor?: string;
    createdAt: number;
    updatedAt: number;
    completedAt?: number;
  } | null,
) {
  if (!job) return null;
  return {
    id: job._id,
    status: job.status,
    startedByUserId: job.startedByUserId,
    batchSize: job.batchSize,
    scanned: job.scanned,
    candidates: job.candidates,
    embedded: job.embedded,
    skipped: job.skipped,
    failed: job.failed,
    currentCursor: job.currentCursor ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt ?? null,
  };
}

async function getRunningRepairJob(ctx: { db: any }) {
  return await ctx.db
    .query("searchEmbeddingRepairJobs")
    .withIndex("by_kind_status_created", (q: any) =>
      q.eq("kind", SEARCH_REPAIR_JOB_KIND).eq("status", "RUNNING"),
    )
    .order("desc")
    .first();
}

async function getLatestRepairJob(ctx: { db: any }) {
  return await ctx.db
    .query("searchEmbeddingRepairJobs")
    .withIndex("by_kind_created", (q: any) =>
      q.eq("kind", SEARCH_REPAIR_JOB_KIND),
    )
    .order("desc")
    .first();
}

async function createRepairJob(
  ctx: { db: any },
  args: { startedByUserId: string; batchSize: number },
) {
  const now = Date.now();
  return await ctx.db.insert("searchEmbeddingRepairJobs", {
    kind: SEARCH_REPAIR_JOB_KIND,
    startedByUserId: args.startedByUserId,
    status: "RUNNING",
    batchSize: args.batchSize,
    scanned: 0,
    candidates: 0,
    embedded: 0,
    skipped: 0,
    failed: 0,
    createdAt: now,
    updatedAt: now,
  });
}

function buildReembedBatchArgs(args: {
  cursor: string | null;
  batchSize: number;
  jobId?: any;
}) {
  return args.jobId === undefined
    ? { cursor: args.cursor, batchSize: args.batchSize }
    : { cursor: args.cursor, batchSize: args.batchSize, jobId: args.jobId };
}

/**
 * startReembed — public, ALLOW_MIGRATION-gated. Schedules the first reembedBatch.
 * Call from the migration script after all data is imported.
 */
export const startReembed = mutation({
  args: {
    migrationSecret: v.string(),
    batchSize: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { migrationSecret, batchSize }) => {
    assertMigrationAllowed(migrationSecret);
    const clampedBatchSize = clampBatchSize(batchSize);
    const runningJob = await getRunningRepairJob(ctx);
    if (runningJob) {
      console.log("[reembed] Repair job is already running.");
      return null;
    }

    const jobId = await createRepairJob(ctx, {
      startedByUserId: "migration",
      batchSize: clampedBatchSize,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.migration.reembed.reembedBatch,
      buildReembedBatchArgs({
        cursor: null,
        batchSize: clampedBatchSize,
        jobId,
      }),
    );
    console.log("[reembed] Scheduled first reembedBatch.");
    return null;
  },
});

// ---------------------------------------------------------------------------
// getSearchReembedAdminStatus
// ---------------------------------------------------------------------------

export const getSearchReembedAdminStatus = adminQuery({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    backlog: reembedBacklogResult,
    latestJob: v.union(reembedJobSummary, v.null()),
    hasRunningJob: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const [backlog, latestJob, runningJob] = await Promise.all([
      inspectBacklogPage(ctx, args),
      getLatestRepairJob(ctx),
      getRunningRepairJob(ctx),
    ]);

    return {
      backlog,
      latestJob: toJobSummary(latestJob),
      hasRunningJob: runningJob !== null,
    };
  },
});

// ---------------------------------------------------------------------------
// startReembedAdmin
// ---------------------------------------------------------------------------

export const startReembedAdmin = adminMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    scheduled: v.boolean(),
    alreadyRunning: v.boolean(),
    jobId: v.id("searchEmbeddingRepairJobs"),
    batchSize: v.number(),
  }),
  handler: async (ctx, { batchSize }) => {
    const runningJob = await getRunningRepairJob(ctx);
    if (runningJob) {
      return {
        scheduled: false,
        alreadyRunning: true,
        jobId: runningJob._id,
        batchSize: runningJob.batchSize,
      };
    }

    const clampedBatchSize = clampBatchSize(batchSize);
    const jobId = await createRepairJob(ctx, {
      startedByUserId: ctx.user.id,
      batchSize: clampedBatchSize,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.migration.reembed.reembedBatch,
      buildReembedBatchArgs({
        cursor: null,
        batchSize: clampedBatchSize,
        jobId,
      }),
    );

    return {
      scheduled: true,
      alreadyRunning: false,
      jobId,
      batchSize: clampedBatchSize,
    };
  },
});

// ---------------------------------------------------------------------------
// inspectReembedBacklog
// ---------------------------------------------------------------------------

/**
 * inspectReembedBacklog — public, ALLOW_MIGRATION-gated dry-run helper.
 * Scans one page and reports bookmarks that would be repaired by startReembed.
 */
export const inspectReembedBacklog = query({
  args: {
    migrationSecret: v.string(),
    cursor: v.optional(v.union(v.string(), v.null())),
    limit: v.optional(v.number()),
  },
  returns: reembedBacklogResult,
  handler: async (ctx, args) => {
    assertMigrationAllowed(args.migrationSecret);
    return await inspectBacklogPage(ctx, args);
  },
});

// ---------------------------------------------------------------------------
// pageNeedingEmbedding
// ---------------------------------------------------------------------------

/**
 * pageNeedingEmbedding — returns a page of bookmarks whose search embedding is
 * missing, has the wrong dimensions, or was generated with an old model key.
 *
 * Paginates the full bookmarks table by _creationTime (no userId filter) and
 * post-filters by repair reason. The action must call this repeatedly until
 * isDone is true.
 *
 * Returns: { page, continueCursor, isDone }
 *   page: array of { id, title, vectorSummary, summary }
 */
export const pageNeedingEmbedding = internalQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
    limit: v.number(),
  },
  returns: v.object({
    page: v.array(
      v.object({
        id: v.id("bookmarks"),
        title: v.union(v.string(), v.null()),
        vectorSummary: v.union(v.string(), v.null()),
        summary: v.union(v.string(), v.null()),
        reason: reembedReason,
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

    // Post-filter: only rows whose semantic-search index payload is missing,
    // malformed, or generated with an older model key.
    const needsEmbed = paginationResult.page.flatMap((doc) => {
      const reason = getReembedReason(doc);
      if (!reason) return [];
      return [{ doc, reason }];
    });

    return {
      page: needsEmbed.map(({ doc, reason }) => ({
        id: doc._id,
        title: doc.title ?? null,
        vectorSummary: doc.vectorSummary ?? null,
        summary: doc.summary ?? null,
        reason,
      })),
      continueCursor: paginationResult.isDone
        ? null
        : paginationResult.continueCursor,
      isDone: paginationResult.isDone,
      scanned: paginationResult.page.length,
    };
  },
});

// ---------------------------------------------------------------------------
// getBookmarksForReembed
// ---------------------------------------------------------------------------

/**
 * getBookmarksForReembed — fetches exact bookmark IDs for targeted delta
 * embedding. Used by the Node action in reembed.ts so delta imports do not scan
 * the full bookmarks table.
 */
export const getBookmarksForReembed = internalQuery({
  args: {
    ids: v.array(v.id("bookmarks")),
  },
  returns: v.array(
    v.object({
      id: v.id("bookmarks"),
      title: v.union(v.string(), v.null()),
      vectorSummary: v.union(v.string(), v.null()),
      summary: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, { ids }) => {
    const docs = await Promise.all(ids.map((id) => ctx.db.get(id)));
    return docs.flatMap((doc) =>
      doc
        ? [
            {
              id: doc._id,
              title: doc.title ?? null,
              vectorSummary: doc.vectorSummary ?? null,
              summary: doc.summary ?? null,
            },
          ]
        : [],
    );
  },
});

// ---------------------------------------------------------------------------
// patchEmbedding
// ---------------------------------------------------------------------------

/**
 * patchEmbedding — patches searchEmbedding + embeddingModel on a single bookmark.
 * Called from the "use node" reembedBatch action via ctx.runMutation.
 */
export const patchEmbedding = internalMutation({
  args: {
    id: v.id("bookmarks"),
    embedding: v.array(v.float64()),
    model: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { id, embedding, model }) => {
    await ctx.db.patch(id, {
      searchEmbedding: embedding,
      embeddingModel: model,
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// recordReembedBatchStats
// ---------------------------------------------------------------------------

export const recordReembedBatchStats = internalMutation({
  args: {
    jobId: v.id("searchEmbeddingRepairJobs"),
    scanned: v.number(),
    candidates: v.number(),
    embedded: v.number(),
    skipped: v.number(),
    failed: v.number(),
    continueCursor: v.union(v.string(), v.null()),
    scheduledNext: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;

    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      scanned: job.scanned + args.scanned,
      candidates: job.candidates + args.candidates,
      embedded: job.embedded + args.embedded,
      skipped: job.skipped + args.skipped,
      failed: job.failed + args.failed,
      currentCursor: args.continueCursor ?? undefined,
      status: args.scheduledNext ? "RUNNING" : "COMPLETED",
      updatedAt: now,
      completedAt: args.scheduledNext ? undefined : now,
    });
    return null;
  },
});
