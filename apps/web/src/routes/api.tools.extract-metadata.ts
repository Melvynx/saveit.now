import {
  captureToolUsage,
  fetchHtml,
  resolveUrl,
  toolErrorResponse,
} from "@/lib/tools/tool-route-utils";
import {
  extractMetadataRequestSchema,
  type ExtractMetadataResponse,
} from "@/lib/tools/schemas/extract-metadata";
import { createFileRoute } from "@tanstack/react-router";
import * as cheerio from "cheerio";

export const Route = createFileRoute("/api/tools/extract-metadata")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { url } = extractMetadataRequestSchema.parse(
            await request.json(),
          );
          const html = await fetchHtml(url);
          const $ = cheerio.load(html);
          const baseUrl = new URL(url);

          const getMetaName = (name: string) =>
            $(`meta[name='${name}']`).attr("content");
          const getMetaProperty = (property: string) =>
            $(`meta[property='${property}']`).attr("content");
          const toNumber = (value: string | undefined) =>
            value ? Number.parseInt(value, 10) || undefined : undefined;

          const allLinks = $("a[href]").toArray();
          const internalLinkCount = allLinks.filter((element) => {
            const href = $(element).attr("href");
            const resolved = resolveUrl(baseUrl, href);
            return resolved ? new URL(resolved).hostname === baseUrl.hostname : false;
          }).length;
          const imageCount = $("img").length;
          const hasAltText = $("img[alt]").length;
          const httpEquiv: Record<string, string> = {};
          $("meta[http-equiv]").each((_, element) => {
            const key = $(element).attr("http-equiv");
            const value = $(element).attr("content");
            if (key && value) httpEquiv[key] = value;
          });

          const result: ExtractMetadataResponse = {
            url,
            metadata: {
              standard: {
                title: $("title").text() || undefined,
                description: getMetaName("description"),
                keywords: getMetaName("keywords"),
                author: getMetaName("author"),
                generator: getMetaName("generator"),
                language:
                  $("html").attr("lang") ??
                  getMetaName("language") ??
                  getMetaProperty("og:locale"),
                revisitAfter: getMetaName("revisit-after"),
                rating: getMetaName("rating"),
                copyright: getMetaName("copyright"),
                distribution: getMetaName("distribution"),
                classification: getMetaName("classification"),
              },
              openGraph: {
                title: getMetaProperty("og:title"),
                description: getMetaProperty("og:description"),
                type: getMetaProperty("og:type"),
                url: getMetaProperty("og:url"),
                siteName: getMetaProperty("og:site_name"),
                image: {
                  url: resolveUrl(baseUrl, getMetaProperty("og:image")),
                  alt: getMetaProperty("og:image:alt"),
                  width: toNumber(getMetaProperty("og:image:width")),
                  height: toNumber(getMetaProperty("og:image:height")),
                  type: getMetaProperty("og:image:type"),
                },
                video: {
                  url: resolveUrl(baseUrl, getMetaProperty("og:video")),
                  width: toNumber(getMetaProperty("og:video:width")),
                  height: toNumber(getMetaProperty("og:video:height")),
                  type: getMetaProperty("og:video:type"),
                },
                audio: resolveUrl(baseUrl, getMetaProperty("og:audio")),
                locale: getMetaProperty("og:locale"),
                localeAlternate: $("meta[property='og:locale:alternate']")
                  .toArray()
                  .map((element) => $(element).attr("content"))
                  .filter((value): value is string => Boolean(value)),
                determiner: getMetaProperty("og:determiner"),
              },
              twitter: {
                card: getMetaName("twitter:card"),
                site: getMetaName("twitter:site"),
                creator: getMetaName("twitter:creator"),
                title: getMetaName("twitter:title"),
                description: getMetaName("twitter:description"),
                image: {
                  url: resolveUrl(baseUrl, getMetaName("twitter:image")),
                  alt: getMetaName("twitter:image:alt"),
                },
                player: {
                  url: resolveUrl(baseUrl, getMetaName("twitter:player")),
                  width: toNumber(getMetaName("twitter:player:width")),
                  height: toNumber(getMetaName("twitter:player:height")),
                  stream: resolveUrl(
                    baseUrl,
                    getMetaName("twitter:player:stream"),
                  ),
                },
                app: {
                  name: {
                    iphone: getMetaName("twitter:app:name:iphone"),
                    ipad: getMetaName("twitter:app:name:ipad"),
                    googleplay: getMetaName("twitter:app:name:googleplay"),
                  },
                  id: {
                    iphone: getMetaName("twitter:app:id:iphone"),
                    ipad: getMetaName("twitter:app:id:ipad"),
                    googleplay: getMetaName("twitter:app:id:googleplay"),
                  },
                  url: {
                    iphone: getMetaName("twitter:app:url:iphone"),
                    ipad: getMetaName("twitter:app:url:ipad"),
                    googleplay: getMetaName("twitter:app:url:googleplay"),
                  },
                },
              },
              technical: {
                viewport: getMetaName("viewport"),
                charset: $("meta[charset]").attr("charset"),
                httpEquiv,
                robots: getMetaName("robots"),
                canonical: resolveUrl(baseUrl, $("link[rel='canonical']").attr("href")),
                ampHtml: resolveUrl(baseUrl, $("link[rel='amphtml']").attr("href")),
                manifest: resolveUrl(baseUrl, $("link[rel='manifest']").attr("href")),
                themeColor: getMetaName("theme-color"),
                appleMobileWebAppCapable: getMetaName(
                  "apple-mobile-web-app-capable",
                ),
                appleMobileWebAppStatusBarStyle: getMetaName(
                  "apple-mobile-web-app-status-bar-style",
                ),
                appleMobileWebAppTitle: getMetaName(
                  "apple-mobile-web-app-title",
                ),
                applicationName: getMetaName("application-name"),
                msapplicationTileColor: getMetaName("msapplication-TileColor"),
                msapplicationTileImage: resolveUrl(
                  baseUrl,
                  getMetaName("msapplication-TileImage"),
                ),
              },
              pageAnalysis: {
                wordCount: $("body").text().trim().split(/\s+/).filter(Boolean)
                  .length,
                imageCount,
                linkCount: allLinks.length,
                internalLinkCount,
                externalLinkCount: allLinks.length - internalLinkCount,
                headingCount: {
                  h1: $("h1").length,
                  h2: $("h2").length,
                  h3: $("h3").length,
                  h4: $("h4").length,
                  h5: $("h5").length,
                  h6: $("h6").length,
                },
                hasAltText,
                missingAltText: imageCount - hasAltText,
              },
            },
            extractedAt: new Date().toISOString(),
          };

          await captureToolUsage(request, "extract-metadata");
          return Response.json(result);
        } catch (error) {
          await captureToolUsage(request, "extract-metadata");
          return toolErrorResponse(error);
        }
      },
    },
  },
});
