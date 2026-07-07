import { v } from "convex/values";
import { components } from "../_generated/api";
import { authComponent, createAuth } from "../auth/config";
import { throwNotFound } from "../utils/errors";
import { authMutation } from "../functions";

/**
 * renameKey — authMutation
 *
 * Renames an API key belonging to the authenticated user.
 * Ownership check: key must belong to ctx.user.id.
 * Name is capped at 255 chars per spec.
 *
 * NOTE: The contract places this in apiKeys/actions.ts but since it is an
 * authMutation it CANNOT live in a "use node" file (Convex hard rule).
 * It is placed here (apiKeys/mutations.ts) instead.
 *
 * Spec 01 §10
 */
export const renameKey = authMutation({
  args: {
    keyId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = ctx.user.id;

    // Verify ownership by listing this user's api keys
    const keys = await ctx.runQuery(
      components.betterAuth.data.listApiKeysByUser,
      { userId, limit: 100 },
    );

    const found = keys.find(
      (k: { _id: { toString: () => string } }) =>
        k._id.toString() === args.keyId,
    );
    if (!found) {
      throwNotFound("API key not found");
    }

    // Trim name to max 255 chars
    const name = args.name.slice(0, 255);

    // Update key name via BA auth component
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.updateApiKey({
      body: { keyId: args.keyId, name },
      headers,
    });

    return null;
  },
});
