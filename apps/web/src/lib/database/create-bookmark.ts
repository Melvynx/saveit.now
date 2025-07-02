import { prisma } from "@workspace/database";
import { inngest } from "../inngest/client";
import { getPostHogClient } from "../posthog";
import { validateBookmarkLimits } from "./bookmark-validation";

export const createBookmark = async (body: { url: string; userId: string }) => {
  const posthogClient = getPostHogClient();
  
  // Validate bookmark limits and constraints
  await validateBookmarkLimits({
    userId: body.userId,
    url: body.url,
  });

  const bookmark = await prisma.bookmark.create({
    data: {
      url: body.url,
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
      url: body.url,
    },
  });

  return bookmark;
};
