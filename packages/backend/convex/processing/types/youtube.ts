export type YoutubeMetadata = {
  youtubeId?: string;
  transcriptAvailable?: boolean;
  transcriptSource?: "extension" | "api" | "none";
  transcript?: string;
  transcriptExtractedAt?: string;
  summarySource?: "transcript" | "thumbnail" | "none";
  thumbnailAnalysis?: string;
  [key: string]: unknown;
};
