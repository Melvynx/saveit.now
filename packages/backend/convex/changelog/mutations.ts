import { v } from "convex/values";
import { authMutation } from "../functions";

/**
 * dismiss — authMutation
 *
 * Marks a changelog version as dismissed for the authenticated user.
 * Idempotent: a second dismiss for the same (userId, version) is a no-op.
 * Backed by the changelogDismissals table (replaces Redis).
 *
 * Spec 12 §4.8, Contract §A changelog/mutations.ts
 */
export const dismiss = authMutation({
  args: {
    version: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = ctx.user.id;

    // Idempotency check
    const existing = await ctx.db
      .query("changelogDismissals")
      .withIndex("by_user_version", (q) =>
        q.eq("userId", userId).eq("version", args.version),
      )
      .first();

    if (!existing) {
      await ctx.db.insert("changelogDismissals", {
        userId,
        version: args.version,
      });
    }

    return null;
  },
});
