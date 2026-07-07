/**
 * email/queries.ts — Public email queries.
 * Default runtime (no "use node").
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

/**
 * getUnsubscribeStatus — token-gated public query.
 * Returns status only when the caller proves possession of the signed
 * unsubscribe link.
 */
export const getUnsubscribeStatus = query({
  args: {
    userId: v.string(),
    token: v.string(),
    timestamp: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ id: string; email: string; unsubscribed: boolean } | null> => {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(`${args.userId}:${args.timestamp}`),
    );
    const expected = Array.from(new Uint8Array(signature))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    if (expected !== args.token) return null;

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
