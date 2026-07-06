import { describe, expect, it } from "vitest";
import { buildRelatedBookmarksWhere } from "../src/lib/database/public-bookmarks";

describe("public bookmark related results", () => {
  it("scopes related bookmarks to the public bookmark owner", () => {
    expect(
      buildRelatedBookmarksWhere({
        bookmarkId: "bookmark_public",
        userId: "owner_user",
        tagIds: ["tag_shared"],
      }),
    ).toMatchObject({
      userId: "owner_user",
      id: { not: "bookmark_public" },
      status: "READY",
      title: { not: null },
      tags: { some: { tagId: { in: ["tag_shared"] } } },
    });
  });
});
