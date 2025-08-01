import { z } from "zod";

export const youtubeThumbnailSchema = z.object({
  url: z.string().url(),
  width: z.number(),
  height: z.number(),
  quality: z.enum(["default", "mqdefault", "hqdefault", "sddefault", "maxresdefault"]),
});

export const youtubeVideoMetadataSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  channelTitle: z.string().optional(),
  channelId: z.string().optional(),
  publishedAt: z.string().optional(),
  duration: z.string().optional(),
  viewCount: z.string().optional(),
  thumbnails: z.array(youtubeThumbnailSchema),
  url: z.string().url(),
});

export const extractYoutubeMetadataResponseSchema = z.object({
  success: z.boolean(),
  data: youtubeVideoMetadataSchema.optional(),
  error: z.string().optional(),
});

export const extractYoutubeMetadataRequestSchema = z.object({
  url: z.string().url("Please provide a valid YouTube URL"),
});

export type YoutubeThumbnail = z.infer<typeof youtubeThumbnailSchema>;
export type YoutubeVideoMetadata = z.infer<typeof youtubeVideoMetadataSchema>;
export type ExtractYoutubeMetadataResponse = z.infer<typeof extractYoutubeMetadataResponseSchema>;
export type ExtractYoutubeMetadataRequest = z.infer<typeof extractYoutubeMetadataRequestSchema>;