import { upfetch } from "@/lib/up-fetch";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";

const TagCleanupSuggestionSchema = z.object({
  bestTag: z.string(),
  bestTagExists: z.boolean(),
  bestTagId: z.string().optional(),
  bestTagBookmarkCount: z.number(),
  refactorTags: z.array(z.object({
    id: z.string(),
    name: z.string(),
    bookmarkCount: z.number(),
  })),
  totalBookmarks: z.number(),
});

const TagCleanupResponseSchema = z.object({
  suggestions: z.array(TagCleanupSuggestionSchema),
  totalTags: z.number(),
});

export type TagCleanupSuggestion = z.infer<typeof TagCleanupSuggestionSchema>;
export type TagCleanupResponse = z.infer<typeof TagCleanupResponseSchema>;

export function useTagCleanup() {
  return useMutation({
    mutationFn: async (): Promise<TagCleanupResponse> => {
      return await upfetch("/api/tags/cleanup", {
        method: "POST",
        schema: TagCleanupResponseSchema,
      });
    },
    mutationKey: ["tag-cleanup"],
  });
}