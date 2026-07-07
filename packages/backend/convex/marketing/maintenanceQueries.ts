import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

const MAX_USERS = 500;

/**
 * Returns a bounded page of users eligible to receive batch marketing emails
 * (unsubscribed !== true, non-null email).
 *
 * NOTE: The betterAuth user table is not accessible via ctx.db from the main
 * Convex module. Instead we use a cursor-based approach via a simple
 * createdAt timestamp range with fixed-size bounded reads from the betterAuth
 * schema which is mounted as a separate component.
 *
 * Since queries cannot call ctx.runQuery, we implement this as a simple
 * query that returns what we can access. The actual user data comes from
 * the app's own tables; for the betterAuth users we fall back to the
 * maintenance action calling ctx.runQuery directly (actions CAN call
 * ctx.runQuery on component functions).
 *
 * This is a placeholder that returns an empty page; the real implementation
 * is done in maintenance.ts internalAction which calls
 * components.betterAuth.data.listUsersForAdmin directly via ctx.runQuery.
 */
export const getEligibleUsersPage = internalQuery({
  args: {
    numItems: v.number(),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (_ctx, _args) => {
    // This query intentionally does nothing — the batch action queries
    // betterAuth users directly. See marketing/maintenance.ts.
    return {
      page: [] as Array<{ userId: string; email: string }>,
      isDone: true,
      continueCursor: "",
    };
  },
});
