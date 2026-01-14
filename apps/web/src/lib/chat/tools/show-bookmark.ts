import { z } from "zod";

export const showBookmarkToolDefinition = {
  description:
    "Display a single bookmark card with full details to the user. Use this to highlight a specific bookmark. The card will be rendered in the chat interface.",
  inputSchema: z.object({
    bookmark: z
      .object({
        id: z.string(),
        title: z.string().nullable(),
        url: z.string(),
        summary: z.string().nullable().optional(),
        note: z.string().nullable().optional(),
        faviconUrl: z.string().nullable().optional(),
        ogImageUrl: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
        starred: z.boolean().optional(),
        read: z.boolean().optional(),
        createdAt: z.string().optional(),
        tags: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              type: z.string(),
            }),
          )
          .optional(),
      })
      .describe("The bookmark to display"),
  }),
};
