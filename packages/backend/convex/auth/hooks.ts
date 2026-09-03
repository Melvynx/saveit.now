import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { startNewUserSync } from "../integrations/workflows";

/**
 * Fired after a Better Auth user row is created (scheduled from
 * `databaseHooks.user.create.after`). Parity with SaveIt's current
 * `onUserCreate`:
 *   1. ensure a Stripe customer (Phase 09)
 *   2. synchronize the user into Lumail marketing automation
 *
 * Each downstream piece is scheduled defensively so a missing integration
 * never blocks sign-up.
 */
export const onUserCreated = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    try {
      await ctx.scheduler.runAfter(0, internal.stripe.actions.ensureCustomer, {
        userId,
      });
    } catch (error) {
      console.warn("[hooks.onUserCreated] ensureCustomer skipped", error);
    }

    try {
      await startNewUserSync(ctx, { userId });
    } catch (error) {
      console.warn("[hooks.onUserCreated] Lumail sync skipped", error);
    }

    return null;
  },
});

const WIPE_BATCH_SIZE = 40;

/**
 * Best-effort GDPR wipe after Better Auth deletes the user row. Convex has no
 * foreign keys, so leftover bookmarks would otherwise stay queryable by userId.
 * Self-reschedules while a batch still fills.
 */
export const wipeDeletedUserData = internalMutation({
  args: { userId: v.string() },
  returns: v.object({ hasMore: v.boolean() }),
  handler: async (ctx, { userId }) => {
    let hasMore = false;

    const deleteRows = async (
      rows: Array<{ _id: Parameters<typeof ctx.db.delete>[0] }>,
    ) => {
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
      return rows.length >= WIPE_BATCH_SIZE;
    };

    hasMore =
      (await deleteRows(
        await ctx.db
          .query("bookmarkTags")
          .withIndex("by_user_tag", (q) => q.eq("userId", userId))
          .take(WIPE_BATCH_SIZE),
      )) || hasMore;
    hasMore =
      (await deleteRows(
        await ctx.db
          .query("bookmarkOpens")
          .withIndex("by_user_opened", (q) => q.eq("userId", userId))
          .take(WIPE_BATCH_SIZE),
      )) || hasMore;
    hasMore =
      (await deleteRows(
        await ctx.db
          .query("bookmarkProcessingRuns")
          .withIndex("by_user_started", (q) => q.eq("userId", userId))
          .take(WIPE_BATCH_SIZE),
      )) || hasMore;
    hasMore =
      (await deleteRows(
        await ctx.db
          .query("bookmarks")
          .withIndex("by_user_created", (q) => q.eq("userId", userId))
          .take(WIPE_BATCH_SIZE),
      )) || hasMore;
    hasMore =
      (await deleteRows(
        await ctx.db
          .query("tags")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(WIPE_BATCH_SIZE),
      )) || hasMore;
    hasMore =
      (await deleteRows(
        await ctx.db
          .query("chatUsages")
          .withIndex("by_user_created", (q) => q.eq("userId", userId))
          .take(WIPE_BATCH_SIZE),
      )) || hasMore;
    hasMore =
      (await deleteRows(
        await ctx.db
          .query("subscriptions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(WIPE_BATCH_SIZE),
      )) || hasMore;
    hasMore =
      (await deleteRows(
        await ctx.db
          .query("userCounters")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(WIPE_BATCH_SIZE),
      )) || hasMore;
    hasMore =
      (await deleteRows(
        await ctx.db
          .query("marketingLimitOffers")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(WIPE_BATCH_SIZE),
      )) || hasMore;
    hasMore =
      (await deleteRows(
        await ctx.db
          .query("changelogDismissals")
          .withIndex("by_user_version", (q) => q.eq("userId", userId))
          .take(WIPE_BATCH_SIZE),
      )) || hasMore;

    const conversations = await ctx.db
      .query("chatConversations")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .take(WIPE_BATCH_SIZE);
    for (const conversation of conversations) {
      const messages = await ctx.db
        .query("chatMessages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .take(200);
      for (const message of messages) {
        await ctx.db.delete(message._id);
      }
      if (messages.length >= 200) {
        hasMore = true;
        continue;
      }
      await ctx.db.delete(conversation._id);
    }
    if (conversations.length >= WIPE_BATCH_SIZE) {
      hasMore = true;
    }

    if (hasMore) {
      await ctx.scheduler.runAfter(0, internal.auth.hooks.wipeDeletedUserData, {
        userId,
      });
    }

    return { hasMore };
  },
});
