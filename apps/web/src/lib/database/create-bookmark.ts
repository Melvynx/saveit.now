import { prisma } from "@workspace/database";
import { inngest } from "../inngest/client";
import { getPostHogClient } from "../posthog";
import { cleanUrl } from "../url-cleaner";
import { validateBookmarkLimits } from "./bookmark-validation";

export const createBookmark = async (body: { url: string; userId: string }) => {
  const posthogClient = getPostHogClient();

  // Clean the URL to remove tracking parameters
  const cleanedUrl = cleanUrl(body.url);

  // Validate bookmark limits and constraints
  await validateBookmarkLimits({
    userId: body.userId,
    url: cleanedUrl,
  });

  const bookmark = await prisma.bookmark.create({
    data: {
      url: cleanedUrl,
      userId: body.userId,
    },
  });

  await inngest.send({
    name: "bookmark/process",
    data: {
      bookmarkId: bookmark.id,
      userId: body.userId,
    },
  });

  posthogClient.capture({
    distinctId: body.userId,
    event: "bookmark+created",
    properties: {
      url: cleanedUrl,
      originalUrl: body.url,
    },
  });

  return bookmark;
};
