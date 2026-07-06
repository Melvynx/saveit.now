import { v } from "convex/values";

import { internalQuery } from "../_generated/server";

export const findByOriginalTransactionId = internalQuery({
  args: {
    originalTransactionId: v.string(),
  },
  handler: async (ctx, { originalTransactionId }) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_appstore_original_transaction", (q) =>
        q.eq("appstoreOriginalTransactionId", originalTransactionId),
      )
      .first();
  },
});
