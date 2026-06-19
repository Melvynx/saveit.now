import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  bookmark: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("@workspace/database/client", () => ({
  prisma: prismaMock,
}));

import { getPublicBookmark } from "../src/lib/database/get-bookmark";
import { prisma } from "@workspace/database/client";

const makeBookmark = (overrides: Record<string, unknown> = {}) => ({
  id: "bookmark_private",
  userId: "user_private",
  url: "https://example.com/private",
  title: "Private bookmark",
  faviconUrl: null,
  summary: "Private summary",
  note: "Sensitive private note",
  preview: null,
  ogImageUrl: null,
  ogDescription: null,
  type: "ARTICLE",
  metadata: { markdown: "private article body" },
  status: "READY",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  starred: false,
  read: false,
  tags: [],
  ...overrides,
});

describe("public bookmark privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not expose a bookmark unless the owner enabled their public link", async () => {
    vi.mocked(prisma.bookmark.findUnique).mockResolvedValue(
      makeBookmark() as never,
    );
    vi.mocked(prisma.bookmark.findFirst).mockResolvedValue(null as never);

    await expect(getPublicBookmark("bookmark_private")).resolves.toBeNull();

    expect(prisma.bookmark.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "bookmark_private",
          user: { is: { publicLinkEnabled: true } },
        },
      }),
    );
    expect(prisma.bookmark.findUnique).not.toHaveBeenCalled();
  });
});
