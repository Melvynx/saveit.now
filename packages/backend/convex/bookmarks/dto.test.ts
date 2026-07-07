import { describe, expect, it } from "vitest";
import {
  buildBookmarkDTO,
  buildBookmarkDetailDTO,
  buildPublicBookmarkDTO,
  cleanMetadata,
  cleanMetadataForStorage,
} from "./dto";

const baseBookmark = {
  _id: "bookmark_123" as any,
  userId: "user_123",
  url: "https://example.com/article",
  status: "READY" as const,
  starred: true,
  read: true,
  createdAt: 1000,
  updatedAt: 2000,
  metadata: {
    transcript: "private transcript",
    markdown: "# Public markdown",
    width: 1200,
  },
  note: "private note",
  vectorSummary: "private vector summary",
};

describe("bookmark DTO mappers", () => {
  it("removes raw content metadata before returning bookmark DTOs", () => {
    expect(cleanMetadata(baseBookmark.metadata)).toEqual({
      width: 1200,
    });

    const dto = buildBookmarkDTO(baseBookmark, [], 3);

    expect(dto.metadata).toEqual({ width: 1200 });
    expect(dto.openCount).toBe(3);
    expect(dto.type).toBeNull();
    expect(dto.processingError).toBeNull();
  });

  it("keeps private detail fields only in the detail DTO", () => {
    const detail = buildBookmarkDetailDTO(baseBookmark, [], 2);

    expect(detail.userId).toBe("user_123");
    expect(detail.note).toBe("private note");
    expect(detail.vectorSummary).toBe("private vector summary");
    expect(detail.updatedAt).toBe(2000);
    expect(detail.processingStep).toBeNull();
  });

  it("whitelists public bookmark fields and forces private state off", () => {
    const publicDto = buildPublicBookmarkDTO(baseBookmark);

    expect(publicDto).toMatchObject({
      id: "bookmark_123",
      url: "https://example.com/article",
      starred: false,
      read: false,
      metadata: { width: 1200 },
    });
    expect(publicDto).not.toHaveProperty("userId");
    expect(publicDto).not.toHaveProperty("note");
    expect(publicDto).not.toHaveProperty("vectorSummary");
  });

  it("strips raw payloads from metadata before storage", () => {
    expect(
      cleanMetadataForStorage({
        transcript: "raw transcript",
        articleContent: "# article body",
        screenshotDataUrl: "data:image/png;base64,abc",
        imageBase64: "abc123",
        youtubeTranscript: {
          source: "extension",
          characterCount: 2400,
        },
        pdfUrl: "https://cdn.saveit.now/users/u/bookmarks/b/file.pdf",
        width: 1200,
      }),
    ).toEqual({
      youtubeTranscript: {
        source: "extension",
        characterCount: 2400,
      },
      pdfUrl: "https://cdn.saveit.now/users/u/bookmarks/b/file.pdf",
      width: 1200,
    });
  });
});
