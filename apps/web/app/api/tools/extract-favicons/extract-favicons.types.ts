import { z } from "zod";

export const faviconInfoSchema = z.object({
  url: z.string().url(),
  type: z.enum([
    "favicon",
    "icon", 
    "apple-touch-icon",
    "apple-touch-icon-precomposed",
    "android-icon",
    "ms-tile",
    "shortcut-icon"
  ]),
  format: z.enum(["ico", "png", "svg", "jpg", "jpeg", "gif", "webp"]),
  size: z.string().optional(), // e.g., "16x16", "32x32", "192x192"
  width: z.number().optional(),
  height: z.number().optional(),
  fileSize: z.number().optional(), // in bytes
  rel: z.string().optional(), // original rel attribute
  isValid: z.boolean(),
  errorMessage: z.string().optional(),
});

export const extractFaviconsResponseSchema = z.object({
  url: z.string().url(),
  favicons: z.array(faviconInfoSchema),
  metadata: z.object({
    title: z.string().optional(),
    domain: z.string(),
    totalFavicons: z.number(),
    validFavicons: z.number(),
    standardFavicon: faviconInfoSchema.optional(), // /favicon.ico
    appleTouchIcon: faviconInfoSchema.optional(), // largest apple-touch-icon
    androidIcon: faviconInfoSchema.optional(), // largest android icon
    svgIcon: faviconInfoSchema.optional(), // SVG favicon if available
    largestIcon: faviconInfoSchema.optional(), // largest valid icon overall
  }),
});

export const extractFaviconsRequestSchema = z.object({
  url: z.string().url("Please provide a valid URL"),
});

export type FaviconInfo = z.infer<typeof faviconInfoSchema>;
export type ExtractFaviconsResponse = z.infer<typeof extractFaviconsResponseSchema>;
export type ExtractFaviconsRequest = z.infer<typeof extractFaviconsRequestSchema>;