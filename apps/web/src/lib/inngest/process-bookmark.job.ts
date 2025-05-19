import { BookmarkType, prisma } from "@workspace/database";
import { inngest } from "./client";
import { handleImageStep } from "./handle-image-step";
import { handlePageStep } from "./handle-page-step";
import { handleVideoStep } from "./handle-video-step";
import { checkIfVideoUrl } from "./video.utils";

export const processBookmarkJob = inngest.createFunction(
  { id: "process-bookmark" },
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
        data: "Retrieve bookmark",
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
      await handleVideoStep(
        {
          bookmarkId,
          content: "",
          url: bookmark.url,
          userId: bookmark.userId,
        },
        step
      );
      return;
    }

    await publish({
      channel: `bookmark:${bookmarkId}`,
      topic: "status",
      data: {
        data: "Scrapping the content",
      },
    });

    const urlContent = await step.run("get-url-content", async () => {
      const response = await fetch(bookmark.url);

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
    });

    // Handle direct video files
    // if (urlContent.type === BookmarkType.VIDEO) {
    //   await handleVideoStep(
    //     {
    //       bookmarkId,
    //       content: "",
    //       url: bookmark.url,
    //       userId: bookmark.userId,
    //     },
    //     step
    //   );
    //   return;
    // }

    // if (urlContent.type === BookmarkType.PAGE) {
    //   const $ = cheerio.load(urlContent.content);

    //   const isArticle =
    //     $("article").length > 0 ||
    //     // Check for common article indicators
    //     $("meta[property='og:type'][content='article']").length > 0 ||
    //     $("meta[property='article:published_time']").length > 0;

    //   if (isArticle) {
    //     // Process as article
    //     await handleArticleStep(
    //       {
    //         bookmarkId,
    //         content: urlContent.content,
    //         url: bookmark.url,
    //         userId: bookmark.userId,
    //       },
    //       step
    //     );
    //     return;
    //   }

    //   // Process as regular page
    await handlePageStep(
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
      publish
    );

    if (urlContent.type === BookmarkType.IMAGE) {
      await handleImageStep(
        {
          bookmarkId,
          url: bookmark.url,
          userId: bookmark.userId,
        },
        step
      );
      return;
    }
  }
);
