// httpActions MUST run in the default (V8) runtime — never "use node".
import { httpAction } from "../_generated/server";
import { z } from "zod";
import { assertSafeHttpUrl } from "../utils/url";

// ---------------------------------------------------------------------------
// Shared constants / utilities
// ---------------------------------------------------------------------------

const TOOL_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
const MAX_HTML_BYTES = 1_000_000;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 5;

function resolveUrl(
  baseUrl: URL,
  value: string | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  try {
    if (value.startsWith("http")) return value;
    if (value.startsWith("//")) return `${baseUrl.protocol}${value}`;
    return new URL(value, baseUrl.origin).href;
  } catch {
    return undefined;
  }
}

async function fetchHtml(url: string, redirects = 0): Promise<string> {
  const safeUrl = assertSafeHttpUrl(url);
  const response = await fetch(safeUrl, {
    headers: { "User-Agent": TOOL_USER_AGENT },
    redirect: "manual",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (response.status >= 300 && response.status < 400) {
    if (redirects >= MAX_REDIRECTS) throw new Error("Too many redirects");
    const location = response.headers.get("location");
    if (!location) throw new Error("Redirect missing location");
    return fetchHtml(new URL(location, safeUrl).toString(), redirects + 1);
  }
  if (!response.ok) {
    throw new Error("Failed to fetch the webpage");
  }
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_HTML_BYTES) {
    throw new Error("Response is too large");
  }
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_HTML_BYTES) {
    throw new Error("Response is too large");
  }
  return text;
}

function toolErrorResponse(error: unknown): Response {
  if (error instanceof z.ZodError) {
    return Response.json(
      {
        error: "VALIDATION_ERROR",
        issues: (error as z.ZodError).issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }
  const msg = error instanceof Error ? error.message : "Tool request failed";
  return Response.json({ error: msg }, { status: 400 });
}

function corsHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// ---------------------------------------------------------------------------
// POST /api/tools/extract-content
// Spec 12 §2.13
// ---------------------------------------------------------------------------
export const extractContent = httpAction(async (_ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  try {
    const body = await request.json();
    const { url } = z
      .object({ url: z.string().url("Please provide a valid URL") })
      .parse(body);

    const cheerio = await import("cheerio");
    const TurndownService = (await import("turndown")).default;

    const html = await fetchHtml(url);
    const baseUrl = new URL(url);
    const $ = cheerio.load(html);

    // Title extraction
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("h1").first().text().trim() ||
      $("title").text().trim() ||
      baseUrl.hostname;

    // Favicon
    const faviconRel =
      $('link[rel="icon"][sizes="32x32"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href") ||
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="apple-touch-icon"]').attr("href");
    const faviconUrl =
      (faviconRel ? resolveUrl(baseUrl, faviconRel) : undefined) ??
      `${baseUrl.origin}/favicon.ico`;

    // OG image
    const ogImageUrl = resolveUrl(
      baseUrl,
      $('meta[property="og:image"]').attr("content"),
    );

    // Metadata fields
    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "";
    const siteName = $('meta[property="og:site_name"]').attr("content") || "";
    const author = $('meta[name="author"]').attr("content") || "";
    const publishedDate =
      $('meta[property="article:published_time"]').attr("content") || "";

    // Remove non-content elements
    $("script, style, link, meta, noscript, iframe, svg").remove();

    // Article selection
    const articleEl =
      $("article").length > 0
        ? $("article")
        : $("main").length > 0
          ? $("main")
          : $('[role="main"]').length > 0
            ? $('[role="main"]')
            : $(".content,.post-content,.entry-content,.article-content")
                  .length > 0
              ? $(".content,.post-content,.entry-content,.article-content")
              : $("body");

    const td = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
    });

    const markdown = td.turndown(articleEl.html() || "");

    // Plain text
    $("nav, header, footer, aside").remove();
    const plainText = $("body").text().replace(/\s+/g, " ").trim();

    const wordCount = plainText.split(/\s+/).filter((w) => w.length > 0).length;
    const charCount = plainText.length;
    const readingTime = Math.ceil(wordCount / 225);
    const paragraphCount = plainText
      .split(/\n\s*\n|\.\s+(?=[A-Z])/)
      .filter((p) => p.trim().length > 10).length;

    return Response.json(
      {
        url,
        content: {
          title,
          plainText,
          markdown,
          statistics: { wordCount, charCount, paragraphCount, readingTime },
        },
        metadata: {
          title,
          description,
          siteName,
          author,
          publishedDate,
          faviconUrl,
          ogImageUrl: ogImageUrl ?? null,
        },
      },
      { headers: corsHeaders() },
    );
  } catch (err) {
    return toolErrorResponse(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/tools/extract-metadata
// Spec 12 §2.14
// ---------------------------------------------------------------------------
export const extractMetadata = httpAction(async (_ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  try {
    const body = await request.json();
    const { url } = z.object({ url: z.string().url() }).parse(body);

    const cheerio = await import("cheerio");
    const html = await fetchHtml(url);
    const baseUrl = new URL(url);
    const $ = cheerio.load(html);

    const getMeta = (name: string) =>
      $(`meta[name="${name}"]`).attr("content") ?? null;
    const getOg = (property: string) =>
      $(`meta[property="og:${property}"]`).attr("content") ?? null;
    const getTw = (name: string) =>
      $(`meta[name="twitter:${name}"]`).attr("content") ?? null;

    // Standard meta
    const standard = {
      title: $("title").text().trim() || null,
      description: getMeta("description"),
      keywords: getMeta("keywords"),
      author: getMeta("author"),
      generator: getMeta("generator"),
      language: $("html").attr("lang") || getMeta("language"),
      revisitAfter: getMeta("revisit-after"),
      rating: getMeta("rating"),
      copyright: getMeta("copyright"),
      distribution: getMeta("distribution"),
      classification: getMeta("classification"),
    };

    // OpenGraph
    const openGraph = {
      title: getOg("title"),
      description: getOg("description"),
      type: getOg("type"),
      url: getOg("url"),
      siteName: getOg("site_name"),
      image: {
        url: getOg("image") ? resolveUrl(baseUrl, getOg("image")!) : null,
        alt: getOg("image:alt"),
        width: getOg("image:width"),
        height: getOg("image:height"),
        type: getOg("image:type"),
      },
      video: getOg("video"),
      audio: getOg("audio"),
      locale: getOg("locale"),
      localeAlternate: getOg("locale:alternate"),
      determiner: getOg("determiner"),
    };

    // Twitter
    const twitter = {
      card: getTw("card"),
      site: getTw("site"),
      creator: getTw("creator"),
      title: getTw("title"),
      description: getTw("description"),
      image: {
        url: getTw("image") ? resolveUrl(baseUrl, getTw("image")!) : null,
        alt: getTw("image:alt"),
      },
      player: {
        url: getTw("player"),
        width: getTw("player:width"),
        height: getTw("player:height"),
        stream: getTw("player:stream"),
      },
      app: {
        iphone: {
          name: getTw("app:name:iphone"),
          id: getTw("app:id:iphone"),
          url: getTw("app:url:iphone"),
        },
        ipad: {
          name: getTw("app:name:ipad"),
          id: getTw("app:id:ipad"),
          url: getTw("app:url:ipad"),
        },
        googleplay: {
          name: getTw("app:name:googleplay"),
          id: getTw("app:id:googleplay"),
          url: getTw("app:url:googleplay"),
        },
      },
    };

    // Technical
    const technical = {
      viewport: getMeta("viewport"),
      charset:
        $("meta[charset]").attr("charset") ||
        $('meta[http-equiv="Content-Type"]').attr("content") ||
        null,
      httpEquiv: $("meta[http-equiv]").first().attr("content") || null,
      robots: getMeta("robots"),
      canonical: $('link[rel="canonical"]').attr("href") || null,
      ampHtml: $('link[rel="amphtml"]').attr("href") || null,
      manifest: $('link[rel="manifest"]').attr("href") || null,
      themeColor: getMeta("theme-color"),
      appleMobileWebAppCapable: getMeta("apple-mobile-web-app-capable"),
      appleMobileWebAppStatusBarStyle: getMeta(
        "apple-mobile-web-app-status-bar-style",
      ),
      appleMobileWebAppTitle: getMeta("apple-mobile-web-app-title"),
      applicationName: getMeta("application-name"),
      msapplicationTileColor: getMeta("msapplication-TileColor"),
      msapplicationTileImage: getMeta("msapplication-TileImage"),
    };

    // Page analysis
    const bodyText = $("body").text().trim();
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
    const allLinks = $("a[href]");
    let internalLinkCount = 0;
    let externalLinkCount = 0;
    allLinks.each((_, el) => {
      const href = $(el).attr("href") ?? "";
      try {
        const resolved = new URL(href, baseUrl.origin);
        if (resolved.hostname === baseUrl.hostname) {
          internalLinkCount++;
        } else {
          externalLinkCount++;
        }
      } catch {
        internalLinkCount++; // relative links count as internal
      }
    });
    const imageCount = $("img").length;
    const hasAltText = $("img[alt]").length;
    const missingAltText = imageCount - hasAltText;
    const headingCount = {
      h1: $("h1").length,
      h2: $("h2").length,
      h3: $("h3").length,
      h4: $("h4").length,
      h5: $("h5").length,
      h6: $("h6").length,
    };

    return Response.json(
      {
        url,
        metadata: {
          standard,
          openGraph,
          twitter,
          technical,
          pageAnalysis: {
            wordCount,
            imageCount,
            linkCount: allLinks.length,
            internalLinkCount,
            externalLinkCount,
            headingCount,
            hasAltText,
            missingAltText,
          },
        },
        extractedAt: new Date().toISOString(),
      },
      { headers: corsHeaders() },
    );
  } catch (err) {
    return toolErrorResponse(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/tools/extract-favicons
// Spec 12 §2.15
// ---------------------------------------------------------------------------

const STANDARD_FAVICON_PATHS = [
  "/favicon.ico",
  "/favicon.png",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/apple-touch-icon-152x152.png",
  "/apple-touch-icon-180x180.png",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

const FAVICON_FORMATS = ["ico", "png", "svg", "jpg", "jpeg", "gif", "webp"];

function categorizeFaviconType(rel: string, href: string): string {
  if (rel.includes("apple-touch-icon-precomposed"))
    return "apple-touch-icon-precomposed";
  if (rel.includes("apple-touch-icon")) return "apple-touch-icon";
  if (href.includes("android") || rel.includes("android"))
    return "android-icon";
  if (rel.includes("shortcut")) return "shortcut-icon";
  if (rel === "icon") return "icon";
  if (href.includes("favicon")) return "favicon";
  return "icon";
}

async function validateFavicon(
  url: string,
): Promise<{ isValid: boolean; contentType?: string; errorMessage?: string }> {
  try {
    const safeUrl = assertSafeHttpUrl(url);
    const resp = await fetch(safeUrl, {
      method: "HEAD",
      headers: { "User-Agent": TOOL_USER_AGENT },
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) {
      return { isValid: false, errorMessage: `HTTP ${resp.status}` };
    }
    const ct = resp.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) {
      return {
        isValid: false,
        errorMessage: `Non-image content-type: ${ct}`,
      };
    }
    return { isValid: true, contentType: ct };
  } catch (e) {
    return { isValid: false, errorMessage: String(e) };
  }
}

export const extractFavicons = httpAction(async (_ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  try {
    const body = await request.json();
    const { url } = z.object({ url: z.string().url() }).parse(body);

    const cheerio = await import("cheerio");
    const html = await fetchHtml(url);
    const baseUrl = new URL(url);
    const $ = cheerio.load(html);

    type FaviconCandidate = {
      url: string;
      type: string;
      format: string;
      rel: string;
      width?: number;
      height?: number;
    };

    const candidates: FaviconCandidate[] = [];

    // Collect from <link> tags
    $("link[rel]").each((_, el) => {
      const rel = $(el).attr("rel") ?? "";
      const href = $(el).attr("href");
      if (!href) return;
      const faviconRels = [
        "icon",
        "shortcut icon",
        "apple-touch-icon",
        "apple-touch-icon-precomposed",
      ];
      if (!faviconRels.some((r) => rel.toLowerCase().includes(r))) return;

      const resolved = resolveUrl(baseUrl, href);
      if (!resolved) return;

      const sizes = $(el).attr("sizes") ?? "";
      const widthMatch = sizes.match(/^(\d+)x(\d+)$/);
      const width = widthMatch ? parseInt(widthMatch[1]!) : undefined;
      const height = widthMatch ? parseInt(widthMatch[2]!) : undefined;

      const ext =
        new URL(resolved).pathname.split(".").pop()?.toLowerCase() ?? "ico";
      const format = FAVICON_FORMATS.includes(ext) ? ext : "ico";

      candidates.push({
        url: resolved,
        type: categorizeFaviconType(rel.toLowerCase(), href),
        format,
        rel,
        width,
        height,
      });
    });

    // Standard paths
    for (const stdPath of STANDARD_FAVICON_PATHS) {
      const resolved = `${baseUrl.origin}${stdPath}`;
      if (!candidates.find((c) => c.url === resolved)) {
        const ext = stdPath.split(".").pop()?.toLowerCase() ?? "ico";
        candidates.push({
          url: resolved,
          type: "favicon",
          format: FAVICON_FORMATS.includes(ext) ? ext : "ico",
          rel: "",
        });
      }
    }

    // Deduplicate by URL (first occurrence)
    const seen = new Set<string>();
    const unique = candidates.filter((c) => {
      if (seen.has(c.url)) return false;
      seen.add(c.url);
      return true;
    });

    // Validate in parallel
    const results = await Promise.all(
      unique.map(async (c) => {
        const validation = await validateFavicon(c.url);
        return {
          ...c,
          isValid: validation.isValid,
          fileSize: null as number | null,
          size: c.width && c.height ? `${c.width}x${c.height}` : null,
          errorMessage: validation.errorMessage ?? null,
        };
      }),
    );

    // Summaries
    const validItems = results.filter((r) => r.isValid);
    const appleTouchIcon =
      validItems
        .filter((r) => r.type === "apple-touch-icon")
        .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;
    const androidIcon =
      validItems
        .filter((r) => r.type === "android-icon")
        .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;
    const svgIcon = validItems.find((r) => r.format === "svg")?.url ?? null;
    const largestIcon =
      validItems
        .filter((r) => r.width)
        .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;
    const standardFavicon =
      validItems.find((r) => r.type === "favicon" || r.format === "ico")?.url ??
      null;

    return Response.json(
      {
        url,
        favicons: results,
        metadata: {
          title: $("title").text().trim() || null,
          domain: baseUrl.hostname,
          totalFavicons: results.length,
          validFavicons: validItems.length,
          standardFavicon,
          appleTouchIcon,
          androidIcon,
          svgIcon,
          largestIcon,
        },
      },
      { headers: corsHeaders() },
    );
  } catch (err) {
    return toolErrorResponse(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/tools/og-images
// Spec 12 §2.16
// ---------------------------------------------------------------------------
export const extractOgImages = httpAction(async (_ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  try {
    const body = await request.json();
    const { url } = z.object({ url: z.string().url() }).parse(body);

    const cheerio = await import("cheerio");
    const html = await fetchHtml(url);
    const baseUrl = new URL(url);
    const $ = cheerio.load(html);

    const getOg = (p: string) =>
      $(`meta[property="og:${p}"]`).attr("content") ?? null;
    const getTw = (n: string) =>
      $(`meta[name="twitter:${n}"]`).attr("content") ?? null;

    const ogImage = getOg("image")
      ? {
          url: resolveUrl(baseUrl, getOg("image")!) ?? null,
          alt: getOg("image:alt"),
          width: getOg("image:width"),
          height: getOg("image:height"),
        }
      : null;

    const twitterImage = getTw("image")
      ? {
          url: resolveUrl(baseUrl, getTw("image")!) ?? null,
          alt: getTw("image:alt"),
        }
      : null;

    return Response.json(
      {
        url,
        metadata: {
          openGraph: {
            title: getOg("title"),
            description: getOg("description"),
            siteName: getOg("site_name"),
            type: getOg("type") ?? "website",
            image: ogImage,
          },
          twitter: {
            card: getTw("card") ?? "summary",
            title: getTw("title"),
            description: getTw("description"),
            site: getTw("site"),
            creator: getTw("creator"),
            image: twitterImage,
          },
          page: {
            title: $("title").text().trim() || null,
            description: $('meta[name="description"]').attr("content") || null,
          },
          images: {
            ogImage,
            twitterImage,
            primary: ogImage ?? twitterImage,
          },
        },
      },
      { headers: corsHeaders() },
    );
  } catch (err) {
    return toolErrorResponse(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/tools/youtube-metadata
// Spec 12 §2.17
// ---------------------------------------------------------------------------

const YT_ID_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
];

function parseISO8601Duration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;
  const parts: string[] = [];
  if (match[1]) parts.push(`${match[1]}h`);
  if (match[2]) parts.push(`${match[2]}m`);
  if (match[3]) parts.push(`${match[3]}s`);
  return parts.length > 0 ? parts.join(" ") : duration;
}

export const youtubeMetadata = httpAction(async (_ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  try {
    const body = await request.json();
    const { url } = z
      .object({
        url: z.string().url("Please provide a valid YouTube URL"),
      })
      .parse(body);

    // Extract video ID
    let videoId: string | null = null;
    for (const pattern of YT_ID_PATTERNS) {
      const match = url.match(pattern);
      if (match?.[1]) {
        videoId = match[1];
        break;
      }
    }

    if (!videoId) {
      return Response.json(
        {
          success: false,
          error:
            "Invalid YouTube URL. Please provide a valid YouTube video URL.",
        },
        { headers: corsHeaders() },
      );
    }

    // Fetch YouTube page
    const pageResp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": TOOL_USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        DNT: "1",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!pageResp.ok) {
      return Response.json(
        {
          success: false,
          error: `Failed to fetch YouTube page: ${pageResp.status} ${pageResp.statusText}`,
        },
        { headers: corsHeaders() },
      );
    }

    const cheerio = await import("cheerio");
    const html = await pageResp.text();
    if (new TextEncoder().encode(html).byteLength > MAX_HTML_BYTES) {
      throw new Error("Response is too large");
    }
    const $ = cheerio.load(html);

    // Parse JSON-LD for VideoObject
    let jsonLdData: Record<string, unknown> | null = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      if (jsonLdData) return;
      try {
        const data = JSON.parse($(el).html() ?? "");
        if (data?.["@type"] === "VideoObject") {
          jsonLdData = data;
        }
      } catch {
        // skip
      }
    });

    // Title cleanup
    let title = ($('meta[property="og:title"]').attr("content") ?? "").trim();
    if (title.endsWith(" - YouTube")) {
      title = title.slice(0, -" - YouTube".length);
    }

    const description =
      $('meta[property="og:description"]').attr("content") ?? null;
    const channelTitle =
      $('meta[name="author"]').attr("content") ??
      (jsonLdData as { author?: { name?: string } } | null)?.author?.name ??
      null;

    // Channel ID
    let channelId: string | null = null;
    const canonicalLink = $('link[rel="canonical"]').attr("href") ?? "";
    const channelMatch = canonicalLink.match(/\/channel\/([a-zA-Z0-9_-]+)/);
    if (channelMatch) channelId = channelMatch[1]!;

    // Published date
    const publishedAt =
      (jsonLdData as { uploadDate?: string } | null)?.uploadDate ?? null;

    // Duration
    const rawDuration =
      (jsonLdData as { duration?: string } | null)?.duration ?? null;
    const duration = rawDuration ? parseISO8601Duration(rawDuration) : null;

    // View count
    type InteractionStat = {
      "@type": string;
      interactionType?: { "@type"?: string };
      userInteractionCount?: string | number;
    };
    const interactionStats = (
      jsonLdData as { interactionStatistic?: InteractionStat[] } | null
    )?.interactionStatistic;
    let viewCount: string | null = null;
    if (Array.isArray(interactionStats)) {
      const watchAction = interactionStats.find(
        (s: InteractionStat) => s?.interactionType?.["@type"] === "WatchAction",
      );
      if (watchAction?.userInteractionCount != null) {
        viewCount = String(watchAction.userInteractionCount);
      }
    }

    // Thumbnails
    const THUMBNAIL_QUALITIES = [
      { name: "default", width: 120, height: 90 },
      { name: "mqdefault", width: 320, height: 180 },
      { name: "hqdefault", width: 480, height: 360 },
      { name: "sddefault", width: 640, height: 480 },
      { name: "maxresdefault", width: 1280, height: 720 },
    ];
    const thumbnails = THUMBNAIL_QUALITIES.map((q) => ({
      quality: q.name,
      url: `https://img.youtube.com/vi/${videoId}/${q.name}.jpg`,
      width: q.width,
      height: q.height,
    }));

    return Response.json(
      {
        success: true,
        data: {
          videoId,
          title,
          description,
          channelTitle,
          channelId,
          publishedAt,
          duration,
          viewCount,
          thumbnails,
          url,
        },
      },
      { headers: corsHeaders() },
    );
  } catch (err) {
    return toolErrorResponse(err);
  }
});
