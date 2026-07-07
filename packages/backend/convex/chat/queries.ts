import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalQuery } from "../_generated/server";
import { authQuery } from "../functions";
import { startOfMonth } from "./usage";

/**
 * List the authenticated user's conversations, ordered by updatedAt desc,
 * capped at 50 (bounded — safe).
 */
export const listConversations = authQuery({
  args: {},
  handler: async (ctx) => {
    const userId = ctx.user.id;

    const conversations = await ctx.db
      .query("chatConversations")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    return conversations.map((c) => ({
      _id: c._id,
      title: c.title ?? null,
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
      likes: c.likes,
    }));
  },
});

/**
 * Get a single conversation with all its messages, ordered by createdAt asc.
 * Returns null if not found or wrong owner.
 */
export const getConversation = authQuery({
  args: { conversationId: v.id("chatConversations") },
  handler: async (ctx, args) => {
    const userId = ctx.user.id;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      return null;
    }

    // Load messages — bounded by conversation (max ~40 messages per turn * 20 steps).
    const messageRows = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();

    // Each row's `content` is the full AI SDK UIMessage object.
    const messages = messageRows.map((row) => row.content);

    return {
      _id: conversation._id,
      title: conversation.title ?? null,
      likes: conversation.likes,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
      messages,
    };
  },
});

/**
 * Return the authenticated user's chat usage for the current month,
 * including their effective limit based on plan + custom overrides.
 */
export const getChatUsage = authQuery({
  args: {},
  handler: async (ctx) => {
    const userId = ctx.user.id;
    const monthStart = startOfMonth();

    // Fetch active subscription.
    // No combined by_user+status index; fetch by user and check status in JS.
    const allSubs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(10);
    const subscription =
      allSubs.find(
        (s) => s.status === "active" || s.status === "trialing",
      ) ?? null;

    const plan = (subscription?.plan ?? "free") as "free" | "pro";

    // Fetch user metadata for custom limits.
    const user = await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId,
    });
    const metadata = (user as { metadata?: unknown } | null)?.metadata;

    // Compute effective limit.
    const baseLimits = {
      free: 10,
      pro: 200,
    } as const;

    let limit: number = baseLimits[plan];

    if (
      metadata &&
      typeof metadata === "object" &&
      !Array.isArray(metadata)
    ) {
      const customLimits = (metadata as { customLimits?: unknown })
        .customLimits;
      if (
        customLimits &&
        typeof customLimits === "object" &&
        !Array.isArray(customLimits)
      ) {
        const customMonthly = (
          customLimits as { monthlyChatQueries?: unknown }
        ).monthlyChatQueries;
        if (
          typeof customMonthly === "number" &&
          Number.isFinite(customMonthly) &&
          customMonthly >= 0
        ) {
          limit = Math.trunc(customMonthly);
        }
      }
    }

    // Count usages this month — bounded by calendar month (safe).
    const usages = await ctx.db
      .query("chatUsages")
      .withIndex("by_user_created", (q) =>
        q.eq("userId", userId).gte("createdAt", monthStart),
      )
      .collect();
    const used = usages.length;

    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      plan,
    };
  },
});

// ---------------------------------------------------------------------------
// Internal admin queries
// ---------------------------------------------------------------------------

/**
 * Returns all conversations where likes != 0, ordered by likes desc.
 * For the admin panel only.
 */
export const getConversationsWithLikes = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Collect all conversations — we filter in-memory since there is no
    // index on `likes`. The admin dataset is small enough for this to be safe.
    const all = await ctx.db.query("chatConversations").take(500);
    return all
      .filter((c) => c.likes !== 0)
      .sort((a, b) => b.likes - a.likes);
  },
});

/**
 * Get a single conversation with messages, no ownership check.
 * Admin use only.
 */
export const getConversationAdmin = internalQuery({
  args: { conversationId: v.id("chatConversations") },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    const messageRows = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();

    return {
      ...conversation,
      messages: messageRows.map((row) => row.content),
    };
  },
});
