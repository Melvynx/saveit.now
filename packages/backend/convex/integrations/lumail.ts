"use node";

import { Lumail, LumailNotFoundError } from "lumail";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { createLimitPromotionCode } from "../stripe/promotionCodes";
import {
  getBookmarkLifecycleTags,
  LUMAIL_TAGS,
  normalizeMarketingUser,
  shouldSyncMarketingUser,
  type MarketingUser,
} from "./lumailPolicy";
import { cancelWorkflowRunsAndDeleteSubscriber } from "./lumailDeletion";

function getLumail(): Lumail {
  const apiKey = process.env.LUMAIL_API_KEY;
  if (!apiKey) throw new Error("LUMAIL_API_KEY is not set");
  return new Lumail({ apiKey });
}

async function getMarketingUser(
  ctx: ActionCtx,
  userId: string,
): Promise<MarketingUser | null> {
  return normalizeMarketingUser(
    await ctx.runQuery(components.betterAuth.data.getUserById, { userId }),
  );
}

async function upsertSubscriber(
  lumail: Lumail,
  user: MarketingUser & { email: string },
  fields: Record<string, string>,
): Promise<void> {
  await lumail.subscribers.create({
    email: user.email,
    name: user.name ?? undefined,
    fields: { saveit_user_id: user._id, ...fields },
    resubscribe: false,
    triggerWorkflows: false,
  });
}

async function reconcilePlan(
  ctx: ActionCtx,
  lumail: Lumail,
  user: MarketingUser & { email: string },
): Promise<"free" | "pro"> {
  const plan = await ctx.runQuery(
    internal.subscriptions.helpers.getEffectivePlanForUser,
    { userId: user._id },
  );

  await upsertSubscriber(lumail, user, { plan });
  if (plan === "pro") {
    await lumail.subscribers.removeTags(user.email, [LUMAIL_TAGS.free]);
    await lumail.subscribers.addTags(user.email, [LUMAIL_TAGS.pro]);
  } else {
    await lumail.subscribers.removeTags(user.email, [LUMAIL_TAGS.pro]);
    await lumail.subscribers.addTags(user.email, [LUMAIL_TAGS.free]);
  }
  return plan;
}

export const syncNewUser = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await getMarketingUser(ctx, userId);
    if (!shouldSyncMarketingUser(user)) return null;

    const lumail = getLumail();
    const plan: "free" | "pro" = await ctx.runQuery(
      internal.subscriptions.helpers.getEffectivePlanForUser,
      { userId },
    );
    await lumail.subscribers.create({
      email: user.email,
      name: user.name ?? undefined,
      tags: [LUMAIL_TAGS.user, LUMAIL_TAGS[plan]],
      fields: { saveit_user_id: userId, plan },
      resubscribe: false,
      triggerWorkflows: true,
    });
    await lumail.subscribers.removeTags(user.email, [
      plan === "pro" ? LUMAIL_TAGS.free : LUMAIL_TAGS.pro,
    ]);
    return null;
  },
});

export const createLimitPromoCode = internalAction({
  args: {
    userId: v.string(),
    offerId: v.id("marketingLimitOffers"),
  },
  handler: async (ctx, { userId, offerId }): Promise<string> => {
    const offer: {
      userId: string;
      promoCode?: string;
    } | null = await ctx.runQuery(internal.integrations.state.getLimitOffer, {
      offerId,
    });
    if (!offer || offer.userId !== userId) {
      throw new Error("Limit offer does not belong to this user");
    }
    if (offer.promoCode) return offer.promoCode;

    const user = await getMarketingUser(ctx, userId);
    if (!user) throw new Error("Limit offer user not found");
    return await createLimitPromotionCode({
      offerId,
      ...(user.stripeCustomerId
        ? { stripeCustomerId: user.stripeCustomerId }
        : {}),
    });
  },
});

export const syncBookmarkLifecycle = internalAction({
  args: {
    userId: v.string(),
    bookmarkCount: v.number(),
    startLimitOffer: v.boolean(),
    promoCode: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { userId, bookmarkCount, startLimitOffer, promoCode },
  ) => {
    const user = await getMarketingUser(ctx, userId);
    if (!shouldSyncMarketingUser(user)) return null;
    if (startLimitOffer && !promoCode) {
      throw new Error("A promotion code is required for a limit offer");
    }

    const lumail = getLumail();
    await upsertSubscriber(lumail, user, {
      bookmark_count: String(bookmarkCount),
      ...(promoCode ? { promo_code: promoCode } : {}),
    });
    const tags = getBookmarkLifecycleTags(bookmarkCount, startLimitOffer);
    if (tags.length > 0) {
      await lumail.subscribers.addTags(user.email, tags);
    }
    return null;
  },
});

export const syncPlan = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await getMarketingUser(ctx, userId);
    if (!shouldSyncMarketingUser(user)) return null;
    await reconcilePlan(ctx, getLumail(), user);
    return null;
  },
});

export const syncProfile = internalAction({
  args: {
    userId: v.string(),
    previousEmail: v.string(),
  },
  handler: async (ctx, { userId, previousEmail }) => {
    const user = await getMarketingUser(ctx, userId);
    if (!user?.email) return null;

    const lumail = getLumail();
    if (user.unsubscribed) {
      for (const email of new Set([previousEmail, user.email])) {
        try {
          await lumail.subscribers.unsubscribe(email);
        } catch (error) {
          if (!(error instanceof LumailNotFoundError)) throw error;
        }
      }
      return null;
    }

    try {
      await lumail.subscribers.update(previousEmail, {
        email: user.email,
        name: user.name,
        fields: { saveit_user_id: userId },
        resubscribe: false,
        triggerWorkflows: false,
      });
    } catch (error) {
      if (!(error instanceof LumailNotFoundError)) throw error;
      await upsertSubscriber(
        lumail,
        user as MarketingUser & { email: string },
        {
          saveit_user_id: userId,
        },
      );
    }
    return null;
  },
});

export const unsubscribeUser = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await getMarketingUser(ctx, userId);
    if (!user?.email) return null;
    try {
      await getLumail().subscribers.unsubscribe(user.email);
    } catch (error) {
      if (!(error instanceof LumailNotFoundError)) throw error;
    }
    return null;
  },
});

export const deleteSubscriber = internalAction({
  args: { email: v.string() },
  handler: async (_ctx, { email }) => {
    try {
      await cancelWorkflowRunsAndDeleteSubscriber(getLumail(), email);
    } catch (error) {
      if (!(error instanceof LumailNotFoundError)) throw error;
    }
    return null;
  },
});
