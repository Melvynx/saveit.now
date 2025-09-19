import { BookmarkType, prisma } from "@workspace/database";
import { NonRetriableError } from "inngest";
import { validateBookmarkLimits } from "../database/bookmark-validation";
import { logger } from "../logger";
import { CacheInvalidation } from "../search/cache-invalidation";
import { copyBookmarkData, findExistingBookmark } from "./bookmark-reuse.utils";
import { processArticleBookmark } from "./bookmark-type/process-article-bookmark";
import { handleImageStep as processImageBookmark } from "./bookmark-type/process-image-bookmark";
import { processStandardWebpage as processPageBookmark } from "./bookmark-type/process-page-bookmark";
import { processPDFBookmark } from "./bookmark-type/process-pdf-bookmark";
import {
  isProductPage,
  processProductBookmark,
} from "./bookmark-type/process-product-bookmark";
import { processTweetBookmark } from "./bookmark-type/process-tweet-bookmark";
import { processYouTubeBookmark } from "./bookmark-type/process-youtube-bookmark";
import { inngest } from "./client";
import { BOOKMARK_STEP_ID_TO_ID } from "./process-bookmark.step";

export const processBookmarkJob = inngest.createFunction(
  {
    id: "process-bookmark",
    concurrency: {
      key: "event.data.userId",
      limit: 1,
    },
    onFailure: async ({ event, publish }) => {
      const data = event.data.event.data;
      const bookmarkId = data.bookmarkId;

      if (!bookmarkId) {
        return;
      }

      const error = event.data.error;

      const bookmark = await prisma.bookmark.update({
        where: { id: bookmarkId },
        data: {
          status: "ERROR",
          metadata: {
            error: error.message,
          },
        },
        select: {
          inngestRunId: true,
        },
      });

      if (!bookmark.inngestRunId) {
        return;
      }

      await prisma.bookmarkProcessingRun.updateManyAndReturn({
        where: {
          inngestRunId: bookmark.inngestRunId,
        },
        data: {
          status: "FAILED",
          failureReason: error.message,
          completedAt: new Date(),
        },
      });

      await publish({
        channel: `bookmark:${bookmarkId}`,
        topic: "finish",
        data: {
          id: BOOKMARK_STEP_ID_TO_ID["finish"],
          order: 9,
        },
      });
    },
  },
  { event: "bookmark/process" },
  async ({ event, step, runId, publish }) => {
    const bookmarkId = event.data.bookmarkId;

    if (!bookmarkId) {
      throw new Error("Bookmark ID is required");
    }

    await publish({
      channel: `bookmark:${bookmarkId}`,
      topic: "status",
      data: {
        id: BOOKMARK_STEP_ID_TO_ID["get-bookmark"],
        order: 1,
      },
    });

    const bookmark = await step.run("get-bookmark", async () => {
      return await prisma.bookmark.findUnique({
        where: { id: bookmarkId },
      });
    });

    if (!bookmark) {
      throw new Error("Bookmark not found");
    }

    // Extract bookmark properties to avoid null assertions
    const { userId, url } = bookmark;

    await step.run("update-bookmark-status", async () => {
      await Promise.all([
        prisma.bookmark.update({
          where: { id: bookmarkId },
          data: { inngestRunId: runId, status: "PROCESSING" },
        }),
        prisma.bookmarkProcessingRun.create({
          data: {
            inngestRunId: runId,
            bookmarkId: bookmarkId,
            userId: userId,
            status: "STARTED",
          },
        }),
      ]);
    });

    // Validate bookmark limits before processing
    await step.run("validate-bookmark-limits", async () => {
      try {
        await validateBookmarkLimits({
          userId: userId,
          url: url,
          skipExistenceCheck: true, // Skip existence check since bookmark already exists
        });
      } catch (error) {
        logger.error("Bookmark limits exceeded", { error });
        throw new NonRetriableError("Bookmark limits exceeded");
      }
    });

    // Check for existing bookmark with same content before processing
    const existingBookmarkId = await step.run(
      "check-existing-bookmark",
      async () => {
        return await findExistingBookmark({
          url: bookmark.url,
          bookmarkId,
        });
      },
    );

    // If we found an existing processed bookmark, copy its data
    if (existingBookmarkId) {
      await publish({
        channel: `bookmark:${bookmarkId}`,
        topic: "status",
        data: {
          id: BOOKMARK_STEP_ID_TO_ID["saving"],
          order: 8,
        },
      });

      await step.run("copy-existing-bookmark-data", async () => {
        await copyBookmarkData({
          fromBookmarkId: existingBookmarkId,
          toBookmarkId: bookmarkId,
          url: bookmark.url,
        });
      });

      // Invalidate search cache after bookmark update
      await step.run("invalidate-search-cache", async () => {
        await CacheInvalidation.onBookmarkUpdated({
          ...bookmark,
          createdAt: new Date(bookmark.createdAt),
          updatedAt: new Date(bookmark.updatedAt),
        });
      });

      await publish({
        channel: `bookmark:${bookmarkId}`,
        topic: "finish",
        data: {
          id: BOOKMARK_STEP_ID_TO_ID["finish"],
          order: 9,
        },
      });

      return;
    }

    await publish({
      channel: `bookmark:${bookmarkId}`,
      topic: "status",
      data: {
        id: BOOKMARK_STEP_ID_TO_ID["scrap-content"],
        order: 2,
      },
    });

    if (
      bookmark.url.includes("twitter.com") ||
      bookmark.url.startsWith("https://x.com/")
    ) {
      await processTweetBookmark(
        {
          bookmarkId,
          url: bookmark.url,
          userId: bookmark.userId,
        },
        step,
        publish,
      );

      // Invalidate search cache after bookmark processing
      await step.run("invalidate-search-cache", async () => {
        await CacheInvalidation.onBookmarkUpdated({
          ...bookmark,
          createdAt: new Date(bookmark.createdAt),
          updatedAt: new Date(bookmark.updatedAt),
        });
      });

      return;
    }

    const urlContent = await step.run("get-url-content", async () => {
      try {
        const response = await fetch(bookmark.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          },
        });

        if (!response.ok) {
          throw new Error("No response");
        }
        const headers = Object.fromEntries(response.headers.entries());

        let content = null;
        let type: BookmarkType | null = null;

        if (headers["content-type"]?.startsWith("text/")) {
          content = await response.text();
          type = BookmarkType.PAGE;
        }

        if (headers["content-type"]?.startsWith("application/json")) {
          content = await response.json();
          type = BookmarkType.PAGE;
        }

        if (headers["content-type"]?.startsWith("image/")) {
          content = await response.arrayBuffer();
          type = BookmarkType.IMAGE;
        }

        if (headers["content-type"]?.startsWith("video/")) {
          // Handle direct video files
          type = BookmarkType.VIDEO;
          // We don't need to fetch the content for direct video files
        }

        if (headers["content-type"]?.startsWith("application/pdf")) {
          content = await response.arrayBuffer();
          type = BookmarkType.PDF;
        }

        if (
          (
            [
              null,
              BookmarkType.PAGE,
              BookmarkType.ARTICLE,
            ] as (BookmarkType | null)[]
          ).includes(type) &&
          isProductPage(bookmark.url, content)
        ) {
          type = BookmarkType.PRODUCT;
        }

        const result = {
          ok: response.ok,
          status: response.status,
          headers,
          content,
          type,
        };

        return result;
      } catch (error) {
        throw new NonRetriableError(
          `Failed to fetch ${bookmark.url}: ${error}`,
        );
      }
    });

    // Check if it's a YouTube video URL (not channel or other pages)
    const isYouTubeVideo = (url: string): boolean => {
      const videoRegex =
        /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
      return videoRegex.test(url);
    };

    if (
      (bookmark.url.includes("youtube.com") ||
        bookmark.url.includes("youtu.be")) &&
      isYouTubeVideo(bookmark.url)
    ) {
      await processYouTubeBookmark(
        {
          bookmarkId,
          url: bookmark.url,
          userId: bookmark.userId,
          content: urlContent.content,
        },
        step,
        publish,
      );

      // Invalidate search cache after bookmark processing
      await step.run("invalidate-search-cache", async () => {
        await CacheInvalidation.onBookmarkUpdated({
          ...bookmark,
          createdAt: new Date(bookmark.createdAt),
          updatedAt: new Date(bookmark.updatedAt),
        });
      });

      return;
    }

    if (urlContent.type === BookmarkType.PRODUCT) {
      await processProductBookmark(
        {
          bookmarkId,
          content: urlContent.content,
          url: bookmark.url,
          userId: bookmark.userId,
          bookmark: {
            ...bookmark,
            createdAt: new Date(bookmark.createdAt),
            updatedAt: new Date(bookmark.updatedAt),
          },
        },
        step,
        publish,
      );

      // Invalidate search cache after bookmark processing
      await step.run("invalidate-search-cache", async () => {
        await CacheInvalidation.onBookmarkUpdated({
          ...bookmark,
          createdAt: new Date(bookmark.createdAt),
          updatedAt: new Date(bookmark.updatedAt),
        });
      });

      return;
    }

    if (
      urlContent.type === BookmarkType.PAGE &&
      typeof urlContent.content === "string" &&
      (urlContent.content.includes("<article") ||
        urlContent.content.includes('property="og:type" content="article"'))
    ) {
      await processArticleBookmark(
        {
          bookmarkId,
          content: urlContent.content,
          url: bookmark.url,
          userId: bookmark.userId,
          bookmark: {
            ...bookmark,
            createdAt: new Date(bookmark.createdAt),
            updatedAt: new Date(bookmark.updatedAt),
          },
        },
        step,
        publish,
      );

      // Invalidate search cache after bookmark processing
      await step.run("invalidate-search-cache", async () => {
        await CacheInvalidation.onBookmarkUpdated({
          ...bookmark,
          createdAt: new Date(bookmark.createdAt),
          updatedAt: new Date(bookmark.updatedAt),
        });
      });

      return;
    }

    if (urlContent.type === BookmarkType.IMAGE) {
      await processImageBookmark(
        {
          bookmarkId,
          url: bookmark.url,
          userId: bookmark.userId,
        },
        step,
        publish,
      );

      // Invalidate search cache after bookmark processing
      await step.run("invalidate-search-cache", async () => {
        await CacheInvalidation.onBookmarkUpdated({
          ...bookmark,
          createdAt: new Date(bookmark.createdAt),
          updatedAt: new Date(bookmark.updatedAt),
        });
      });

      return;
    }

    if (urlContent.type === BookmarkType.PDF) {
      await processPDFBookmark(
        {
          bookmarkId,
          url: bookmark.url,
          userId: bookmark.userId,
          content: null, // Will be downloaded in the PDF processor
        },
        step,
        publish,
      );

      // Invalidate search cache after bookmark processing
      await step.run("invalidate-search-cache", async () => {
        await CacheInvalidation.onBookmarkUpdated({
          ...bookmark,
          createdAt: new Date(bookmark.createdAt),
          updatedAt: new Date(bookmark.updatedAt),
        });
      });

      return;
    }

    await processPageBookmark(
      {
        bookmarkId,
        content: urlContent.content,
        url: bookmark.url,
        userId: bookmark.userId,
        bookmark: {
          ...bookmark,
          createdAt: new Date(bookmark.createdAt),
          updatedAt: new Date(bookmark.updatedAt),
        },
      },
      step,
      publish,
    );

    // Invalidate search cache after bookmark processing
    await step.run("invalidate-search-cache", async () => {
      await CacheInvalidation.onBookmarkUpdated({
        ...bookmark,
        createdAt: new Date(bookmark.createdAt),
        updatedAt: new Date(bookmark.updatedAt),
      });
    });
  },
);
