import { z } from "zod";

export const extractContentResponseSchema = z.object({
  url: z.string(),
  content: z.object({
    title: z.string(),
    plainText: z.string(),
    markdown: z.string(),
    statistics: z.object({
      wordCount: z.number(),
      charCount: z.number(),
      paragraphCount: z.number(),
      readingTime: z.number(),
    }),
  }),
  metadata: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    siteName: z.string().optional(),
    author: z.string().optional(),
    publishedDate: z.string().optional(),
    faviconUrl: z.string().optional(),
    ogImageUrl: z.string().optional(),
  }),
});

export const extractContentRequestSchema = z.object({
  url: z.string().url("Please provide a valid URL"),
});

export type ExtractContentResponse = z.infer<typeof extractContentResponseSchema>;
export type ExtractContentRequest = z.infer<typeof extractContentRequestSchema>;