export type YoutubeMetadata = {
  youtubeId?: string;
  transcriptAvailable?: boolean;
  transcriptSource?: "extension" | "api" | "none";
  transcriptCharacterCount?: number;
  transcriptExtractedAt?: string;
  summarySource?: "transcript" | "thumbnail" | "none";
  thumbnailAnalyzed?: boolean;
  [key: string]: unknown;
};
