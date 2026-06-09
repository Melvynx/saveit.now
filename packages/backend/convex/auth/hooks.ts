import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Fired after a Better Auth user row is created (scheduled from
 * `databaseHooks.user.create.after`). Parity with SaveIt's current
 * `onUserCreate`:
 *   1. ensure a Stripe customer (Phase 09)
 *   2. insert the welcome bookmark (Phase 05/06) — wired once bookmarks land
 *   3. schedule the "new-subscriber" marketing drip (Phase 10)
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
      await ctx.scheduler.runAfter(0, internal.marketing.newSubscriber.start, {
        userId,
      });
    } catch (error) {
      console.warn("[hooks.onUserCreated] new-subscriber drip skipped", error);
    }

    return null;
  },
});
