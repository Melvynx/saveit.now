import { BookmarkType, prisma } from "@workspace/database";
import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import { BOOKMARK_STEP_ID_TO_ID } from "./process-bookmark.step";
import { handleImageStep as processImageBookmark } from "./process-image-bookmark";
import { processStandardWebpage as processPageBookmark } from "./process-page-bookmark";
import { processYouTubeBookmark } from "./process-youtube-bookmark";
import { checkIfVideoUrl } from "./video.utils";

export const processBookmarkJob = inngest.createFunction(
  {
    id: "process-bookmark-2",
    concurrency: {
      key: "event.data.userId",
      limit: 1,
    },
    onFailure: async ({ event, step, runId, publish }) => {
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
      } catch {}
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

    // Check if URL is a video platform before fetching content
    const isVideoUrl = checkIfVideoUrl(bookmark.url);
    if (isVideoUrl) {
      // await handleVideoStep(
      //   {
      //     bookmarkId,
      //     content: "",
      //     url: bookmark.url,
      //     userId: bookmark.userId,
      //   },
      //   step
      // );
    }

    await publish({
      channel: `bookmark:${bookmarkId}`,
      topic: "status",
      data: {
        id: BOOKMARK_STEP_ID_TO_ID["scrap-content"],
        order: 2,
      },
    });

    const urlContent = await step.run("get-url-content", async () => {
      try {
        const response = await fetch(bookmark.url);
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

        return {
          ok: response.ok,
          status: response.status,
          headers,
          content,
          type,
        };
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
