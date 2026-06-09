"use node";
/**
 * tags/actions.ts — Tag AI action (Gemini suggestCleanup).
 * "use node" runtime required for @ai-sdk/google.
 * Contract §A tags/actions.ts.
 *
 * IMPORTANT: Only exports action/internalAction registrations + plain helpers.
 * The internal query helper lives in tags/queries.ts to avoid mixing
 * "use node" with query registrations.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import { authAction } from "../functions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TagCleanupSuggestion = {
  bestTag: string;
  bestTagExists: boolean;
  bestTagId: string | undefined;
  bestTagBookmarkCount: number;
  refactorTags: Array<{
    id: string;
    name: string;
    bookmarkCount: number;
  }>;
  totalBookmarks: number;
};

// ---------------------------------------------------------------------------
// Gemini schema
// ---------------------------------------------------------------------------

const TagCleanupResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      bestTag: z.string(),
      refactorTags: z.array(z.string()),
    }),
  ),
});

// ---------------------------------------------------------------------------
// suggestCleanup — authAction
// ---------------------------------------------------------------------------

export const suggestCleanup = authAction({
  args: {},
  handler: async (
    ctx,
    _args,
  ): Promise<{ suggestions: TagCleanupSuggestion[]; totalTags: number }> => {
    const userId = ctx.user.id;

    // Fetch all user tags with bookmark counts via internal query (defined in tags/queries.ts).
    const tagsWithCounts: Array<{
      id: string;
      name: string;
      bookmarkCount: number;
    }> = await ctx.runQuery(internal.tags.queries._getAllTagsWithCounts, {
      userId,
    });

    const totalTags = tagsWithCounts.length;

    // Short-circuit: not enough tags to suggest cleanup.
    if (totalTags < 2) {
      return { suggestions: [], totalTags };
    }

    const tagNames = tagsWithCounts.map((t) => t.name);

    // Call Gemini generateObject.
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
    });

    // GEMINI_MODEL_IDS.normal = "gemini-3.1-pro-preview" per Contract §D.
    const model = google("gemini-3.1-pro-preview");

    const { object } = await generateObject({
      model,
      schema: TagCleanupResponseSchema,
      system: `You are a tag organization expert. Analyze the provided tags and identify consolidation opportunities to reduce redundancy while maintaining semantic meaning.

Look for:
1. Semantic duplicates (react vs React vs ReactJS vs react.js)
2. Abbreviations vs full names (js vs javascript, css vs cascading-style-sheets)
3. Formatting inconsistencies (kebab-case vs camelCase vs snake_case)
4. Plural vs singular forms (tag vs tags, component vs components)
5. Similar technologies that could be grouped (reactjs vs react.js vs "react js")

Rules:
- Only suggest consolidations when tags are clearly related/similar
- Choose the most common/standard form as bestTag
- Don't consolidate conceptually different tags (react and vue are different)
- Prefer lowercase, kebab-case format when possible
- Only include refactorTags that actually exist in the input
- Each refactorTag should only appear once across all suggestions
- Minimum 2 tags per consolidation group

Return empty suggestions array if no clear consolidations are found.`,
      prompt: `Analyze these tags for consolidation opportunities:\n\nTags: ${tagNames.join(", ")}\n\nIdentify which tags should be consolidated and suggest the best canonical form for each group.`,
    });

    // Build a lookup map: name → tag info.
    const tagByName = new Map(tagsWithCounts.map((t) => [t.name, t]));

    // Post-process: filter out invalid suggestions.
    const processedSuggestions: TagCleanupSuggestion[] = [];
    const usedRefactorTags = new Set<string>();

    for (const suggestion of object.suggestions) {
      // Filter refactorTags to only those that exist in original tag names
      // and haven't been used in a previous suggestion.
      const validRefactorTags = suggestion.refactorTags
        .filter(
          (name) =>
            tagByName.has(name) &&
            name !== suggestion.bestTag &&
            !usedRefactorTags.has(name),
        )
        .map((name) => tagByName.get(name)!);

      if (validRefactorTags.length < 1) continue;

      // Mark used.
      for (const t of validRefactorTags) {
        usedRefactorTags.add(t.name);
      }

      const bestTagInfo = tagByName.get(suggestion.bestTag);

      processedSuggestions.push({
        bestTag: suggestion.bestTag,
        bestTagExists: Boolean(bestTagInfo),
        bestTagId: bestTagInfo?.id,
        bestTagBookmarkCount: bestTagInfo?.bookmarkCount ?? 0,
        refactorTags: validRefactorTags.map((t) => ({
          id: t.id,
          name: t.name,
          bookmarkCount: t.bookmarkCount,
        })),
        totalBookmarks:
          (bestTagInfo?.bookmarkCount ?? 0) +
          validRefactorTags.reduce((sum, t) => sum + t.bookmarkCount, 0),
      });
    }

    return { suggestions: processedSuggestions, totalTags };
  },
});
