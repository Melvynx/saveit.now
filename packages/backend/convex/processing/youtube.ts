"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { YoutubeTranscript } from "@danielxceron/youtube-transcript";

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * fetchYouTubeMetadata — Convex internalAction.
 * Fetches oEmbed title + thumbnail URL + optional transcript.
 */
export const fetchYouTubeMetadata = internalAction({
  args: {
    videoId: v.string(),
  },
  returns: v.object({
    title: v.string(),
    thumbnail: v.string(),
    transcript: v.optional(v.string()),
  }),
  handler: async (_ctx, { videoId }) => {
    // 1. oEmbed for title
    let title = "Untitled Video";
    try {
      const oembedUrl = `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${videoId}`;
      const oembedResponse = await fetch(oembedUrl);
      if (oembedResponse.ok) {
        const data = (await oembedResponse.json()) as { title?: string };
        title = data.title || title;
      }
    } catch {
      // swallow — use fallback title
    }

    // 2. Thumbnail URL (constructed, no API call)
    const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

    // 3. Transcript (optional — swallow errors)
    let transcript: string | undefined;
    try {
      const transcriptResponse =
        await YoutubeTranscript.fetchTranscript(videoId);
      if (transcriptResponse && transcriptResponse.length > 0) {
        transcript = transcriptResponse
          .map(
            (entry: { offset: number; text: string }) =>
              `[${formatTime(entry.offset)}] ${entry.text}`,
          )
          .join("\n");
      }
    } catch {
      // transcript unavailable — continue without it
    }

    return { title, thumbnail, transcript };
  },
});
