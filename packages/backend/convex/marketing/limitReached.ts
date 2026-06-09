import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { LIMIT_REACHED_DISCOUNT_EMAIL } from "./emailTemplates";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Entry-point for the limit-reached drip sequence.
 * Triggered from bookmarks/mutations.ts create (via shouldSendLimitEmail check).
 * Contract §B: internal.marketing.limitReached.startLimitReachedDrip
 *
 * Guard: checks metadata.limitEmailSentAt for idempotency.
 * Creates Stripe promo code via internal.stripe.actions.createPromotionCode.
 */
export const startLimitReachedDrip = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Fetch user to check idempotency flag AND get email.
    const userRecord = await ctx.runQuery(
      components.betterAuth.data.getUserById,
      { userId: args.userId },
    );

    if (!userRecord || !userRecord.email) {
      console.log(
        "[marketing.limitReached.startLimitReachedDrip] user not found or no email",
        args.userId,
      );
      return null;
    }

    const metadata = (userRecord.metadata as Record<string, unknown>) ?? {};

    // Idempotency: only run once per user.
    if (metadata.limitEmailSentAt) {
      console.log(
        "[marketing.limitReached.startLimitReachedDrip] drip already started",
        args.userId,
      );
      return null;
    }

    // Create Stripe promo code.
    const promoResult = (await ctx.runAction(
      internal.stripe.actions.createPromotionCode,
      {
        userId: args.userId,
        stripeCustomerId: userRecord.stripeCustomerId ?? undefined,
      },
    )) as { code: string };
    const promoCode = promoResult.code;

    // Send first limit-reached email.
    await ctx.runAction(internal.email.actions.sendMarketingEmail, {
      userId: args.userId,
      to: userRecord.email,
      subject: "You reached your limit! Here's a special discount 🎁",
      text: LIMIT_REACHED_DISCOUNT_EMAIL(promoCode),
      preview: "You reached your limit! Here's a special discount",
    });

    // Set idempotency flag.
    try {
      await ctx.runMutation(components.betterAuth.data.patchUser, {
        userId: args.userId,
        update: {
          metadata: {
            ...metadata,
            limitEmailSentAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.warn(
        "[marketing.limitReached.startLimitReachedDrip] patch metadata failed",
        error,
      );
    }

    // Schedule step2 after 24h.
    await ctx.scheduler.runAfter(
      DAY_MS,
      internal.marketing.drips.limitReachedStep2,
      { userId: args.userId, promoCode },
    );

    return null;
  },
});
