export type ArticleMetadata = {
  contentExtracted?: boolean;
  contentCharacterCount?: number;
  summarySource?: "article" | "screenshot";
  [key: string]: unknown;
};
