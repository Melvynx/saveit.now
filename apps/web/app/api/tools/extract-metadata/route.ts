import { SafeRouteError } from "@/lib/errors";
import { routeClient } from "@/lib/safe-route";
import { getPostHogClient } from "@/lib/posthog";
import { getPosthogId } from "@/lib/posthog-id";
import { ANALYTICS } from "@/lib/analytics";
import * as cheerio from "cheerio";
import {
  extractMetadataRequestSchema,
  type ExtractMetadataResponse,
} from "./extract-metadata.types";

export const POST = routeClient
  .body(extractMetadataRequestSchema)
  .handler(async (req, { body }): Promise<ExtractMetadataResponse> => {
    const { url } = body;
    const posthog = getPostHogClient();
    
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const distinctId = getPosthogId(ip, userAgent);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      if (!response.ok) {
        throw new SafeRouteError("Failed to fetch the webpage", 400);
      }

    const html = await response.text();
    const $ = cheerio.load(html);

    const baseUrl = new URL(url);
    const resolveUrl = (relativeUrl: string | undefined) => {
      if (!relativeUrl) return undefined;
      try {
        if (relativeUrl.startsWith("http")) return relativeUrl;
        if (relativeUrl.startsWith("//"))
          return `${baseUrl.protocol}${relativeUrl}`;
        if (relativeUrl.startsWith("/"))
          return `${baseUrl.origin}${relativeUrl}`;
        return `${baseUrl.origin}/${relativeUrl}`;
      } catch {
        return undefined;
      }
    };

    // Extract standard meta tags
    const standard = {
      title: $("title").text() || undefined,
      description: $("meta[name='description']").attr("content") || undefined,
      keywords: $("meta[name='keywords']").attr("content") || undefined,
      author: $("meta[name='author']").attr("content") || undefined,
      generator: $("meta[name='generator']").attr("content") || undefined,
      language:
        $("html").attr("lang") ||
        $("meta[name='language']").attr("content") ||
        undefined,
      revisitAfter:
        $("meta[name='revisit-after']").attr("content") || undefined,
      rating: $("meta[name='rating']").attr("content") || undefined,
      copyright: $("meta[name='copyright']").attr("content") || undefined,
      distribution: $("meta[name='distribution']").attr("content") || undefined,
      classification:
        $("meta[name='classification']").attr("content") || undefined,
    };

    // Extract Open Graph data
    const openGraph = {
      title: $("meta[property='og:title']").attr("content") || undefined,
      description:
        $("meta[property='og:description']").attr("content") || undefined,
      type: $("meta[property='og:type']").attr("content") || undefined,
      url: $("meta[property='og:url']").attr("content") || undefined,
      siteName: $("meta[property='og:site_name']").attr("content") || undefined,
      image: {
        url: resolveUrl($("meta[property='og:image']").attr("content")),
        alt: $("meta[property='og:image:alt']").attr("content") || undefined,
        width: $("meta[property='og:image:width']").attr("content")
          ? parseInt($("meta[property='og:image:width']").attr("content")!)
          : undefined,
        height: $("meta[property='og:image:height']").attr("content")
          ? parseInt($("meta[property='og:image:height']").attr("content")!)
          : undefined,
        type: $("meta[property='og:image:type']").attr("content") || undefined,
      },
      video: {
        url: $("meta[property='og:video']").attr("content") || undefined,
        width: $("meta[property='og:video:width']").attr("content")
          ? parseInt($("meta[property='og:video:width']").attr("content")!)
          : undefined,
        height: $("meta[property='og:video:height']").attr("content")
          ? parseInt($("meta[property='og:video:height']").attr("content")!)
          : undefined,
        type: $("meta[property='og:video:type']").attr("content") || undefined,
      },
      audio: $("meta[property='og:audio']").attr("content") || undefined,
      locale: $("meta[property='og:locale']").attr("content") || undefined,
      localeAlternate: $("meta[property='og:locale:alternate']")
        .map((_, el) => $(el).attr("content"))
        .get()
        .filter(Boolean),
      determiner:
        $("meta[property='og:determiner']").attr("content") || undefined,
    };

    // Extract Twitter Card data
    const twitter = {
      card: $("meta[name='twitter:card']").attr("content") || undefined,
      site: $("meta[name='twitter:site']").attr("content") || undefined,
      creator: $("meta[name='twitter:creator']").attr("content") || undefined,
      title: $("meta[name='twitter:title']").attr("content") || undefined,
      description:
        $("meta[name='twitter:description']").attr("content") || undefined,
      image: {
        url: resolveUrl($("meta[name='twitter:image']").attr("content")),
        alt: $("meta[name='twitter:image:alt']").attr("content") || undefined,
      },
      player: {
        url: $("meta[name='twitter:player']").attr("content") || undefined,
        width: $("meta[name='twitter:player:width']").attr("content")
          ? parseInt($("meta[name='twitter:player:width']").attr("content")!)
          : undefined,
        height: $("meta[name='twitter:player:height']").attr("content")
          ? parseInt($("meta[name='twitter:player:height']").attr("content")!)
          : undefined,
        stream:
          $("meta[name='twitter:player:stream']").attr("content") || undefined,
      },
      app: {
        name: {
          iphone:
            $("meta[name='twitter:app:name:iphone']").attr("content") ||
            undefined,
          ipad:
            $("meta[name='twitter:app:name:ipad']").attr("content") ||
            undefined,
          googleplay:
            $("meta[name='twitter:app:name:googleplay']").attr("content") ||
            undefined,
        },
        id: {
          iphone:
            $("meta[name='twitter:app:id:iphone']").attr("content") ||
            undefined,
          ipad:
            $("meta[name='twitter:app:id:ipad']").attr("content") || undefined,
          googleplay:
            $("meta[name='twitter:app:id:googleplay']").attr("content") ||
            undefined,
        },
        url: {
          iphone:
            $("meta[name='twitter:app:url:iphone']").attr("content") ||
            undefined,
          ipad:
            $("meta[name='twitter:app:url:ipad']").attr("content") || undefined,
          googleplay:
            $("meta[name='twitter:app:url:googleplay']").attr("content") ||
            undefined,
        },
      },
    };

    // Extract technical meta tags
    const httpEquivTags: Record<string, string> = {};
    $("meta[http-equiv]").each((_, el) => {
      const name = $(el).attr("http-equiv");
      const content = $(el).attr("content");
      if (name && content) {
        httpEquivTags[name] = content;
      }
    });

    const technical = {
      viewport: $("meta[name='viewport']").attr("content") || undefined,
      charset: $("meta[charset]").attr("charset") || undefined,
      httpEquiv:
        Object.keys(httpEquivTags).length > 0 ? httpEquivTags : undefined,
      robots: $("meta[name='robots']").attr("content") || undefined,
      canonical: $("link[rel='canonical']").attr("href") || undefined,
      ampHtml: $("link[rel='amphtml']").attr("href") || undefined,
      manifest: $("link[rel='manifest']").attr("href") || undefined,
      themeColor: $("meta[name='theme-color']").attr("content") || undefined,
      appleMobileWebAppCapable:
        $("meta[name='apple-mobile-web-app-capable']").attr("content") ||
        undefined,
      appleMobileWebAppStatusBarStyle:
        $("meta[name='apple-mobile-web-app-status-bar-style']").attr(
          "content",
        ) || undefined,
      appleMobileWebAppTitle:
        $("meta[name='apple-mobile-web-app-title']").attr("content") ||
        undefined,
      applicationName:
        $("meta[name='application-name']").attr("content") || undefined,
      msapplicationTileColor:
        $("meta[name='msapplication-TileColor']").attr("content") || undefined,
      msapplicationTileImage:
        $("meta[name='msapplication-TileImage']").attr("content") || undefined,
    };

    // Page analysis
    const allText = $("body").text();
    const words = allText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const images = $("img");
    const links = $("a[href]");
    const internalLinks = links.filter((_, el) => {
      const href = $(el).attr("href");
      return !!(
        href &&
        (href.startsWith("/") || href.includes(baseUrl.hostname))
      );
    });
    const externalLinks = links.filter((_, el) => {
      const href = $(el).attr("href");
      return !!(
        href &&
        href.startsWith("http") &&
        !href.includes(baseUrl.hostname)
      );
    });

    const imagesWithAlt = images.filter((_, el) => !!$(el).attr("alt"));
    const imagesWithoutAlt = images.filter((_, el) => !$(el).attr("alt"));

    const pageAnalysis = {
      wordCount: words.length,
      imageCount: images.length,
      linkCount: links.length,
      internalLinkCount: internalLinks.length,
      externalLinkCount: externalLinks.length,
      headingCount: {
        h1: $("h1").length,
        h2: $("h2").length,
        h3: $("h3").length,
        h4: $("h4").length,
        h5: $("h5").length,
        h6: $("h6").length,
      },
      hasAltText: imagesWithAlt.length,
      missingAltText: imagesWithoutAlt.length,
    };

      const result = {
        url,
        metadata: {
          standard,
          openGraph,
          twitter,
          technical,
          pageAnalysis,
        },
        extractedAt: new Date().toISOString(),
      };

      // Track tool usage
      posthog.capture({
        distinctId,
        event: ANALYTICS.TOOL_USED,
        properties: {
          tool_name: "extract-metadata",
        },
      });

      return result;
    } catch (error) {
      // Track tool usage
      posthog.capture({
        distinctId,
        event: ANALYTICS.TOOL_USED,
        properties: {
          tool_name: "extract-metadata",
        },
      });

      throw error;
    }
  });
