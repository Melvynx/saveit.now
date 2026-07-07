/**
 * Drip step functions for new-subscriber, subscription, and limit-reached
 * marketing sequences.
 *
 * All exports are internalAction. Entry-points for each sequence are in their
 * own files:
 *   - marketing/newSubscriber.ts  → start
 *   - marketing/subscription.ts  → startSubscriptionDrip
 *   - marketing/limitReached.ts  → startLimitReachedDrip
 *
 * Step functions here are scheduled by entry-points and by earlier steps.
 */
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import {
  CHROME_EXTENSION_EMAIL,
  HOW_TO_IMPORT_BOOKMARKS_EMAIL,
  HOW_TO_SEARCH_BOOKMARKS_EMAIL,
  HOW_TO_USE_BOOKMARKS_EMAIL,
  HOW_USE_CHROME_EXTENSION_EMAIL,
  LIMIT_REACHED_LAST_CHANCE_EMAIL,
  LIMIT_REACHED_REMINDER_EMAIL,
  PREMIUM_COMMITMENT_EMAIL,
  SUBSCRIPTION_HOW_TO_USE_PREMIUM_EMAIL,
  SUBSCRIPTION_LETS_TALK_EMAIL,
  SUBSCRIPTION_OUR_COMMITMENT_EMAIL,
  WELCOME_EMAIL,
} from "./emailTemplates";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Fetch the recipient email for a user; returns null if user was deleted. */
async function getUserEmail(
  ctx: { runQuery: (...args: any[]) => any },
  userId: string,
): Promise<{ email: string; stripeCustomerId?: string | null } | null> {
  const user = await ctx.runQuery(components.betterAuth.data.getUserById, {
    userId,
  });
  if (!user || !user.email) return null;
  return { email: user.email, stripeCustomerId: user.stripeCustomerId ?? null };
}

// ---------------------------------------------------------------------------
// NEW-SUBSCRIBER drip steps
// ---------------------------------------------------------------------------

/**
 * Step 1: Send welcome email immediately, schedule step2 after 2 hours.
 * Called by marketing/newSubscriber.start via scheduler.
 */
export const startNewSubscriberDrip = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserEmail(ctx, args.userId);
    if (!user) return null;

    await ctx.runAction(internal.email.actions.sendMarketingEmail, {
      userId: args.userId,
      to: user.email,
      subject: "Welcome to SaveIt.now (from Melvyn)",
      text: WELCOME_EMAIL(),
      preview: "Just a quick note to say welcome to SaveIt.now",
    });

    await ctx.scheduler.runAfter(
      2 * HOUR_MS,
      internal.marketing.drips.newSubscriberStep2,
      { userId: args.userId },
    );

    return null;
  },
});

/**
 * Step 2 (after 2h): Check bookmark count.
 * - If 0: send Chrome extension nudge + schedule step3 after 24h.
 * - If > 0: schedule step3 immediately (no extra delay).
 */
export const newSubscriberStep2 = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserEmail(ctx, args.userId);
    if (!user) return null;

    const bookmarkCount: number = await ctx.runQuery(
      internal.marketing.dripsQueries.countBookmarks,
      { userId: args.userId },
    );

    if (bookmarkCount === 0) {
      await ctx.runAction(internal.email.actions.sendMarketingEmail, {
        userId: args.userId,
        to: user.email,
        subject: "Install the SaveIt.now Chrome Extension",
        text: CHROME_EXTENSION_EMAIL(),
        preview: "Install the SaveIt.now Chrome Extension",
      });
      // Extra 24h delay before step3 when extension nudge was sent.
      await ctx.scheduler.runAfter(
        DAY_MS,
        internal.marketing.drips.newSubscriberStep3,
        { userId: args.userId },
      );
    } else {
      // Skip extension nudge; go to step3 immediately.
      await ctx.scheduler.runAfter(
        0,
        internal.marketing.drips.newSubscriberStep3,
        { userId: args.userId },
      );
    }

    return null;
  },
});

/**
 * Step 3: Send HOW_USE_CHROME_EXTENSION_EMAIL. Schedule step4 after 24h.
 */
export const newSubscriberStep3 = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserEmail(ctx, args.userId);
    if (!user) return null;

    await ctx.runAction(internal.email.actions.sendMarketingEmail, {
      userId: args.userId,
      to: user.email,
      subject: "Master the art of finding your bookmarks",
      text: HOW_USE_CHROME_EXTENSION_EMAIL(),
      preview: "How to use the Chrome extension effectively",
    });

    await ctx.scheduler.runAfter(
      DAY_MS,
      internal.marketing.drips.newSubscriberStep4,
      { userId: args.userId },
    );

    return null;
  },
});

/**
 * Step 4: Send HOW_TO_IMPORT_BOOKMARKS_EMAIL. Schedule step5 after 24h.
 */
export const newSubscriberStep4 = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserEmail(ctx, args.userId);
    if (!user) return null;

    await ctx.runAction(internal.email.actions.sendMarketingEmail, {
      userId: args.userId,
      to: user.email,
      subject: "How to import your bookmarks",
      text: HOW_TO_IMPORT_BOOKMARKS_EMAIL(),
      preview: "How to import your existing bookmarks",
    });

    await ctx.scheduler.runAfter(
      DAY_MS,
      internal.marketing.drips.newSubscriberStep5,
      { userId: args.userId },
    );

    return null;
  },
});

/**
 * Step 5 (after 24h from step4): Check bookmark count again.
 * - If < 10: send usage tips + schedule step6 after 24h.
 * - If >= 10: schedule step6 immediately.
 */
export const newSubscriberStep5 = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserEmail(ctx, args.userId);
    if (!user) return null;

    const bookmarkCount: number = await ctx.runQuery(
      internal.marketing.dripsQueries.countBookmarks,
      { userId: args.userId },
    );

    if (bookmarkCount < 10) {
      await ctx.runAction(internal.email.actions.sendMarketingEmail, {
        userId: args.userId,
        to: user.email,
        subject: "How to get the most out of your bookmarks",
        text: HOW_TO_USE_BOOKMARKS_EMAIL(),
        preview: "Tips to get the most out of your bookmarks",
      });
      // Extra 24h delay before step6 when usage tips were sent.
      await ctx.scheduler.runAfter(
        DAY_MS,
        internal.marketing.drips.newSubscriberStep6,
        { userId: args.userId },
      );
    } else {
      // Skip usage tips; proceed to step6 immediately.
      await ctx.scheduler.runAfter(
        0,
        internal.marketing.drips.newSubscriberStep6,
        { userId: args.userId },
      );
    }

    return null;
  },
});

/**
 * Step 6: Send HOW_TO_SEARCH_BOOKMARKS_EMAIL. Schedule step7 after 24h.
 */
export const newSubscriberStep6 = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserEmail(ctx, args.userId);
    if (!user) return null;

    await ctx.runAction(internal.email.actions.sendMarketingEmail, {
      userId: args.userId,
      to: user.email,
      subject: "Master the art of finding your bookmarks",
      text: HOW_TO_SEARCH_BOOKMARKS_EMAIL(),
      preview: "Master the art of finding your bookmarks",
    });

    await ctx.scheduler.runAfter(
      DAY_MS,
      internal.marketing.drips.newSubscriberStep7,
      { userId: args.userId },
    );

    return null;
  },
});

/**
 * Step 7 (final new-subscriber): Send PREMIUM_COMMITMENT_EMAIL.
 */
export const newSubscriberStep7 = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserEmail(ctx, args.userId);
    if (!user) return null;

    await ctx.runAction(internal.email.actions.sendMarketingEmail, {
      userId: args.userId,
      to: user.email,
      subject: "My commitment to SaveIt.now",
      text: PREMIUM_COMMITMENT_EMAIL(),
      preview: "My commitment to SaveIt.now",
    });

    return null;
  },
});

// ---------------------------------------------------------------------------
// SUBSCRIPTION drip steps (entry-point is marketing/subscription.ts)
// ---------------------------------------------------------------------------

export const subscriptionStep2 = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserEmail(ctx, args.userId);
    if (!user) return null;

    await ctx.runAction(internal.email.actions.sendMarketingEmail, {
      userId: args.userId,
      to: user.email,
      subject: "How to use your premium effectively",
      text: SUBSCRIPTION_HOW_TO_USE_PREMIUM_EMAIL(),
      preview: "How to use your premium effectively",
    });

    await ctx.scheduler.runAfter(
      DAY_MS,
      internal.marketing.drips.subscriptionStep3,
      { userId: args.userId },
    );

    return null;
  },
});

export const subscriptionStep3 = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserEmail(ctx, args.userId);
    if (!user) return null;

    await ctx.runAction(internal.email.actions.sendMarketingEmail, {
      userId: args.userId,
      to: user.email,
      subject: "Let's talk? 💬",
      text: SUBSCRIPTION_LETS_TALK_EMAIL(),
      preview: "Let's talk?",
    });

    await ctx.scheduler.runAfter(
      DAY_MS,
      internal.marketing.drips.subscriptionStep4,
      { userId: args.userId },
    );

    return null;
  },
});

export const subscriptionStep4 = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserEmail(ctx, args.userId);
    if (!user) return null;

    await ctx.runAction(internal.email.actions.sendMarketingEmail, {
      userId: args.userId,
      to: user.email,
      subject: "Our commitment to you",
      text: SUBSCRIPTION_OUR_COMMITMENT_EMAIL(),
      preview: "Our commitment to you",
    });

    return null;
  },
});

// ---------------------------------------------------------------------------
// LIMIT-REACHED drip steps (entry-point is marketing/limitReached.ts)
// ---------------------------------------------------------------------------

export const limitReachedStep2 = internalAction({
  args: { userId: v.string(), promoCode: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserEmail(ctx, args.userId);
    if (!user) return null;

    await ctx.runAction(internal.email.actions.sendMarketingEmail, {
      userId: args.userId,
      to: user.email,
      subject: "Don't forget your $1 discount! 💰",
      text: LIMIT_REACHED_REMINDER_EMAIL(args.promoCode),
      preview: "Don't forget your $1 discount!",
    });

    await ctx.scheduler.runAfter(
      DAY_MS,
      internal.marketing.drips.limitReachedStep3,
      { userId: args.userId, promoCode: args.promoCode },
    );

    return null;
  },
});

export const limitReachedStep3 = internalAction({
  args: { userId: v.string(), promoCode: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserEmail(ctx, args.userId);
    if (!user) return null;

    await ctx.runAction(internal.email.actions.sendMarketingEmail, {
      userId: args.userId,
      to: user.email,
      subject: "Last chance: $1 deal expires today! ⏰",
      text: LIMIT_REACHED_LAST_CHANCE_EMAIL(args.promoCode),
      preview: "Last chance: $1 deal expires today!",
    });

    return null;
  },
});
