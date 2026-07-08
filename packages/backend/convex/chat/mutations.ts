import { ConvexError } from "convex/values";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { authMutation } from "../functions";
import { throwNotFound } from "../utils/errors";
import { startOfMonth } from "./usage";
import type { Id } from "../_generated/dataModel";

function getFallbackConversationTitle(firstMessage: string) {
  const normalized = firstMessage.replace(/\s+/g, " ").trim();
  if (!normalized) return "New conversation";
  return normalized.slice(0, 60);
}

/**
 * ATOMIC check-and-increment for chat quota.
 *
 * Must be a SINGLE mutation (serialized transaction) to avoid TOCTOU races.
 * Contract §E.8 — never split into query + separate mutation.
 */
export const checkAndIncrementUsage = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = args;
    const monthStart = startOfMonth();

    // 1. Count existing usages for the current month.
    const usages = await ctx.db
      .query("chatUsages")
      .withIndex("by_user_created", (q) =>
        q.eq("userId", userId).gte("createdAt", monthStart),
      )
      .collect();
    const used = usages.length;

    // 2. Fetch active subscription for userId.
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

    // 3. Fetch user metadata for custom limits.
    const user = await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId,
    });
    const metadata = (user as { metadata?: unknown } | null)?.metadata;

    // 4. Compute effective monthlyChatQueries limit.
    const baseLimits = {
      free: 10,
      pro: 200,
    } as const;

    let limit: number = baseLimits[plan];

    // Apply custom limits if present.
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

    // 5. Guard: throw if at/over limit.
    if (used >= limit) {
      throw new ConvexError(
        `Chat limit reached. You've used ${used}/${limit} queries this month.`,
      );
    }

    // 6. Insert usage row.
    await ctx.db.insert("chatUsages", {
      userId,
      createdAt: Date.now(),
    });

    return null;
  },
});

/**
 * Persist AI SDK messages as `chatMessages` rows after a stream finishes.
 * Verifies conversation ownership before writing.
 */
export const addMessages = internalMutation({
  args: {
    conversationId: v.id("chatConversations"),
    userId: v.string(),
    messages: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const { conversationId, userId, messages } = args;

    // Verify ownership.
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== userId) {
      throwNotFound("Conversation not found");
    }

    // Insert each message as a separate row.
    for (const message of messages) {
      const role =
        message.role === "user" ||
        message.role === "assistant" ||
        message.role === "system"
          ? (message.role as "user" | "assistant" | "system")
          : "assistant";

      await ctx.db.insert("chatMessages", {
        conversationId,
        userId,
        role,
        content: message,
        createdAt: Date.now(),
      });
    }

    // Bump updatedAt on the conversation.
    await ctx.db.patch(conversationId, { updatedAt: Date.now() });

    return null;
  },
});

/**
 * Insert a new conversation record. Called from `chat/actions.ts`
 * (title generation is async/AI, so must live in an action; the insert
 * itself is a mutation for transactional safety).
 */
export const insertConversation = internalMutation({
  args: {
    userId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("chatConversations", {
      userId: args.userId,
      title: args.title,
      likes: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Create a conversation immediately with a cheap fallback title, then schedule
 * the slower AI title generation outside the first-message send path.
 */
export const createConversation = authMutation({
  args: {
    firstMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = ctx.user.id;
    const now = Date.now();
    const title = getFallbackConversationTitle(args.firstMessage);
    const conversationId = await ctx.db.insert("chatConversations", {
      userId,
      title,
      likes: 0,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.chat.actions.generateConversationTitle,
      {
        conversationId,
        userId,
        firstMessage: args.firstMessage,
      },
    );

    return { id: conversationId, title };
  },
});

/**
 * Update a generated title after ownership has been verified by userId.
 */
export const updateGeneratedConversationTitle = internalMutation({
  args: {
    conversationId: v.id("chatConversations"),
    userId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== args.userId) {
      return null;
    }

    await ctx.db.patch(args.conversationId, { title: args.title });
    return null;
  },
});

/**
 * Rename a conversation (ownership-checked).
 */
export const renameConversation = authMutation({
  args: {
    conversationId: v.id("chatConversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { conversationId, title } = args;
    const userId = ctx.user.id;

    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== userId) {
      throwNotFound("Conversation not found");
    }

    await ctx.db.patch(conversationId, { title, updatedAt: Date.now() });
    return null;
  },
});

/**
 * Increment likes by +1 (ownership-checked).
 */
export const likeConversation = authMutation({
  args: {
    conversationId: v.id("chatConversations"),
  },
  handler: async (ctx, args) => {
    const { conversationId } = args;
    const userId = ctx.user.id;

    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== userId) {
      throwNotFound("Conversation not found");
    }

    await ctx.db.patch(conversationId, { likes: conversation.likes + 1 });
    return null;
  },
});

/**
 * Decrement likes by -1, can go negative (ownership-checked).
 */
export const dislikeConversation = authMutation({
  args: {
    conversationId: v.id("chatConversations"),
  },
  handler: async (ctx, args) => {
    const { conversationId } = args;
    const userId = ctx.user.id;

    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== userId) {
      throwNotFound("Conversation not found");
    }

    await ctx.db.patch(conversationId, { likes: conversation.likes - 1 });
    return null;
  },
});

/**
 * Delete a conversation and all its messages (ownership-checked).
 */
export const deleteConversation = authMutation({
  args: {
    conversationId: v.id("chatConversations"),
  },
  handler: async (ctx, args) => {
    const { conversationId } = args;
    const userId = ctx.user.id;

    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== userId) {
      throwNotFound("Conversation not found");
    }

    // Delete all messages for this conversation.
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the conversation itself.
    await ctx.db.delete(conversationId);
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal tag-update helper used by the chat stream's updateTags tool.
// ---------------------------------------------------------------------------

/**
 * Differential tag update for the AI chat updateTags tool.
 * For each bookmark (ownership-checked): add tags not already present,
 * remove tags that are present. Called from chat/stream.ts httpAction via
 * ctx.runMutation(internal.chat.mutations.applyTagsDiff, ...).
 */
export const applyTagsDiff = internalMutation({
  args: {
    bookmarkIds: v.array(v.string()),
    add: v.array(v.string()),
    remove: v.array(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { bookmarkIds, add, remove, userId } = args;

    const cleanAdd = Array.from(
      new Set(add.filter((t) => t?.trim()).map((t) => t.trim())),
    );
    const cleanRemove = Array.from(
      new Set(remove.filter((t) => t?.trim()).map((t) => t.trim())),
    );

    let tagsAdded = 0;
    let tagsRemoved = 0;
    let bookmarksFound = 0;

    for (const bookmarkIdStr of bookmarkIds) {
      // Normalise to a typed Id and ownership-check.
      const bookmarkId = ctx.db.normalizeId(
        "bookmarks",
        bookmarkIdStr,
      ) as Id<"bookmarks"> | null;
      if (!bookmarkId) continue;

      const bookmark = await ctx.db.get(bookmarkId);
      if (!bookmark || bookmark.userId !== userId) continue;
      bookmarksFound++;

      // Load current tags via by_bookmark index.
      const currentJoins = await ctx.db
        .query("bookmarkTags")
        .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmarkId))
        .collect();

      // Build map: tagName → {tagId, joinId}
      const tagMap = new Map<
        string,
        { tagId: Id<"tags">; joinId: Id<"bookmarkTags"> }
      >();
      for (const join of currentJoins) {
        const tag = await ctx.db.get(join.tagId);
        if (tag) tagMap.set(tag.name, { tagId: join.tagId, joinId: join._id });
      }

      // Remove tags.
      for (const tagName of cleanRemove) {
        const entry = tagMap.get(tagName);
        if (entry) {
          await ctx.db.delete(entry.joinId);
          tagMap.delete(tagName);
          tagsRemoved++;
        }
      }

      // Add tags.
      for (const tagName of cleanAdd) {
        if (tagMap.has(tagName)) continue;

        // Upsert the tag.
        let tagDoc = await ctx.db
          .query("tags")
          .withIndex("by_user_name", (q) =>
            q.eq("userId", userId).eq("name", tagName),
          )
          .first();

        if (!tagDoc) {
          const newTagId = await ctx.db.insert("tags", {
            userId,
            name: tagName,
            type: "USER",
          });
          tagDoc = await ctx.db.get(newTagId);
        }

        if (tagDoc) {
          await ctx.db.insert("bookmarkTags", {
            bookmarkId,
            tagId: tagDoc._id,
            userId,
          });
          tagsAdded++;
        }
      }
    }

    return {
      success: true,
      bookmarksUpdated: bookmarksFound,
      tagsAdded,
      tagsRemoved,
      addedTags: cleanAdd,
      removedTags: cleanRemove,
    };
  },
});
