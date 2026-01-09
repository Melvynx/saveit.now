import { z } from "zod";

export const showBookmarksToolDefinition = {
  description:
    "Display a grid of bookmark cards to the user. Use this after searching to visually show the results. The cards will be rendered in the chat interface.",
  inputSchema: z.object({
    bookmarks: z
      .array(
        z.object({
          id: z.string(),
          title: z.string().nullable(),
          url: z.string(),
          summary: z.string().nullable().optional(),
          faviconUrl: z.string().nullable().optional(),
          type: z.string().nullable().optional(),
          starred: z.boolean().optional(),
          tags: z.array(z.string()).optional(),
        }),
      )
      .describe("Array of bookmarks to display"),
    title: z
      .string()
      .optional()
      .describe("Optional title to display above the grid"),
  }),
};
