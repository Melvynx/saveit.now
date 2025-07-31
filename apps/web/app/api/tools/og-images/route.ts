import { SafeRouteError } from "@/lib/errors";
import { routeClient } from "@/lib/safe-route";
import * as cheerio from "cheerio";
import { z } from "zod";

const requestSchema = z.object({
  url: z.string().url("Please provide a valid URL"),
});

export const POST = routeClient
  .body(requestSchema)
  .handler(async (_, { body }) => {
    const { url } = body;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    console.log(response);

    if (!response.ok) {
      throw new SafeRouteError("Failed to fetch the webpage", 400);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const ogImage = $("meta[property='og:image']").attr("content");
    const ogImageAlt = $("meta[property='og:image:alt']").attr("content");
    const ogImageWidth = $("meta[property='og:image:width']").attr("content");
    const ogImageHeight = $("meta[property='og:image:height']").attr("content");
    
    const twitterImage = $("meta[name='twitter:image']").attr("content");
    const twitterImageAlt = $("meta[name='twitter:image:alt']").attr("content");
    
    const ogTitle = $("meta[property='og:title']").attr("content");
    const ogDescription = $("meta[property='og:description']").attr("content");
    const ogSiteName = $("meta[property='og:site_name']").attr("content");
    const ogType = $("meta[property='og:type']").attr("content");
    
    const twitterCard = $("meta[name='twitter:card']").attr("content");
    const twitterTitle = $("meta[name='twitter:title']").attr("content");
    const twitterDescription = $("meta[name='twitter:description']").attr("content");
    const twitterSite = $("meta[name='twitter:site']").attr("content");
    const twitterCreator = $("meta[name='twitter:creator']").attr("content");

    const pageTitle = $("title").text();
    const metaDescription = $("meta[name='description']").attr("content");

    const baseUrl = new URL(url);
    const resolveUrl = (imageUrl: string | undefined) => {
      if (!imageUrl) return undefined;
      try {
        if (imageUrl.startsWith("http")) return imageUrl;
        if (imageUrl.startsWith("//")) return `${baseUrl.protocol}${imageUrl}`;
        if (imageUrl.startsWith("/")) return `${baseUrl.origin}${imageUrl}`;
        return `${baseUrl.origin}/${imageUrl}`;
      } catch {
        return undefined;
      }
    };

    const resolvedOgImage = resolveUrl(ogImage);
    const resolvedTwitterImage = resolveUrl(twitterImage);

    return {
      url,
      metadata: {
        openGraph: {
          title: ogTitle || pageTitle,
          description: ogDescription || metaDescription,
          siteName: ogSiteName,
          type: ogType || "website",
          image: {
            url: resolvedOgImage,
            alt: ogImageAlt,
            width: ogImageWidth ? parseInt(ogImageWidth) : undefined,
            height: ogImageHeight ? parseInt(ogImageHeight) : undefined,
          },
        },
        twitter: {
          card: twitterCard || "summary",
          title: twitterTitle || ogTitle || pageTitle,
          description: twitterDescription || ogDescription || metaDescription,
          site: twitterSite,
          creator: twitterCreator,
          image: {
            url: resolvedTwitterImage || resolvedOgImage,
            alt: twitterImageAlt || ogImageAlt,
          },
        },
        page: {
          title: pageTitle,
          description: metaDescription,
        },
        images: {
          ogImage: resolvedOgImage,
          twitterImage: resolvedTwitterImage,
          primary: resolvedOgImage || resolvedTwitterImage,
        },
      },
    };
  });