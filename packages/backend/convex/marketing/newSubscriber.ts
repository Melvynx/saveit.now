import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

/**
 * Starts the "new-subscriber" drip sequence.
 * Idempotency: checks metadata.newSubscriberDripStartedAt before scheduling.
 * Replaces stub from Phase 01 bootstrap.
 */
export const start = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Idempotency check: only start the drip once per user.
    const user = await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId: args.userId,
    });

    if (!user) {
      console.log("[marketing.newSubscriber.start] user not found", args.userId);
      return null;
    }

    const metadata = (user.metadata as Record<string, unknown>) ?? {};
    if (metadata.newSubscriberDripStartedAt) {
      console.log(
        "[marketing.newSubscriber.start] drip already started for user",
        args.userId,
      );
      return null;
    }

    // Mark drip as started.
    try {
      await ctx.runMutation(components.betterAuth.data.patchUser, {
        userId: args.userId,
        update: {
          metadata: {
            ...metadata,
            newSubscriberDripStartedAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.warn("[marketing.newSubscriber.start] patch failed", error);
    }

    // Dispatch the first drip step (sends welcome email).
    await ctx.scheduler.runAfter(
      0,
      internal.marketing.drips.startNewSubscriberDrip,
      { userId: args.userId },
    );

    return null;
  },
});
