/**
 * bookmarks/mutations.ts — Bookmark write functions.
 * Default runtime (no "use node").
 * Contract §A bookmarks/mutations.ts + §B canonical refs.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  authMutation,
  internalMutation,
} from "../functions";
import {
  throwLimitReached,
  throwNotFound,
  throwValidationError,
} from "../utils/errors";
import { cleanUrl } from "../utils/url";
import {
  assertCanCreateBookmark,
  assertCanRunProcessing,
  shouldSendLimitEmail,
} from "../billing/limits";
import {
  getLimits,
  isActiveSubscriptionStatus,
} from "../billing/plans";
import {
  buildBookmarkDetailDTO,
  type BookmarkDetailDTO,
  type TagInBookmark,
} from "./dto";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const READABLE_BOOKMARK_TYPES = ["ARTICLE", "YOUTUBE"] as const;

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
 */
async function bumpBookmarkCount(
  ctx: { db: any },
  userId: string,
  delta: number,
): Promise<void> {
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const counters = await ctx.db
    .query("userCounters")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!counters) {
    await ctx.db.insert("userCounters", {
      userId,
      bookmarkCount: Math.max(0, delta),
      monthKey,
      monthlyRuns: 0,
      monthlyChatQueries: 0,
    });
  } else {
    await ctx.db.patch(counters._id, {
      bookmarkCount: Math.max(0, (counters.bookmarkCount ?? 0) + delta),
    });
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
  const cleanedUrl = cleanUrl(url);

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

  // 4. Merge transcript into metadata if present.
  let finalMetadata = metadata ?? null;
  if (transcript) {
    finalMetadata = {
      ...(finalMetadata ?? {}),
      transcript,
      transcriptSource: "extension",
      transcriptExtractedAt: new Date().toISOString(),
    };
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
  await bumpBookmarkCount(ctx, userId, 1);

  // 7. Check if we should send the limit email (fire-and-forget drip).
  const sendLimit = await shouldSendLimitEmail(ctx, userId);
  if (sendLimit) {
    await ctx.scheduler.runAfter(
      0,
      internal.marketing.limitReached.startLimitReachedDrip,
      { userId },
    );
  }

  // 8. Schedule pipeline processing.
  await ctx.scheduler.runAfter(
    0,
    internal.processing.pipeline.run,
    { bookmarkId, userId },
  );

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

    if (args.patch.starred !== undefined) patchData.starred = args.patch.starred;
    if (args.patch.read !== undefined) patchData.read = args.patch.read;
    if (args.patch.note !== undefined) patchData.note = args.patch.note;

    if (args.patch.status === "PENDING") {
      await assertCanRunProcessing(ctx, userId);
      patchData.status = "PENDING";
      patchData.processingStep = 0;
      patchData.processingError = undefined;
    }

    await ctx.db.patch(args.id, patchData);

    if (args.patch.status === "PENDING") {
      await ctx.scheduler.runAfter(
        0,
        internal.processing.pipeline.run,
        { bookmarkId: args.id, userId },
      );
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
      .withIndex("by_bookmark_user", (q: any) =>
        q.eq("bookmarkId", args.id),
      )
      .take(500);
    for (const row of openRows) {
      await ctx.db.delete(row._id);
    }

    // Decrement counter (same mutation = atomic).
    await bumpBookmarkCount(ctx, userId, -1);

    // Schedule R2 cleanup for bookmark files.
    await ctx.scheduler.runAfter(
      0,
      internal.files.actions.deleteObjects,
      {
        keys: [
          `users/${userId}/bookmarks/${args.id}/screenshot.png`,
          `users/${userId}/bookmarks/${args.id}/pdf-screenshot.png`,
          `users/${userId}/bookmarks/${args.id}/og-image.jpg`,
          `users/${userId}/bookmarks/${args.id}/og-image.png`,
          `users/${userId}/bookmarks/${args.id}/og-image.webp`,
          `users/${userId}/bookmarks/${args.id}/favicon.ico`,
          `users/${userId}/bookmarks/${args.id}/favicon.png`,
        ],
      },
    );

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

    await ctx.scheduler.runAfter(
      0,
      internal.processing.pipeline.run,
      { bookmarkId: args.id, userId },
    );

    return null;
  },
});

export const importBulk = authMutation({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args): Promise<null> => {
    const userId = ctx.user.id;

    // Extract URLs from text.
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
    const urls = Array.from(new Set(args.text.match(urlRegex) ?? []));

    for (const url of urls) {
      try {
        await createBookmarkCore(ctx, userId, url);
      } catch {
        // Skip duplicates and limit errors silently for bulk import.
        break;
      }
    }

    return null;
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

    const plan =
      subscription &&
      isActiveSubscriptionStatus(subscription.status)
        ? "pro"
        : "free";
    const limits = getLimits(plan);

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
    await ctx.scheduler.runAfter(
      0,
      internal.processing.pipeline.run,
      { bookmarkId, userId: args.userId },
    );

    return null;
  },
});
