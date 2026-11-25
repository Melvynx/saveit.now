// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";

vi.mock("../auth/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../auth/config")>()),
  requireAuth: async (ctx: {
    auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
  }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return { user: { id: identity.subject } };
  },
}));

const modules = import.meta.glob("/convex/**/*.*s");
const ME = "user_me";
const OTHER = "user_other";

function setup() {
  const t = convexTest(schema, modules);
  const me = t.withIdentity({ subject: ME });
  const insertBookmark = (userId = ME) =>
    t.run((ctx) =>
      ctx.db.insert("bookmarks", {
        userId,
        url: `https://example.com/${Math.random()}`,
        status: "READY",
        starred: false,
        read: false,
        createdAt: 0,
        updatedAt: 0,
      }),
    );
  return { t, me, insertBookmark };
}

describe("manual tag usage", () => {
  it("counts manual adds once per bookmark and ranks the top tags", async () => {
    const { me, insertBookmark } = setup();
    const a = await insertBookmark();
    const b = await insertBookmark();

    await me.mutation(api.tags.mutations.updateBookmarkTags, {
      bookmarkId: a,
      add: ["design", "  reading  ", "design"],
    });
    // Adding a tag that is already there does not count twice.
    await me.mutation(api.tags.mutations.updateBookmarkTags, {
      bookmarkId: a,
      add: ["design"],
    });
    await me.mutation(api.tags.mutations.updateBookmarkTags, {
      bookmarkId: b,
      add: ["design"],
    });

    const top = await me.query(api.tags.queries.topManualTags, { limit: 3 });
    expect(top.map((tag) => [tag.name, tag.manualUseCount])).toEqual([
      ["design", 2],
      ["reading", 1],
    ]);
  });

  it("removes only the named tags and keeps AI tags", async () => {
    const { t, me, insertBookmark } = setup();
    const id = await insertBookmark();
    await t.mutation(internal.tags.mutations.setBookmarkTagsByNameInternal, {
      bookmarkId: id,
      tagNames: ["ai-tag"],
      userId: ME,
    });

    await me.mutation(api.tags.mutations.updateBookmarkTags, {
      bookmarkId: id,
      add: ["mine"],
    });
    const tags = await me.mutation(api.tags.mutations.updateBookmarkTags, {
      bookmarkId: id,
      add: [],
      remove: ["mine"],
    });

    expect(tags.map((tag) => tag.name)).toEqual(["ai-tag"]);
  });

  it("tops up suggestions with recent tags and never leaks other users", async () => {
    const { t, me, insertBookmark } = setup();
    await t.run(async (ctx) => {
      await ctx.db.insert("tags", { userId: OTHER, name: "theirs", type: "USER", manualUseCount: 9 });
      await ctx.db.insert("tags", { userId: ME, name: "fresh", type: "USER" });
    });
    const top = await me.query(api.tags.queries.topManualTags, {});
    expect(top.map((tag) => tag.name)).toEqual(["fresh"]);

    const foreign = await insertBookmark(OTHER);
    await expect(
      me.mutation(api.tags.mutations.updateBookmarkTags, {
        bookmarkId: foreign,
        add: ["x"],
      }),
    ).rejects.toThrow();
  });

  it("extension state returns current tags, suggestions and search matches", async () => {
    const { t, me, insertBookmark } = setup();
    const id = await insertBookmark();
    await me.mutation(api.tags.mutations.updateBookmarkTags, {
      bookmarkId: id,
      add: ["typescript", "react"],
    });

    const state = await t.query(internal.tags.queries.extensionTagState, {
      userId: ME,
      bookmarkId: id,
    });
    expect(state?.tags.map((tag) => tag.name).sort()).toEqual(["react", "typescript"]);
    expect(state?.suggestions).toHaveLength(2);

    const search = await t.query(internal.tags.queries.extensionTagState, {
      userId: ME,
      bookmarkId: id,
      query: "SCR",
    });
    expect(search?.matches.map((tag) => tag.name)).toEqual(["typescript"]);

    const foreign = await t.query(internal.tags.queries.extensionTagState, {
      userId: OTHER,
      bookmarkId: id,
    });
    expect(foreign).toBeNull();
  });

  it("rejects over-long tag names", async () => {
    const { me, insertBookmark } = setup();
    const id = await insertBookmark();
    await expect(
      me.mutation(api.tags.mutations.updateBookmarkTags, {
        bookmarkId: id,
        add: ["x".repeat(49)],
      }),
    ).rejects.toThrow();
  });
});
