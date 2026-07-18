/**
 * bookmarks/seed.ts — Onboarding "first win" seed.
 * Default runtime (no "use node").
 *
 * Inserts ONE pre-enriched example bookmark (status "READY") so a new user's
 * library is never empty on first launch. Never triggers the AI pipeline.
 */

import { v } from "convex/values";
import { authMutation } from "../functions";
import { seedExampleBookmarkForUser } from "./onboarding";

/**
 * seedExampleBookmark — insert ONE pre-enriched example bookmark. Idempotent:
 * no-ops if the user already has any bookmark (also what makes it safe against
 * concurrent double-calls — Convex mutations are serializable).
 */
export const seedExampleBookmark = authMutation({
  args: {
    interest: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ seeded: boolean }> => {
    return seedExampleBookmarkForUser(ctx, ctx.user.id, args.interest);
  },
});
