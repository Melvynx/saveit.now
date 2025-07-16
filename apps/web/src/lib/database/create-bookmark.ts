import { prisma } from "@workspace/database";
import { inngest } from "../inngest/client";
import { getPostHogClient } from "../posthog";
import { validateBookmarkLimits } from "./bookmark-validation";
import { cleanUrl } from "../utils/url-cleaner";

export const createBookmark = async (body: { 
  url: string; 
  userId: string;
  transcript?: string;
  metadata?: Record<string, any>;
}) => {
  const posthogClient = getPostHogClient();
  
  // Clean the URL by removing tracking parameters
  const cleanedUrl = cleanUrl(body.url);
  
  // Validate bookmark limits and constraints
  await validateBookmarkLimits({
    userId: body.userId,
    url: cleanedUrl,
  });

  // Prepare metadata with transcript info if provided
  let finalMetadata = body.metadata || {};
  
  if (body.transcript) {
    finalMetadata = {
      ...finalMetadata,
      transcript: body.transcript,
      transcriptSource: 'extension',
      transcriptExtractedAt: new Date().toISOString(),
    };
  }

  const bookmark = await prisma.bookmark.create({
    data: {
      url: cleanedUrl,
      userId: body.userId,
      metadata: Object.keys(finalMetadata).length > 0 ? finalMetadata : undefined,
    },
  });

  await inngest.send({
    name: "bookmark/process",
    data: {
      bookmarkId: bookmark.id,
      userId: body.userId,
      hasExtensionTranscript: !!body.transcript,
    },
  });

  posthogClient.capture({
    distinctId: body.userId,
    event: "bookmark+created",
    properties: {
      url: cleanedUrl,
      hasTranscript: !!body.transcript,
      transcriptSource: body.transcript ? 'extension' : undefined,
    },
  });

  return bookmark;
};
