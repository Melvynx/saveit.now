import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";

export const getLimitOffer = internalQuery({
  args: { offerId: v.id("marketingLimitOffers") },
  handler: async (ctx, { offerId }) => await ctx.db.get(offerId),
});

export const storeLimitPromoCode = internalMutation({
  args: {
    offerId: v.id("marketingLimitOffers"),
    promoCode: v.string(),
  },
  handler: async (ctx, { offerId, promoCode }) => {
    const offer = await ctx.db.get(offerId);
    if (!offer) throw new Error("Limit offer not found");
    if (offer.promoCode && offer.promoCode !== promoCode) {
      throw new Error("Limit offer already has a different promotion code");
    }
    await ctx.db.patch(offerId, { promoCode, updatedAt: Date.now() });
    return null;
  },
});

export const activateLimitOffer = internalMutation({
  args: { offerId: v.id("marketingLimitOffers") },
  handler: async (ctx, { offerId }) => {
    const offer = await ctx.db.get(offerId);
    if (!offer) throw new Error("Limit offer not found");
    if (offer.status === "active") return null;

    const user = await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId: offer.userId,
    });
    if (user) {
      const metadata =
        user.metadata !== null && typeof user.metadata === "object"
          ? (user.metadata as Record<string, unknown>)
          : {};
      await ctx.runMutation(components.betterAuth.data.patchUser, {
        userId: offer.userId,
        update: {
          metadata: {
            ...metadata,
            limitEmailSentAt: new Date().toISOString(),
          },
        },
      });
    }

    const now = Date.now();
    await ctx.db.patch(offerId, {
      status: "active",
      updatedAt: now,
      activatedAt: now,
    });
    return null;
  },
});
