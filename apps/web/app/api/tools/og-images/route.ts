import { upfetch } from "@/lib/up-fetch";
import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  url: z.string().url("Please provide a valid URL"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = requestSchema.parse(body);

    // Fetch the webpage
    const response = await upfetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch the webpage" },
        { status: 400 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract all relevant meta tags
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

    // Extract page title as fallback
    const pageTitle = $("title").text();
    const metaDescription = $("meta[name='description']").attr("content");

    // Resolve relative URLs to absolute URLs
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

    return NextResponse.json({
      url,
      metadata: {
        // Open Graph data
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
        // Twitter Card data
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
        // Page metadata
        page: {
          title: pageTitle,
          description: metaDescription,
        },
        // Quick access to images
        images: {
          ogImage: resolvedOgImage,
          twitterImage: resolvedTwitterImage,
          primary: resolvedOgImage || resolvedTwitterImage,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Invalid request data" },
        { status: 400 }
      );
    }

    console.error("OG image extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract metadata from the URL" },
      { status: 500 }
    );
  }
}