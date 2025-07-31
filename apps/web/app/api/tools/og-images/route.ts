import { extractClientIP } from "@/lib/rate-limit/ip-extractor";
import { checkMultipleRateLimits, hasRateLimitFailure, getMostRestrictiveResult, RateLimiter } from "@/lib/rate-limit/rate-limiter";
import { RATE_LIMITS } from "@/lib/rate-limit/rate-limit-config";
import { validateUrl, logSecurityViolation } from "@/lib/security/url-validator";
import { sanitizeText, sanitizeUrl, sanitizeMetadata, logSanitizationEvent } from "@/lib/security/html-sanitizer";
import { secureTextFetch, logSecureRequest } from "@/lib/security/http-config";
import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  url: z.string().url("Please provide a valid URL"),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let urlToProcess = '';
  
  try {
    // Extract client IP for rate limiting
    const clientIP = extractClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    
    // Check rate limits (10/min sliding window, 100/hour fixed window)
    const rateLimitResults = await checkMultipleRateLimits(clientIP, [
      RATE_LIMITS.OG_IMAGES.PER_MINUTE,
      RATE_LIMITS.OG_IMAGES.PER_HOUR,
    ]);

    // Check if any rate limit failed
    if (hasRateLimitFailure(rateLimitResults)) {
      const mostRestrictive = getMostRestrictiveResult(rateLimitResults);
      const headers = RateLimiter.createHeaders(mostRestrictive);
      
      return NextResponse.json(
        { 
          error: "Rate limit exceeded. Please try again later.",
          limit: mostRestrictive.limit,
          retryAfter: mostRestrictive.retryAfter,
        },
        { 
          status: 429,
          headers: {
            ...headers,
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'no-referrer',
            'Content-Security-Policy': "default-src 'none'",
          } as HeadersInit,
        }
      );
    }

    const body = await request.json();
    const { url } = requestSchema.parse(body);
    urlToProcess = url;
    
    // SECURITY: Validate URL against SSRF attacks
    const urlValidation = await validateUrl(url);
    if (!urlValidation.isValid) {
      // Log security violation
      logSecurityViolation(url, urlValidation.error || 'URL validation failed', userAgent, clientIP);
      
      return NextResponse.json(
        { error: urlValidation.error || 'Invalid URL provided' },
        { 
          status: 400,
          headers: {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'no-referrer',
            'Content-Security-Policy': "default-src 'none'",
          } as HeadersInit,
        }
      );
    }

    // SECURITY: Fetch webpage using secure HTTP client
    let html: string;
    try {
      html = await secureTextFetch(url, {
        timeout: 10000, // 10 seconds timeout
        maxResponseSize: 2 * 1024 * 1024, // 2MB max
        maxRedirects: 3,
        userAgent: "SaveIt.now Bot/1.0 (+https://saveit.now)",
      });
      
      // Log successful request
      logSecureRequest(url, true, Date.now() - startTime, undefined, clientIP);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log failed request
      logSecureRequest(url, false, Date.now() - startTime, errorMessage, clientIP);
      
      return NextResponse.json(
        { error: "Failed to fetch the webpage safely" },
        { 
          status: 400,
          headers: {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'no-referrer',
            'Content-Security-Policy': "default-src 'none'",
          } as HeadersInit,
        }
      );
    }
    
    const $ = cheerio.load(html);

    // SECURITY: Extract and sanitize all relevant meta tags
    const rawOgImage = $("meta[property='og:image']").attr("content");
    const rawOgImageAlt = $("meta[property='og:image:alt']").attr("content");
    const rawOgImageWidth = $("meta[property='og:image:width']").attr("content");
    const rawOgImageHeight = $("meta[property='og:image:height']").attr("content");
    
    const rawTwitterImage = $("meta[name='twitter:image']").attr("content");
    const rawTwitterImageAlt = $("meta[name='twitter:image:alt']").attr("content");
    
    const rawOgTitle = $("meta[property='og:title']").attr("content");
    const rawOgDescription = $("meta[property='og:description']").attr("content");
    const rawOgSiteName = $("meta[property='og:site_name']").attr("content");
    const rawOgType = $("meta[property='og:type']").attr("content");
    
    const rawTwitterCard = $("meta[name='twitter:card']").attr("content");
    const rawTwitterTitle = $("meta[name='twitter:title']").attr("content");
    const rawTwitterDescription = $("meta[name='twitter:description']").attr("content");
    const rawTwitterSite = $("meta[name='twitter:site']").attr("content");
    const rawTwitterCreator = $("meta[name='twitter:creator']").attr("content");

    // Extract page title as fallback
    const rawPageTitle = $("title").text();
    const rawMetaDescription = $("meta[name='description']").attr("content");
    
    // SECURITY: Sanitize all extracted content
    const ogImage = sanitizeUrl(rawOgImage);
    const ogImageAlt = sanitizeText(rawOgImageAlt, 200);
    const ogImageWidth = rawOgImageWidth;
    const ogImageHeight = rawOgImageHeight;
    
    const twitterImage = sanitizeUrl(rawTwitterImage);
    const twitterImageAlt = sanitizeText(rawTwitterImageAlt, 200);
    
    const ogTitle = sanitizeText(rawOgTitle, 300);
    const ogDescription = sanitizeText(rawOgDescription, 500);
    const ogSiteName = sanitizeText(rawOgSiteName, 100);
    const ogType = sanitizeText(rawOgType, 50);
    
    const twitterCard = sanitizeText(rawTwitterCard, 50);
    const twitterTitle = sanitizeText(rawTwitterTitle, 300);
    const twitterDescription = sanitizeText(rawTwitterDescription, 500);
    const twitterSite = sanitizeText(rawTwitterSite, 100);
    const twitterCreator = sanitizeText(rawTwitterCreator, 100);

    const pageTitle = sanitizeText(rawPageTitle, 300);
    const metaDescription = sanitizeText(rawMetaDescription, 500);
    
    // Log sanitization if content was modified
    if (rawOgTitle !== ogTitle) {
      logSanitizationEvent(rawOgTitle || '', ogTitle || '', 'OG Title sanitization');
    }
    if (rawOgDescription !== ogDescription) {
      logSanitizationEvent(rawOgDescription || '', ogDescription || '', 'OG Description sanitization');
    }

    // SECURITY: Resolve relative URLs to absolute URLs with validation
    const baseUrl = new URL(url);
    const resolveUrl = async (imageUrl: string | null | undefined) => {
      if (!imageUrl) return null;
      try {
        let resolvedUrl: string;
        if (imageUrl.startsWith("http")) {
          resolvedUrl = imageUrl;
        } else if (imageUrl.startsWith("//")) {
          resolvedUrl = `${baseUrl.protocol}${imageUrl}`;
        } else if (imageUrl.startsWith("/")) {
          resolvedUrl = `${baseUrl.origin}${imageUrl}`;
        } else {
          resolvedUrl = `${baseUrl.origin}/${imageUrl}`;
        }
        
        // SECURITY: Validate resolved URL
        const validation = await validateUrl(resolvedUrl);
        if (!validation.isValid) {
          logSecurityViolation(resolvedUrl, validation.error || 'Image URL validation failed', userAgent, clientIP);
          return null;
        }
        
        return resolvedUrl;
      } catch {
        return null;
      }
    };

    const resolvedOgImage = await resolveUrl(ogImage);
    const resolvedTwitterImage = await resolveUrl(twitterImage);

    // Add rate limit headers to successful response
    const mostRestrictive = getMostRestrictiveResult(rateLimitResults);
    const rateLimitHeaders = RateLimiter.createHeaders(mostRestrictive);
    
    // SECURITY: Create sanitized metadata object
    const metadata = {
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
    };
    
    // SECURITY: Final sanitization of the entire metadata object
    const sanitizedMetadata = sanitizeMetadata(metadata);

    return NextResponse.json({
      url: urlToProcess,
      metadata: sanitizedMetadata,
    }, {
      headers: {
        ...rateLimitHeaders,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'",
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      } as HeadersInit,
    });
  } catch (error) {
    // Log security request failure
    if (urlToProcess) {
      logSecureRequest(urlToProcess, false, Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Invalid request data" },
        { 
          status: 400,
          headers: {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'no-referrer',
            'Content-Security-Policy': "default-src 'none'",
          } as HeadersInit,
        }
      );
    }

    console.error("OG image extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract metadata from the URL" },
      { 
        status: 500,
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'no-referrer',
          'Content-Security-Policy': "default-src 'none'",
        } as HeadersInit,
      }
    );
  }
}