import { v } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import { upsertTagByName } from "../tags/mutations";
import { bumpBookmarkCount } from "./mutations";

export const ONBOARDING_INTERESTS = [
  "articles",
  "videos",
  "threads",
  "recipes",
  "design",
  "dev",
] as const;

export type OnboardingInterest = (typeof ONBOARDING_INTERESTS)[number];

export const onboardingInterestValidator = v.union(
  v.literal(ONBOARDING_INTERESTS[0]),
  v.literal(ONBOARDING_INTERESTS[1]),
  v.literal(ONBOARDING_INTERESTS[2]),
  v.literal(ONBOARDING_INTERESTS[3]),
  v.literal(ONBOARDING_INTERESTS[4]),
  v.literal(ONBOARDING_INTERESTS[5]),
);

type SeedExample = {
  url: string;
  type: "ARTICLE";
  title: string;
  summary: string;
  faviconDomain: string;
  tags: readonly string[];
};

const ARTICLES_EXAMPLE: SeedExample = {
  url: "https://www.paulgraham.com/greatwork.html",
  type: "ARTICLE",
  title: "How to Do Great Work — Paul Graham",
  summary:
    "A field guide to producing exceptional work: pick something you're deeply curious about, do it well enough to reach the frontier, then notice the gaps others walk past. This is an example bookmark — tap it to see how SaveIt summarizes and tags anything you save.",
  faviconDomain: "paulgraham.com",
  tags: ["career", "essays", "productivity"],
};

const EXAMPLE_BOOKMARKS: Record<OnboardingInterest, SeedExample> = {
  articles: ARTICLES_EXAMPLE,
  videos: {
    url: "https://www.youtube.com/watch?v=zjkBMFhNj_g",
    type: "ARTICLE",
    title: "But what is a neural network? — 3Blue1Brown",
    summary:
      "A visual, intuition-first introduction to neural networks and how they learn. This is an example bookmark — SaveIt auto-summarizes videos and articles so you can find them again in seconds.",
    faviconDomain: "youtube.com",
    tags: ["learning", "AI", "video"],
  },
  threads: {
    url: "https://x.com/naval/status/1002103360646823936",
    type: "ARTICLE",
    title: "How to Get Rich (without getting lucky) — Naval",
    summary:
      "A thread distilling wealth creation into leverage, specific knowledge and long-term games with long-term people. This is an example bookmark — save any thread and SaveIt keeps the ideas, not just the link.",
    faviconDomain: "x.com",
    tags: ["threads", "wealth", "mindset"],
  },
  recipes: {
    url: "https://www.seriouseats.com/the-best-chocolate-chip-cookies-recipe",
    type: "ARTICLE",
    title: "The Best Chocolate Chip Cookies — Serious Eats",
    summary:
      "The science behind chewy, crisp-edged cookies: browned butter, resting the dough, and the right sugar ratio. This is an example bookmark — save recipes and SaveIt keeps the steps handy and searchable.",
    faviconDomain: "seriouseats.com",
    tags: ["recipes", "baking", "cooking"],
  },
  design: {
    url: "https://www.refactoringui.com/",
    type: "ARTICLE",
    title: "Refactoring UI — Make your ideas look amazing",
    summary:
      "Practical visual-design tactics for developers: hierarchy, spacing, color and depth without a design degree. This is an example bookmark — SaveIt tags and summarizes design inspiration for you.",
    faviconDomain: "refactoringui.com",
    tags: ["design", "UI", "inspiration"],
  },
  dev: {
    url: "https://react.dev/blog/2024/12/05/react-19",
    type: "ARTICLE",
    title: "React 19 is now stable — react.dev",
    summary:
      "Actions, the use() API, Server Components and simplified refs land in the stable release. This is an example bookmark — SaveIt summarizes docs and changelogs so your reading list stays useful.",
    faviconDomain: "react.dev",
    tags: ["dev", "react", "changelog"],
  },
};

function resolveExample(interest?: string): SeedExample {
  if (interest && Object.hasOwn(EXAMPLE_BOOKMARKS, interest)) {
    return EXAMPLE_BOOKMARKS[interest as OnboardingInterest];
  }

  return ARTICLES_EXAMPLE;
}

/**
 * Seeds one pre-enriched example for an empty library. The string input is
 * intentional: the backward-compatible public seed mutation accepts arbitrary
 * historical values and must safely fall back to the article example.
 */
export async function seedExampleBookmarkForUser(
  ctx: MutationCtx,
  userId: string,
  interest?: string,
): Promise<{ seeded: boolean }> {
  const existing = await ctx.db
    .query("bookmarks")
    .withIndex("by_user_created", (q) => q.eq("userId", userId))
    .first();
  if (existing) {
    return { seeded: false };
  }

  const example = resolveExample(interest);
  const now = Date.now();
  const bookmarkId = await ctx.db.insert("bookmarks", {
    userId,
    url: example.url,
    type: example.type,
    title: example.title,
    summary: example.summary,
    faviconUrl: `https://www.google.com/s2/favicons?domain=${example.faviconDomain}&sz=128`,
    status: "READY",
    starred: false,
    read: false,
    isExample: true,
    processingStep: 8,
    createdAt: now,
    updatedAt: now,
  });

  await bumpBookmarkCount(ctx, userId, 1);

  for (const name of example.tags) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const tag = await upsertTagByName(ctx, userId, trimmed, "IA");
    await ctx.db.insert("bookmarkTags", {
      bookmarkId,
      tagId: tag._id,
      userId,
    });
  }

  return { seeded: true };
}
