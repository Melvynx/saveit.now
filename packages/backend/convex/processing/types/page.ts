export type PageMetadata = {
  fetchFailed?: boolean;
  fetchError?: string;
  dataCopiedFrom?: string;
  [key: string]: unknown;
};
