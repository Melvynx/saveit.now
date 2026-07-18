const IMPORT_URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;

export type BulkImportResult = {
  totalUrls: number;
  attemptedUrls: number;
  createdBookmarks: number;
  failedUrls: number;
  notAttemptedUrls: number;
};

export function extractUniqueImportUrls(text: string): string[] {
  return Array.from(new Set(text.match(IMPORT_URL_PATTERN) ?? []));
}

export function summarizeBulkImport({
  totalUrls,
  createdBookmarks,
  failedUrls,
}: {
  totalUrls: number;
  createdBookmarks: number;
  failedUrls: number;
}): BulkImportResult {
  const attemptedUrls = createdBookmarks + failedUrls;
  if (
    totalUrls < 0 ||
    createdBookmarks < 0 ||
    failedUrls < 0 ||
    attemptedUrls > totalUrls
  ) {
    throw new Error("Invalid bulk import counts");
  }

  return {
    totalUrls,
    attemptedUrls,
    createdBookmarks,
    failedUrls,
    notAttemptedUrls: totalUrls - attemptedUrls,
  };
}
