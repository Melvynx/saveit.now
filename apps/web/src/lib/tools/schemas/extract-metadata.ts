import { z } from "zod";

export const extractMetadataRequestSchema = z.object({
  url: z.string().url("Please provide a valid URL"),
});

export const pageAnalysisSchema = z.object({
  wordCount: z.number(),
  imageCount: z.number(),
  linkCount: z.number(),
  internalLinkCount: z.number(),
  externalLinkCount: z.number(),
  headingCount: z.object({
    h1: z.number(),
    h2: z.number(),
    h3: z.number(),
    h4: z.number(),
    h5: z.number(),
    h6: z.number(),
  }),
  hasAltText: z.number(),
  missingAltText: z.number(),
  loadTime: z.number().optional(),
});

export const technicalMetaSchema = z.object({
  viewport: z.string().optional(),
  charset: z.string().optional(),
  httpEquiv: z.record(z.string(), z.string()).optional(),
  robots: z.string().optional(),
  canonical: z.string().optional(),
  ampHtml: z.string().optional(),
  manifest: z.string().optional(),
  themeColor: z.string().optional(),
  appleMobileWebAppCapable: z.string().optional(),
  appleMobileWebAppStatusBarStyle: z.string().optional(),
  appleMobileWebAppTitle: z.string().optional(),
  applicationName: z.string().optional(),
  msapplicationTileColor: z.string().optional(),
  msapplicationTileImage: z.string().optional(),
});

export const standardMetaSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  keywords: z.string().optional(),
  author: z.string().optional(),
  generator: z.string().optional(),
  language: z.string().optional(),
  revisitAfter: z.string().optional(),
  rating: z.string().optional(),
  copyright: z.string().optional(),
  distribution: z.string().optional(),
  classification: z.string().optional(),
});

export const openGraphSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  url: z.string().optional(),
  siteName: z.string().optional(),
  image: z
    .object({
      url: z.string().optional(),
      alt: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      type: z.string().optional(),
    })
    .optional(),
  video: z
    .object({
      url: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      type: z.string().optional(),
    })
    .optional(),
  audio: z.string().optional(),
  locale: z.string().optional(),
  localeAlternate: z.array(z.string()).optional(),
  determiner: z.string().optional(),
});

export const twitterCardSchema = z.object({
  card: z.string().optional(),
  site: z.string().optional(),
  creator: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  image: z
    .object({
      url: z.string().optional(),
      alt: z.string().optional(),
    })
    .optional(),
  player: z
    .object({
      url: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      stream: z.string().optional(),
    })
    .optional(),
  app: z
    .object({
      name: z
        .object({
          iphone: z.string().optional(),
          ipad: z.string().optional(),
          googleplay: z.string().optional(),
        })
        .optional(),
      id: z
        .object({
          iphone: z.string().optional(),
          ipad: z.string().optional(),
          googleplay: z.string().optional(),
        })
        .optional(),
      url: z
        .object({
          iphone: z.string().optional(),
          ipad: z.string().optional(),
          googleplay: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

export const extractMetadataResponseSchema = z.object({
  url: z.string(),
  metadata: z.object({
    standard: standardMetaSchema,
    openGraph: openGraphSchema,
    twitter: twitterCardSchema,
    technical: technicalMetaSchema,
    pageAnalysis: pageAnalysisSchema,
  }),
  extractedAt: z.string(),
});

export type ExtractMetadataRequest = z.infer<
  typeof extractMetadataRequestSchema
>;
export type ExtractMetadataResponse = z.infer<
  typeof extractMetadataResponseSchema
>;
export type PageAnalysis = z.infer<typeof pageAnalysisSchema>;
export type TechnicalMeta = z.infer<typeof technicalMetaSchema>;
export type StandardMeta = z.infer<typeof standardMetaSchema>;
export type OpenGraphData = z.infer<typeof openGraphSchema>;
export type TwitterCardData = z.infer<typeof twitterCardSchema>;
