/**
 * admin/mutations.ts — Admin-only write endpoints.
 * Default runtime (no "use node").
 *
 * All exports use the `adminMutation` builder which enforces `user.role === "admin"`
 * server-side via `requireAdmin`.
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { adminMutation } from "../functions";
import { AUTH_LIMIT_KEYS } from "../billing/plans";

// ---------------------------------------------------------------------------
// Custom limits
// ---------------------------------------------------------------------------

/**
 * setCustomLimits — merges custom per-user limit overrides into user metadata.
 * Passing null for a key removes that override (falls back to plan default).
 */
export const setCustomLimits = adminMutation({
  args: {
    userId: v.string(),
    customLimits: v.object({
      bookmarks: v.union(v.number(), v.null()),
      monthlyBookmarkRuns: v.union(v.number(), v.null()),
      monthlyChatQueries: v.union(v.number(), v.null()),
      canExport: v.union(v.number(), v.null()),
      apiAccess: v.union(v.number(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    const existingUser = (await ctx.runQuery(
      components.betterAuth.data.getUserById,
      { userId: args.userId },
    )) as any;

    if (!existingUser) {
      throw new Error("User not found");
    }

    const currentMetadata =
      existingUser.metadata &&
      typeof existingUser.metadata === "object" &&
      !Array.isArray(existingUser.metadata)
        ? (existingUser.metadata as Record<string, unknown>)
        : {};

    // Build the new customLimits object — only include non-null values.
    const newCustomLimits: Record<string, number> = {};
    for (const key of AUTH_LIMIT_KEYS) {
      const value = args.customLimits[key];
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        newCustomLimits[key] = Math.trunc(value);
      }
    }

    const nextMetadata: Record<string, unknown> = { ...currentMetadata };
    if (Object.keys(newCustomLimits).length > 0) {
      nextMetadata.customLimits = newCustomLimits;
    } else {
      delete nextMetadata.customLimits;
    }

    await ctx.runMutation(components.betterAuth.data.patchUser, {
      userId: args.userId,
      update: { metadata: nextMetadata },
    });

    return { customLimits: newCustomLimits };
  },
});

// ---------------------------------------------------------------------------
// Delete conversation
// ---------------------------------------------------------------------------

/**
 * deleteConversation — removes a chat conversation and all its messages.
 */
export const deleteConversation = adminMutation({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("chatConversations", args.conversationId);
    if (!id) {
      throw new Error("Conversation not found");
    }

    // Delete all messages first (by_conversation index).
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", id))
      .collect();

    await Promise.all(messages.map((m) => ctx.db.delete(m._id)));

    // Delete the conversation itself.
    await ctx.db.delete(id);

    return { deletedConversationId: args.conversationId };
  },
});
