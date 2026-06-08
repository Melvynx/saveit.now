import { z } from "zod";

export const ogImageResponseSchema = z.object({
  url: z.string(),
  metadata: z.object({
    openGraph: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      siteName: z.string().optional(),
      type: z.string().optional(),
      image: z.object({
        url: z.string().optional(),
        alt: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      }),
    }),
    twitter: z.object({
      card: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      site: z.string().optional(),
      creator: z.string().optional(),
      image: z.object({
        url: z.string().optional(),
        alt: z.string().optional(),
      }),
    }),
    page: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
    }),
    images: z.object({
      ogImage: z.string().optional(),
      twitterImage: z.string().optional(),
      primary: z.string().optional(),
    }),
  }),
});

export const ogImageRequestSchema = z.object({
  url: z.string().url("Please provide a valid URL"),
});

export type OGImageResponse = z.infer<typeof ogImageResponseSchema>;
export type OGImageRequest = z.infer<typeof ogImageRequestSchema>;