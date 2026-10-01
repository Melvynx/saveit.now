"use node";

/**
 * processing/steps.ts — Node actions invoked as workflow steps.
 *
 * Each action is a thin, retryable unit: it loads what it needs, runs the
 * type handler, and persists its own result so nothing large flows through
 * the workflow journal. Orchestration lives in processing/workflow.ts.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import {
  isProductPage,
  processArticleBookmark,
  processImageBookmark,
  processPageBookmark,
  processPdfBookmark,
  processProductBookmark,
  processTweetBookmark,
  processYouTubeBookmark,
} from "./handlers";
import { assertSafeRemoteUrl, safeFetch } from "../lib/safe_fetch";
import {
  buildRedditPostHtml,
  getRedditPost,
  isUsableRenderedHtml,
} from "./detect";
import { fetchRenderedHtml } from "./screenshot";

// A truncated UA ("Mozilla/5.0 (Windows NT 10.0; Win64; x64)") is dropped or
// stalled by several CDNs; send what a real browser sends.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

export const vRoute = v.union(
  v.literal("PAGE"),
  v.literal("ARTICLE"),
  v.literal("PRODUCT"),
  v.literal("IMAGE"),
  v.literal("PDF"),
  v.literal("FETCH_FAILED"),
);
export type Route =
  | "PAGE"
  | "ARTICLE"
  | "PRODUCT"
  | "IMAGE"
  | "PDF"
  | "FETCH_FAILED";

/**
 * analyzeUrl — fetch the URL once to classify the bookmark.
 * Returns a route only (never page content) to keep the journal small;
 * an unreachable URL routes to FETCH_FAILED without retrying.
 */
export const analyzeUrl = internalAction({
  args: { url: v.string() },
  returns: vRoute,
  handler: async (_ctx, { url }): Promise<Route> => {
    try {
      const response = await safeFetch(url, { headers: BROWSER_HEADERS });
      if (!response.ok) throw new Error("Non-OK response");

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.startsWith("image/")) return "IMAGE";
      if (contentType.startsWith("application/pdf")) return "PDF";

      if (
        contentType.startsWith("text/") ||
        contentType.startsWith("application/json")
      ) {
        const html = await response.text();
        if (isProductPage(url, html)) return "PRODUCT";
        if (
          html.includes("<article") ||
          html.includes('property="og:type" content="article"')
        ) {
          return "ARTICLE";
        }
        return "PAGE";
      }

      // video/* and other content types use the default page handler
      return "PAGE";
    } catch {
      return "FETCH_FAILED";
    }
  },
});

export const processTweet = internalAction({
  args: { bookmarkId: v.id("bookmarks"), userId: v.string() },
  returns: v.null(),
  handler: async (ctx, { bookmarkId, userId }) => {
    const bookmark = await loadBookmark(ctx, bookmarkId, userId);
    if (!bookmark) return null;
    const result = await processTweetBookmark(ctx, bookmark as never, userId);
    await persistHandlerResult(ctx, bookmarkId, userId, result);
    return null;
  },
});

export const processYouTube = internalAction({
  args: { bookmarkId: v.id("bookmarks"), userId: v.string() },
  returns: v.null(),
  handler: async (ctx, { bookmarkId, userId }) => {
    const bookmark = await loadBookmark(ctx, bookmarkId, userId);
    if (!bookmark) return null;
    const result = await processYouTubeBookmark(
      ctx,
      bookmark as never,
      userId,
    );
    await persistHandlerResult(ctx, bookmarkId, userId, result);
    return null;
  },
});

/**
 * processByRoute — run the type handler picked by analyzeUrl.
 * HTML routes re-fetch the page (a throw here triggers the step retry).
 */
export const processByRoute = internalAction({
  args: {
    bookmarkId: v.id("bookmarks"),
    userId: v.string(),
    route: vRoute,
  },
  returns: v.null(),
  handler: async (ctx, { bookmarkId, userId, route }) => {
    const bookmark = await loadBookmark(ctx, bookmarkId, userId);
    if (!bookmark) return null;

    let result: Record<string, unknown>;
    switch (route) {
      case "IMAGE":
        result = await processImageBookmark(ctx, bookmark as never, userId);
        break;
      case "PDF":
        result = await processPdfBookmark(ctx, bookmark as never, userId);
        break;
      case "PRODUCT":
        result = await processProductBookmark(
          ctx,
          bookmark as never,
          userId,
          await fetchHtml(bookmark.url),
        );
        break;
      case "ARTICLE":
        result = await processArticleBookmark(
          ctx,
          bookmark as never,
          userId,
          await fetchHtml(bookmark.url),
        );
        break;
      default:
        result = await processPageBookmark(
          ctx,
          bookmark as never,
          userId,
          await fetchHtml(bookmark.url),
        );
        break;
    }

    await persistHandlerResult(ctx, bookmarkId, userId, result);
    return null;
  },
});

/**
 * processWithBrowser — fallback for URLs the plain fetch could not read.
 * Loads the page in Cloudflare's headless browser; when that only yields a
 * bot wall, still runs the page handler on the screenshot so the bookmark
 * gets a preview, favicon and search embedding. Returns false (caller marks
 * the bookmark fetch-failed) when nothing could be processed; never throws,
 * so a flaky render never turns a saved link into an ERROR bookmark.
 */
export const processWithBrowser = internalAction({
  args: { bookmarkId: v.id("bookmarks"), userId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { bookmarkId, userId }) => {
    const bookmark = await loadBookmark(ctx, bookmarkId, userId);
    if (!bookmark) return true;

    try {
      await assertSafeRemoteUrl(bookmark.url);
      const { hostname, pathname } = new URL(bookmark.url);

      let html = "";
      let metadata: Record<string, unknown> = {
        fetchFailed: true,
        fetchError: "Could not retrieve content from URL",
      };
      const redditHtml = await fetchRedditPostHtml(bookmark.url);
      if (redditHtml) {
        html = redditHtml;
        metadata = { source: "reddit-oembed" };
      } else {
        const rendered = await fetchRenderedHtml(bookmark.url);
        if (rendered !== null && isUsableRenderedHtml(rendered)) {
          html = rendered;
          metadata = { renderedWithBrowser: true };
        }
      }

      const result = await processPageBookmark(
        ctx,
        bookmark as never,
        userId,
        html,
        {
          fallbackTitle: hostname + (pathname === "/" ? "" : pathname),
          metadata,
        },
      );
      await persistHandlerResult(ctx, bookmarkId, userId, result);
      return true;
    } catch (err) {
      console.warn("[processing.processWithBrowser] fallback failed", {
        bookmarkId,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchRedditPostHtml(url: string): Promise<string | null> {
  const post = getRedditPost(url);
  if (!post) return null;
  try {
    const response = await fetch(post.oembedUrl, {
      headers: {
        "User-Agent": BROWSER_HEADERS["User-Agent"],
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.warn("[processing.reddit] oEmbed rejected", {
        status: response.status,
        url: post.oembedUrl,
      });
      return null;
    }
    const data = (await response.json()) as {
      title?: unknown;
      author_name?: unknown;
    };
    if (typeof data.title !== "string" || !data.title.trim()) return null;
    return buildRedditPostHtml({
      title: data.title,
      author: typeof data.author_name === "string" ? data.author_name : undefined,
      subreddit: post.subreddit,
    });
  } catch (err) {
    console.warn("[processing.reddit] oEmbed failed", {
      url: post.oembedUrl,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function loadBookmark(
  ctx: ActionCtx,
  bookmarkId: Id<"bookmarks">,
  userId: string,
) {
  return await ctx.runQuery(internal.bookmarks.queries.getById, {
    id: bookmarkId,
    userId,
  });
}

async function fetchHtml(url: string): Promise<string> {
  const response = await safeFetch(url, { headers: BROWSER_HEADERS });
  if (!response.ok) {
    throw new Error(`Failed to fetch URL content (${response.status})`);
  }
  return await response.text();
}

/**
 * persistHandlerResult — apply the handler result fields to the bookmark
 * and create tags via the tags mutation.
 */
async function persistHandlerResult(
  ctx: ActionCtx,
  bookmarkId: Id<"bookmarks">,
  userId: string,
  result: Record<string, unknown>,
) {
  const { tagNames, searchEmbedding, embeddingModel, ...fields } = result;

  // Patch step: saving (7)
  await ctx.runMutation(internal.processing.runs.patchStep, {
    bookmarkId,
    step: 7,
  });

  // Apply result fields (type, title, summary, vectorSummary, preview, etc.)
  await ctx.runMutation(internal.processing.runs.applyResult, {
    bookmarkId,
    fields: {
      ...fields,
      ...(searchEmbedding ? { searchEmbedding, embeddingModel } : {}),
    },
  });

  // Set tags by name (creates IA tags idempotently)
  if (Array.isArray(tagNames) && tagNames.length > 0) {
    await ctx.runMutation(
      internal.tags.mutations.setBookmarkTagsByNameInternal,
      {
        bookmarkId,
        tagNames: tagNames as string[],
        userId,
        type: "IA",
      },
    );
  }
}
