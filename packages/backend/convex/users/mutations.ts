import { v } from "convex/values";
import { components } from "../_generated/api";
import { throwValidationError } from "../utils/errors";
import { authMutation } from "../functions";
import {
  onboardingInterestValidator,
  seedExampleBookmarkForUser,
} from "../bookmarks/onboarding";
import { onboardingUpgradeChoiceValidator } from "./onboarding";

/**
 * Completes onboarding as one backend-owned command. Seeding is idempotent, so
 * retrying after a transport failure is safe for both empty and imported
 * libraries. Any seed or user-update failure rejects the whole command.
 */
export const completeOnboarding = authMutation({
  args: {
    interest: onboardingInterestValidator,
    offerChoice: v.optional(onboardingUpgradeChoiceValidator),
  },
  handler: async (ctx, args): Promise<{ seeded: boolean }> => {
    const result = await seedExampleBookmarkForUser(
      ctx,
      ctx.user.id,
      args.interest,
    );
    await ctx.runMutation(components.betterAuth.data.completeOnboarding, {
      userId: ctx.user.id,
      ...(args.offerChoice !== undefined
        ? { offerChoice: args.offerChoice }
        : {}),
    });
    return result;
  },
});

/**
 * setOnboarding — authMutation
 *
 * Marks the authenticated user's onboarding as complete.
 * Spec 12 §2.8, Contract §A users/mutations.ts
 */
export const setOnboarding = authMutation({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(components.betterAuth.data.completeOnboarding, {
      userId: ctx.user.id,
    });
    return null;
  },
});

// Slug validation regex: lowercase letters, numbers, and hyphens only
const SLUG_REGEX = /^[a-z0-9-]+$/;

/**
 * updatePublicLink — authMutation
 *
 * Enables or disables the public bookmark profile link.
 * When enabling, a valid slug (min 3, max 50 chars, /^[a-z0-9-]+$/) is required.
 * Uniqueness is checked via getUserByPublicSlug.
 *
 * Spec 12 §2.4, Contract §A users/mutations.ts
 */
export const updatePublicLink = authMutation({
  args: {
    enabled: v.boolean(),
    slug: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = ctx.user.id;

    if (args.enabled && !args.slug) {
      throwValidationError("Slug is required when enabling public link");
    }

    if (args.slug) {
      const slug = args.slug;

      // Validate slug format
      if (slug.length < 3 || slug.length > 50) {
        throwValidationError("Slug must be between 3 and 50 characters");
      }

      if (!SLUG_REGEX.test(slug)) {
        throwValidationError(
          "Slug can only contain lowercase letters, numbers, and hyphens",
        );
      }

      // Uniqueness check — slug must not already be taken by another user
      const existing = await ctx.runQuery(
        components.betterAuth.data.getUserByPublicSlug,
        { slug },
      );
      if (existing && existing._id.toString() !== userId) {
        throwValidationError("This slug is already taken");
      }
    }

    await ctx.runMutation(components.betterAuth.data.patchUser, {
      userId,
      update: {
        publicLinkEnabled: args.enabled,
        publicLinkSlug: args.enabled ? (args.slug ?? null) : null,
      },
    });

    return null;
  },
});
