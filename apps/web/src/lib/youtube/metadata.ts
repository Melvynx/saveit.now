import { YoutubeTranscript } from "@danielxceron/youtube-transcript";
import { z } from "zod";

const YouTubeOEmbedSchema = z.object({
  title: z.string(),
  author_name: z.string(),
  thumbnail_url: z.string(),
});

export interface YouTubeMetadata {
  title: string;
  author: string;
  thumbnail: string;
  transcript?: string;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export async function getYouTubeMetadata(
  videoId: string,
  includeTranscript = true,
): Promise<YouTubeMetadata> {
  const oembedUrl = `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${videoId}`;
  const oembedResponse = await fetch(oembedUrl);

  if (!oembedResponse.ok) {
    throw new Error(
      `Failed to fetch YouTube metadata: ${oembedResponse.statusText}`,
    );
  }

  const oembedData = await oembedResponse.json();
  const validated = YouTubeOEmbedSchema.parse(oembedData);

  const metadata: YouTubeMetadata = {
    title: validated.title,
    author: validated.author_name,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
  };

  if (includeTranscript) {
    try {
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);

      if (transcriptData && transcriptData.length > 0) {
        metadata.transcript = transcriptData
          .map((entry) => `[${formatTime(entry.offset)}] ${entry.text}`)
          .join("\n");
      }
    } catch (error) {
      console.warn("Failed to fetch transcript:", error);
    }
  }

  return metadata;
}
