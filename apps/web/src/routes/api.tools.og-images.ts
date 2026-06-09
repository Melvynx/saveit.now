import {
  captureToolUsage,
  fetchHtml,
  resolveUrl,
  toolErrorResponse,
} from "@/lib/tools/tool-route-utils";
import {
  ogImageRequestSchema,
  type OGImageResponse,
} from "@/lib/tools/schemas/og-images";
import { createFileRoute } from "@tanstack/react-router";
import * as cheerio from "cheerio";

export const Route = createFileRoute("/api/tools/og-images")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { url } = ogImageRequestSchema.parse(await request.json());
          const html = await fetchHtml(url);
          const $ = cheerio.load(html);
          const baseUrl = new URL(url);

          const ogImage = $("meta[property='og:image']").attr("content");
          const twitterImage = $("meta[name='twitter:image']").attr("content");
          const resolvedOgImage = resolveUrl(baseUrl, ogImage);
          const resolvedTwitterImage = resolveUrl(baseUrl, twitterImage);
          const pageTitle = $("title").text();
          const metaDescription = $("meta[name='description']").attr("content");

          const result: OGImageResponse = {
            url,
            metadata: {
              openGraph: {
                title: $("meta[property='og:title']").attr("content") ?? pageTitle,
                description:
                  $("meta[property='og:description']").attr("content") ??
                  metaDescription,
                siteName: $("meta[property='og:site_name']").attr("content"),
                type: $("meta[property='og:type']").attr("content") ?? "website",
                image: {
                  url: resolvedOgImage,
                  alt: $("meta[property='og:image:alt']").attr("content"),
                  width: Number(
                    $("meta[property='og:image:width']").attr("content"),
                  ) || undefined,
                  height: Number(
                    $("meta[property='og:image:height']").attr("content"),
                  ) || undefined,
                },
              },
              twitter: {
                card: $("meta[name='twitter:card']").attr("content") ?? "summary",
                title:
                  $("meta[name='twitter:title']").attr("content") ??
                  $("meta[property='og:title']").attr("content") ??
                  pageTitle,
                description:
                  $("meta[name='twitter:description']").attr("content") ??
                  $("meta[property='og:description']").attr("content") ??
                  metaDescription,
                site: $("meta[name='twitter:site']").attr("content"),
                creator: $("meta[name='twitter:creator']").attr("content"),
                image: {
                  url: resolvedTwitterImage ?? resolvedOgImage,
                  alt:
                    $("meta[name='twitter:image:alt']").attr("content") ??
                    $("meta[property='og:image:alt']").attr("content"),
                },
              },
              page: {
                title: pageTitle,
                description: metaDescription,
              },
              images: {
                ogImage: resolvedOgImage,
                twitterImage: resolvedTwitterImage,
                primary: resolvedOgImage ?? resolvedTwitterImage,
              },
            },
          };

          await captureToolUsage(request, "og-images");
          return Response.json(result);
        } catch (error) {
          await captureToolUsage(request, "og-images");
          return toolErrorResponse(error);
        }
      },
    },
  },
});
