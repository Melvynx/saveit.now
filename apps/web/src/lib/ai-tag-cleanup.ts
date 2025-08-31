import { generateObject } from "ai";
import { z } from "zod";
import { GEMINI_MODELS } from "./gemini";

const TagCleanupSuggestionSchema = z.object({
  bestTag: z.string().describe("The canonical form of the tag to keep"),
  refactorTags: z.array(z.string()).describe("Array of similar tags to be consolidated into bestTag"),
});

const TagCleanupResponseSchema = z.object({
  suggestions: z.array(TagCleanupSuggestionSchema),
});

export type TagCleanupSuggestion = z.infer<typeof TagCleanupSuggestionSchema>;

/**
 * Analyzes user tags and suggests consolidations to reduce redundancy
 * @param tagNames Array of tag names to analyze
 * @returns Array of consolidation suggestions
 */
export async function generateTagCleanupSuggestions(
  tagNames: string[]
): Promise<TagCleanupSuggestion[]> {
  if (tagNames.length < 2) {
    return [];
  }

  const systemPrompt = `You are a tag organization expert. Analyze the provided tags and identify consolidation opportunities to reduce redundancy while maintaining semantic meaning.

Look for:
1. Semantic duplicates (react vs React vs ReactJS vs react.js)
2. Abbreviations vs full names (js vs javascript, css vs cascading-style-sheets)
3. Formatting inconsistencies (kebab-case vs camelCase vs snake_case)
4. Plural vs singular forms (tag vs tags, component vs components)
5. Similar technologies that could be grouped (nextjs vs next.js vs "next js")

Rules:
- Only suggest consolidations when tags are clearly related/similar
- Choose the most common/standard form as bestTag
- Don't consolidate conceptually different tags (react and vue are different)
- Prefer lowercase, kebab-case format when possible
- Only include refactorTags that actually exist in the input
- Each refactorTag should only appear once across all suggestions
- Minimum 2 tags per consolidation group

Return empty suggestions array if no clear consolidations are found.`;

  const prompt = `Analyze these tags for consolidation opportunities:

Tags: ${tagNames.join(", ")}

Identify which tags should be consolidated and suggest the best canonical form for each group.`;

  try {
    const { object } = await generateObject({
      model: GEMINI_MODELS.normal,
      schema: TagCleanupResponseSchema,
      system: systemPrompt,
      prompt,
    });

    // Validate and filter suggestions
    const validSuggestions = (object.suggestions || []).filter((suggestion) => {
      // Ensure all refactorTags exist in the original tagNames
      const validRefactorTags = suggestion.refactorTags.filter(tag => 
        tagNames.includes(tag) && tag !== suggestion.bestTag
      );
      
      // Only return suggestions with at least 2 tags to consolidate
      if (validRefactorTags.length < 1) {
        return false;
      }

      // Update the suggestion with valid refactor tags only
      suggestion.refactorTags = validRefactorTags;
      return true;
    });

    return validSuggestions;
  } catch (error) {
    console.error("Error generating tag cleanup suggestions:", error);
    return [];
  }
}