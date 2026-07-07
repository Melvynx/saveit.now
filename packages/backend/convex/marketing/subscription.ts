import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { SUBSCRIPTION_THANK_YOU_EMAIL } from "./emailTemplates";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Entry-point for the subscription drip sequence.
 * Triggered from stripe/actions.ts processWebhook on first pro activation.
 * Contract §B: internal.marketing.subscription.startSubscriptionDrip
 */
export const startSubscriptionDrip = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId: args.userId,
    });

    if (!user || !user.email) {
      console.log(
        "[marketing.subscription.startSubscriptionDrip] user not found",
        args.userId,
      );
      return null;
    }

    await ctx.runAction(internal.email.actions.sendMarketingEmail, {
      userId: args.userId,
      to: user.email,
      subject: "Welcome to SaveIt.pro !",
      text: SUBSCRIPTION_THANK_YOU_EMAIL(),
      preview: "Thanks for your trust!",
    });

    await ctx.scheduler.runAfter(
      DAY_MS,
      internal.marketing.drips.subscriptionStep2,
      { userId: args.userId },
    );

    return null;
  },
});
