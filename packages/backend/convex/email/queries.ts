/**
 * email/queries.ts — Public email queries.
 * Default runtime (no "use node").
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

/**
 * getUnsubscribeStatus — public query (no auth required).
 * Returns the user's unsubscribed status by userId for the unsubscribe page.
 * Contract §A: public query used by unsubscribe.$userId.tsx SSR loader.
 */
export const getUnsubscribeStatus = query({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<{ id: string; email: string; unsubscribed: boolean } | null> => {
    const user = await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId: args.userId,
    });
    if (!user) return null;
    return {
      id: (user as any)._id as string,
      email: (user as any).email as string,
      unsubscribed: Boolean((user as any).unsubscribed),
    };
  },
});
