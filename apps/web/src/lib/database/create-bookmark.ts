import { prisma } from "@workspace/database";
import { inngest } from "../inngest/client";
import { getPostHogClient } from "../posthog";
import { removeTrackingParameters } from "../url-utils";
import { validateBookmarkLimits } from "./bookmark-validation";

export const createBookmark = async (body: { url: string; userId: string }) => {
  const posthogClient = getPostHogClient();
  
  // Clean URL by removing tracking parameters
  const cleanUrl = removeTrackingParameters(body.url);
  
  // Validate bookmark limits and constraints
  await validateBookmarkLimits({
    userId: body.userId,
    url: cleanUrl,
  });

  const bookmark = await prisma.bookmark.create({
    data: {
      url: cleanUrl,
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
      url: cleanUrl,
    },
  });

  return bookmark;
};
