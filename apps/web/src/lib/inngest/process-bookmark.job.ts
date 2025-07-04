import { BookmarkType, prisma } from "@workspace/database";
import { NonRetriableError } from "inngest";
import { validateBookmarkLimits } from "../database/bookmark-validation";
import { logger } from "../logger";
import { handleImageStep as processImageBookmark } from "./bookmark-type/process-image-bookmark";
import { processStandardWebpage as processPageBookmark } from "./bookmark-type/process-page-bookmark";
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
    onFailure: async ({ event }) => {
      const data = event.data.event.data;
      const bookmarkId = data.bookmarkId;

      if (!bookmarkId) {
        return;
      }

      const error = event.data.error;

      try {
        await prisma.bookmark.update({
          where: { id: bookmarkId },
          data: {
            status: "ERROR",
            metadata: {
              error: error.message,
            },
          },
        });
      } catch {
        // ignore
      }
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

    await step.run("update-bookmark-status", async () => {
      await prisma.bookmark.update({
        where: { id: bookmarkId },
        data: { inngestRunId: runId, status: "PROCESSING" },
      });
    });

    if (!bookmark) {
      throw new Error("Bookmark not found");
    }

    // Validate bookmark limits before processing
    await step.run("validate-bookmark-limits", async () => {
      try {
        await validateBookmarkLimits({
          userId: bookmark.userId,
          url: bookmark.url,
          skipExistenceCheck: true, // Skip existence check since bookmark already exists
        });
      } catch (error) {
        logger.error("Bookmark limits exceeded", { error });
        throw new NonRetriableError("Bookmark limits exceeded");
      }
    });

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
      return;
    }

    const urlContent = await step.run("get-url-content", async () => {
      try {
        const response = await fetch(bookmark.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            Accept: "text/html",
          },
        });
        console.log(response);
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

    if (
      bookmark.url.includes("youtube.com") ||
      bookmark.url.includes("youtu.be")
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
  },
);
