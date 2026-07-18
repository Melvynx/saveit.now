import { describe, expect, it } from "vitest";
import { extractUniqueImportUrls, summarizeBulkImport } from "./bulkImport";

describe("bulk import result", () => {
  it("deduplicates extracted URLs without inventing outcomes", () => {
    expect(
      extractUniqueImportUrls(
        "https://example.com/a https://example.com/a\nhttps://example.com/b",
      ),
    ).toEqual(["https://example.com/a", "https://example.com/b"]);
  });

  it("distinguishes failed attempts from URLs never attempted", () => {
    expect(
      summarizeBulkImport({
        totalUrls: 5,
        createdBookmarks: 2,
        failedUrls: 1,
      }),
    ).toEqual({
      totalUrls: 5,
      attemptedUrls: 3,
      createdBookmarks: 2,
      failedUrls: 1,
      notAttemptedUrls: 2,
    });
  });

  it("rejects impossible result counts", () => {
    expect(() =>
      summarizeBulkImport({
        totalUrls: 1,
        createdBookmarks: 1,
        failedUrls: 1,
      }),
    ).toThrow("Invalid bulk import counts");
  });
});
