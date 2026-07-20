/**
 * bookmarks/mutations.ts — Bookmark write functions.
 * Default runtime (no "use node").
 * Contract §A bookmarks/mutations.ts + §B canonical refs.
 */

import { cancel, type WorkflowId } from "@convex-dev/workflow";
import { ConvexError, v } from "convex/values";
import { components, internal } from "../_generated/api";
import { authMutation, internalMutation } from "../functions";
import {
  throwLimitReached,
  throwNotFound,
  throwValidationError,
} from "../utils/errors";
import { assertSafeHttpUrl, cleanUrl } from "../utils/url";
import {
  assertCanCreateBookmark,
  assertCanRunProcessing,
  shouldSendLimitEmail,
} from "../billing/limits";
import { deriveEffectivePlan, getLimits } from "../billing/plans";
import {
  buildBookmarkDetailDTO,
  type BookmarkDetailDTO,
  type TagInBookmark,
} from "./dto";
import { cleanMetadataForStorage } from "../utils/metadata";
import {
  extractUniqueImportUrls,
  summarizeBulkImport,
  type BulkImportResult,
} from "./bulkImport";
import { reserveLimitOffer } from "../integrations/lifecycle";
import { shouldQueueBookmarkLifecycle } from "../integrations/lumailPolicy";
import { startBookmarkLifecycleSync } from "../integrations/workflows";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const READABLE_BOOKMARK_TYPES = ["ARTICLE", "YOUTUBE"] as const;
const MAX_BOOKMARK_NOTE_LENGTH = 2000;
const MAX_BOOKMARK_TITLE_LENGTH = 500;
const MAX_BOOKMARK_SUMMARY_LENGTH = 5000;

function assertValidBookmarkNote(note: string | null | undefined): void {
  if (typeof note === "string" && note.length > MAX_BOOKMARK_NOTE_LENGTH) {
    throwValidationError(
      `Bookmark note must be ${MAX_BOOKMARK_NOTE_LENGTH} characters or fewer`,
    );
  }
}

function assertValidBookmarkTitle(title: string | undefined): void {
  if (title !== undefined && title.length > MAX_BOOKMARK_TITLE_LENGTH) {
    throwValidationError(
      `Bookmark title must be ${MAX_BOOKMARK_TITLE_LENGTH} characters or fewer`,
    );
  }
}

function assertValidBookmarkSummary(summary: string | undefined): void {
  if (summary !== undefined && summary.length > MAX_BOOKMARK_SUMMARY_LENGTH) {
    throwValidationError(
      `Bookmark summary must be ${MAX_BOOKMARK_SUMMARY_LENGTH} characters or fewer`,
    );
  }
}

function isExpectedBulkImportFailure(error: unknown): boolean {
  if (!(error instanceof ConvexError)) return false;
  const data = error.data as { code?: unknown } | undefined;
  return data?.code === "VALIDATION_ERROR" || data?.code === "LIMIT_REACHED";
}

async function resolveTagsForBookmark(
  ctx: { db: { query: Function; get: Function } },
  bookmarkId: any,
): Promise<TagInBookmark[]> {
  const joinRows = await (ctx.db as any)
    .query("bookmarkTags")
    .withIndex("by_bookmark", (q: any) => q.eq("bookmarkId", bookmarkId))
    .take(200);

  const tags: TagInBookmark[] = [];
  for (const row of joinRows) {
    const tag = await (ctx.db as any).get(row.tagId);
    if (tag) {
      tags.push({
        tag: {
          id: tag._id as string,
          name: tag.name as string,
          type: tag.type as string,
        },
      });
    }
  }
  return tags;
}

async function getDetailDTO(
  ctx: { db: any },
  bookmarkId: any,
): Promise<BookmarkDetailDTO> {
  const doc = await ctx.db.get(bookmarkId);
  if (!doc) throwNotFound("Bookmark not found");

  const tags = await resolveTagsForBookmark(ctx, doc._id);
  const opens = await ctx.db
    .query("bookmarkOpens")
    .withIndex("by_bookmark_user", (q: any) => q.eq("bookmarkId", doc._id))
    .take(10000);

  return buildBookmarkDetailDTO(doc as any, tags, opens.length);
}

/**
 * Bump or create the userCounters row in the same mutation.
 * Exported for reuse (e.g. bookmarks/seed.ts).
 */
export async function bumpBookmarkCount(
  ctx: { db: any },
  userId: string,
  delta: number,
): Promise<number> {
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const counters = await ctx.db
    .query("userCounters")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!counters) {
    const bookmarkCount = Math.max(0, delta);
    await ctx.db.insert("userCounters", {
      userId,
      bookmarkCount,
      monthKey,
      monthlyRuns: 0,
      monthlyChatQueries: 0,
    });
    return bookmarkCount;
  } else {
    const bookmarkCount = Math.max(0, (counters.bookmarkCount ?? 0) + delta);
    await ctx.db.patch(counters._id, {
      bookmarkCount,
    });
    return bookmarkCount;
  }
}

// ---------------------------------------------------------------------------
// create / quickSave (shared core logic)
// ---------------------------------------------------------------------------

async function createBookmarkCore(
  ctx: any,
  userId: string,
  url: string,
  note?: string,
  transcript?: string,
  metadata?: any,
): Promise<BookmarkDetailDTO> {
  // 1. Clean URL.
  const cleanedUrl = assertSafeHttpUrl(cleanUrl(url));
  assertValidBookmarkNote(note);

  // 2. Check limits (total bookmarks + monthly runs).
  await assertCanCreateBookmark(ctx, userId);

  // 3. Dedupe check.
  const existing = await ctx.db
    .query("bookmarks")
    .withIndex("by_user_url", (q: any) =>
      q.eq("userId", userId).eq("url", cleanedUrl),
    )
    .first();

  if (existing) {
    throwValidationError("Bookmark already exists");
  }

  // 4. Keep only bounded provenance metadata. Raw transcripts/content are
  // processed outside the database and must not be persisted in Convex.
  let finalMetadata = cleanMetadataForStorage(metadata);
  if (transcript) {
    finalMetadata = cleanMetadataForStorage({
      ...(finalMetadata ?? {}),
      youtubeTranscript: {
        source: "extension",
        extractedAt: new Date().toISOString(),
        characterCount: transcript.length,
      },
    });
  }

  const now = Date.now();

  // 5. Insert bookmark with PENDING status.
  const bookmarkId = await ctx.db.insert("bookmarks", {
    userId,
    url: cleanedUrl,
    status: "PENDING",
    starred: false,
    read: false,
    note: note ?? undefined,
    metadata: finalMetadata ?? undefined,
    createdAt: now,
    updatedAt: now,
    processingStep: 0,
  });

  // 6. Increment bookmark count (same mutation = atomic).
  const bookmarkCount = await bumpBookmarkCount(ctx, userId, 1);

  // 7. Synchronize lifecycle milestones to Lumail. Workflow V2 owns all email
  // scheduling and delivery; Convex only emits product state changes.
  const sendLimit = await shouldSendLimitEmail(ctx, userId);
  const offerId = sendLimit ? await reserveLimitOffer(ctx, userId) : null;
  if (shouldQueueBookmarkLifecycle(bookmarkCount, offerId !== null)) {
    await startBookmarkLifecycleSync(ctx, {
      userId,
      bookmarkCount,
      ...(offerId ? { offerId } : {}),
    });
  }

  // 8. Schedule pipeline processing.
  await ctx.scheduler.runAfter(0, internal.processing.workflow.kickoff, {
    bookmarkId,
    userId,
  });

  return getDetailDTO(ctx, bookmarkId);
}

// ---------------------------------------------------------------------------
// Public authMutation functions
// ---------------------------------------------------------------------------

export const create = authMutation({
  args: {
    url: v.string(),
    note: v.optional(v.string()),
    transcript: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<BookmarkDetailDTO> => {
    return createBookmarkCore(
      ctx,
      ctx.user.id,
      args.url,
      args.note,
      args.transcript,
      args.metadata,
    );
  },
});

export const createInternal = internalMutation({
  args: {
    userId: v.string(),
    url: v.string(),
    note: v.optional(v.string()),
    transcript: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<BookmarkDetailDTO> => {
    return createBookmarkCore(
      ctx,
      args.userId,
      args.url,
      args.note,
      args.transcript,
      args.metadata,
    );
  },
});

export const quickSave = authMutation({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args): Promise<BookmarkDetailDTO> => {
    return createBookmarkCore(ctx, ctx.user.id, args.url);
  },
});

export const update = authMutation({
  args: {
    id: v.id("bookmarks"),
    patch: v.object({
      title: v.optional(v.string()),
      summary: v.optional(v.string()),
      starred: v.optional(v.boolean()),
      read: v.optional(v.boolean()),
      note: v.optional(v.union(v.string(), v.null())),
      status: v.optional(v.literal("PENDING")),
    }),
  },
  handler: async (ctx, args): Promise<BookmarkDetailDTO> => {
    const userId = ctx.user.id;
    const doc = await ctx.db.get(args.id);

    if (!doc || doc.userId !== userId) {
      throwNotFound("Bookmark not found");
    }

    assertValidBookmarkNote(args.patch.note);
    assertValidBookmarkTitle(args.patch.title);
    assertValidBookmarkSummary(args.patch.summary);

    const updatesGeneratedContent =
      args.patch.title !== undefined || args.patch.summary !== undefined;
    const isProcessing =
      doc.status === "PENDING" ||
      doc.status === "PROCESSING" ||
      args.patch.status === "PENDING";
    if (updatesGeneratedContent && isProcessing) {
      throwValidationError(
        "Bookmark title and summary cannot be edited while processing",
      );
    }

    // Validate read field type guard.
    if (
      args.patch.read !== undefined &&
      !READABLE_BOOKMARK_TYPES.includes(doc.type as any)
    ) {
      throwValidationError("Bookmark does not support read functionality");
    }

    const patchData: Record<string, any> = {
      updatedAt: Date.now(),
    };

    if (args.patch.starred !== undefined)
      patchData.starred = args.patch.starred;
    if (args.patch.read !== undefined) patchData.read = args.patch.read;
    if (args.patch.note !== undefined) patchData.note = args.patch.note;
    if (args.patch.title !== undefined) {
      patchData.title = args.patch.title;
      patchData.searchEmbedding = undefined;
      patchData.embeddingModel = undefined;
    }
    if (args.patch.summary !== undefined)
      patchData.summary = args.patch.summary;

    if (args.patch.status === "PENDING") {
      await assertCanRunProcessing(ctx, userId);
      patchData.status = "PENDING";
      patchData.processingStep = 0;
      patchData.processingError = undefined;
    }

    await ctx.db.patch(args.id, patchData);

    if (args.patch.title !== undefined) {
      await ctx.scheduler.runAfter(
        0,
        internal.processing.embeddings.refreshBookmarkSearchEmbedding,
        { bookmarkId: args.id },
      );
    }

    if (args.patch.status === "PENDING") {
      await ctx.scheduler.runAfter(0, internal.processing.workflow.kickoff, {
        bookmarkId: args.id,
        userId,
      });
    }

    return getDetailDTO(ctx, args.id);
  },
});

export const remove = authMutation({
  args: {
    id: v.id("bookmarks"),
  },
  handler: async (ctx, args): Promise<{ id: typeof args.id }> => {
    const userId = ctx.user.id;
    const doc = await ctx.db.get(args.id);

    if (!doc || doc.userId !== userId) {
      throwNotFound("Bookmark not found");
    }

    // Cancel an in-flight processing workflow so it stops writing to a
    // bookmark that no longer exists.
    if (doc.workflowId) {
      try {
        await cancel(ctx, components.workflow, doc.workflowId as WorkflowId);
      } catch {
        // workflow already finished or was cleaned up
      }
    }

    // Delete bookmarkTags join rows.
    const tagRows = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_bookmark", (q: any) => q.eq("bookmarkId", args.id))
      .take(500);
    for (const row of tagRows) {
      await ctx.db.delete(row._id);
    }

    // Delete bookmarkOpens rows.
    const openRows = await ctx.db
      .query("bookmarkOpens")
      .withIndex("by_bookmark_user", (q: any) => q.eq("bookmarkId", args.id))
      .take(500);
    for (const row of openRows) {
      await ctx.db.delete(row._id);
    }

    // Decrement counter (same mutation = atomic).
    await bumpBookmarkCount(ctx, userId, -1);

    // Schedule R2 cleanup for bookmark files.
    await ctx.scheduler.runAfter(0, internal.files.actions.deleteObjects, {
      keys: [
        `users/${userId}/bookmarks/${args.id}/screenshot.png`,
        `users/${userId}/bookmarks/${args.id}/pdf-screenshot.png`,
        `users/${userId}/bookmarks/${args.id}/og-image.jpg`,
        `users/${userId}/bookmarks/${args.id}/og-image.png`,
        `users/${userId}/bookmarks/${args.id}/og-image.webp`,
        `users/${userId}/bookmarks/${args.id}/favicon.ico`,
        `users/${userId}/bookmarks/${args.id}/favicon.png`,
      ],
    });

    // Delete the bookmark.
    await ctx.db.delete(args.id);

    return { id: args.id };
  },
});

export const setStarred = authMutation({
  args: {
    id: v.id("bookmarks"),
    starred: v.boolean(),
  },
  handler: async (ctx, args): Promise<null> => {
    const userId = ctx.user.id;
    const doc = await ctx.db.get(args.id);

    if (!doc || doc.userId !== userId) {
      throwNotFound("Bookmark not found");
    }

    await ctx.db.patch(args.id, {
      starred: args.starred,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const setRead = authMutation({
  args: {
    id: v.id("bookmarks"),
    read: v.boolean(),
  },
  handler: async (ctx, args): Promise<null> => {
    const userId = ctx.user.id;
    const doc = await ctx.db.get(args.id);

    if (!doc || doc.userId !== userId) {
      throwNotFound("Bookmark not found");
    }

    if (!READABLE_BOOKMARK_TYPES.includes(doc.type as any)) {
      throwValidationError("Bookmark does not support read functionality");
    }

    await ctx.db.patch(args.id, {
      read: args.read,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const recordOpen = authMutation({
  args: {
    id: v.id("bookmarks"),
  },
  handler: async (ctx, args): Promise<null> => {
    const userId = ctx.user.id;
    const doc = await ctx.db.get(args.id);

    if (!doc || doc.userId !== userId) {
      throwNotFound("Bookmark not found");
    }

    await ctx.db.insert("bookmarkOpens", {
      bookmarkId: args.id,
      userId,
      openedAt: Date.now(),
    });
    return null;
  },
});

export const reprocess = authMutation({
  args: {
    id: v.id("bookmarks"),
  },
  handler: async (ctx, args): Promise<null> => {
    const userId = ctx.user.id;
    const doc = await ctx.db.get(args.id);

    if (!doc || doc.userId !== userId) {
      throwNotFound("Bookmark not found");
    }

    await assertCanRunProcessing(ctx, userId);

    await ctx.db.patch(args.id, {
      status: "PENDING",
      processingStep: 0,
      processingError: undefined,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.processing.workflow.kickoff, {
      bookmarkId: args.id,
      userId,
    });

    return null;
  },
});

export const importBulk = authMutation({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args): Promise<BulkImportResult> => {
    const userId = ctx.user.id;
    const urls = extractUniqueImportUrls(args.text);

    let createdBookmarks = 0;
    let failedUrls = 0;
    for (const url of urls) {
      try {
        await createBookmarkCore(ctx, userId, url);
        createdBookmarks += 1;
      } catch (error) {
        // Expected validation/limit failures happen before insert. Unexpected
        // downstream failures must abort the outer mutation so Convex rolls
        // back every write instead of returning a misleading success count.
        if (!isExpectedBulkImportFailure(error)) throw error;
        failedUrls += 1;
        break;
      }
    }

    return summarizeBulkImport({
      totalUrls: urls.length,
      createdBookmarks,
      failedUrls,
    });
  },
});

export const exportCsv = authMutation({
  args: {},
  handler: async (ctx, _args): Promise<string> => {
    const userId = ctx.user.id;

    // Check export permission.
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();

    const plan = deriveEffectivePlan(subscription);
    const dbUser = await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId,
    });
    const metadata = (dbUser as { metadata?: unknown } | null)?.metadata;
    const limits = getLimits(plan, metadata);

    if (!limits.canExport) {
      throwLimitReached("Export requires a Pro plan");
    }

    // Fetch bookmarks (bounded).
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_created", (q: any) => q.eq("userId", userId))
      .take(50000);

    const header = "title,description,summary,type,url\n";
    const rows = bookmarks
      .map((b: any) => {
        const escape = (s: string | undefined | null) =>
          `"${(s ?? "").replace(/"/g, '""')}"`;
        return [
          escape(b.title),
          escape(b.ogDescription),
          escape(b.summary),
          escape(b.type),
          escape(b.url),
        ].join(",");
      })
      .join("\n");

    return header + rows;
  },
});

// ---------------------------------------------------------------------------
// Internal mutations
// ---------------------------------------------------------------------------

export const updatePreview = internalMutation({
  args: {
    id: v.id("bookmarks"),
    userId: v.string(),
    preview: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== args.userId) return null;

    await ctx.db.patch(args.id, {
      preview: args.preview,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updateProcessing = internalMutation({
  args: {
    id: v.id("bookmarks"),
    patch: v.any(),
  },
  handler: async (ctx, args): Promise<null> => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;

    await ctx.db.patch(args.id, {
      ...args.patch,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * insertWelcomeBookmark — inserts a welcome bookmark for new users.
 * Called from auth/hooks.ts onUserCreated via scheduler.
 */
export const insertWelcomeBookmark = internalMutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const now = Date.now();
    const bookmarkId = await ctx.db.insert("bookmarks", {
      userId: args.userId,
      url: "https://saveit.now",
      status: "PENDING",
      starred: false,
      read: false,
      createdAt: now,
      updatedAt: now,
      processingStep: 0,
    });

    // Bump counter.
    await bumpBookmarkCount(ctx, args.userId, 1);

    // Schedule pipeline.
    await ctx.scheduler.runAfter(0, internal.processing.workflow.kickoff, {
      bookmarkId,
      userId: args.userId,
    });

    return null;
  },
});
