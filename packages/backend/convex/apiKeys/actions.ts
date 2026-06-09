"use node";

import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { authComponent, createAuth } from "../auth/config";
import { getLimits } from "../billing/plans";
import { throwForbidden } from "../utils/errors";

/**
 * validateApiKey — internalAction ("use node" because auth.api.verifyApiKey
 * uses the BA Node adapter internally).
 *
 * 1. Uses authComponent.getAuth(createAuth, ctx) to get auth instance.
 * 2. Calls auth.api.verifyApiKey({ body: { key: token } }).
 * 3. Resolves user via components.betterAuth.data.getUserById.
 * 4. Computes limits (billing/plans) → apiAccess === 0 → throwForbidden.
 * 5. Returns { user: { id }, apiKey: { id, name } } or null.
 *
 * Spec 09 §8.1, Contract §B
 */
export const validateApiKey = internalAction({
  args: { token: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{
    user: { id: string };
    apiKey: { id: string; name: string };
  } | null> => {
    const { auth } = await authComponent.getAuth(createAuth, ctx);

    let result: Awaited<ReturnType<typeof auth.api.verifyApiKey>>;
    try {
      result = await auth.api.verifyApiKey({ body: { key: args.token } });
    } catch {
      return null;
    }

    if (!result?.valid || !result?.key) {
      return null;
    }

    // The apiKey owner is stored as `userId` (or `referenceId` depending on the
    // plugin version). Read both defensively.
    const keyOwner = result.key as { userId?: string; referenceId?: string };
    const userId = keyOwner.userId ?? keyOwner.referenceId;
    if (!userId) {
      return null;
    }

    // Resolve user from betterAuth component
    const user = await ctx.runQuery(
      components.betterAuth.data.getUserById,
      { userId },
    );

    if (!user) {
      return null;
    }

    // Determine plan from subscriptions table
    let planName: "free" | "pro" = "free";
    try {
      const sub = await ctx.runQuery(
        internal.apiKeys.helpers.getActiveSubscriptionForUser,
        { userId },
      );
      if (sub?.plan === "pro" || sub?.plan === "free") {
        planName = sub.plan;
      }
    } catch {
      // subscriptions module not yet built; default to free
    }

    const metadata = user.metadata as unknown;
    const limits = getLimits(planName, metadata);

    if (limits.apiAccess === 0) {
      throwForbidden("Pro plan required");
    }

    return {
      user: { id: userId },
      apiKey: {
        id: result.key.id,
        name: (result.key as { name?: string | null }).name ?? "",
      },
    };
  },
});
