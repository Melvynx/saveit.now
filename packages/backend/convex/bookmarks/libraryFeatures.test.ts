// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { seededPick } from "./queries";

// Better Auth sessions can't run in convex-test; resolve the user from the
// test identity instead so the real auth wrappers still gate every call.
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

// Root-relative: see subscriptions/paidPeriod.test.ts.
const modules = import.meta.glob("/convex/**/*.*s");

const ME = "user_me";
const OTHER = "user_other";
const DAY = 24 * 60 * 60 * 1000;
const TODAY = "2026-10-19";
const TODAY_MS = Date.parse(`${TODAY}T00:00:00Z`);

function setup() {
  const t = convexTest(schema, modules);
  const me = t.withIdentity({ subject: ME });
  const insert = (extra: Record<string, unknown> = {}) =>
    t.run((ctx) =>
      ctx.db.insert("bookmarks", {
        userId: ME,
        url: `https://example.com/${Math.random()}`,
        title: "Example",
        type: "ARTICLE",
        status: "READY",
        starred: false,
        read: false,
        createdAt: TODAY_MS,
        updatedAt: TODAY_MS,
        ...extra,
      } as any),
    );
  const get = (id: Id<"bookmarks">) => t.run((ctx) => ctx.db.get(id));
  return { t, me, insert, get };
}

describe("bulkUpdate", () => {
  it("patches only owned bookmarks and skips read on non-readable types", async () => {
    const { me, insert, get } = setup();
    const article = await insert();
    const page = await insert({ type: "PAGE" });
    const foreign = await insert({ userId: OTHER });

    const res = await me.mutation(api.bookmarks.mutations.bulkUpdate, {
      ids: [article, page, foreign, article],
      starred: true,
      read: true,
    });

    expect(res).toEqual({ updated: 2 });
    expect(await get(article)).toMatchObject({ starred: true, read: true });
    expect(await get(page)).toMatchObject({ starred: true, read: false });
    expect(await get(foreign)).toMatchObject({ starred: false, read: false });
  });

  it("rejects more than 100 ids, empty patches and anonymous callers", async () => {
    const { t, me, insert } = setup();
    const id = await insert();
    const ids = await Promise.all(Array.from({ length: 101 }, () => insert()));

    await expect(
      me.mutation(api.bookmarks.mutations.bulkUpdate, { ids, starred: true }),
    ).rejects.toThrow();
    await expect(
      me.mutation(api.bookmarks.mutations.bulkUpdate, { ids: [id] }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.bookmarks.mutations.bulkUpdate, {
        ids: [id],
        starred: true,
      }),
    ).rejects.toThrow();
  });
});

describe("bulkRemove", () => {
  it("deletes owned bookmarks with joins, opens, embedding, counter and R2 job", async () => {
    // Keep the scheduled R2 cleanup queued instead of running it after the test.
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const { t, me, insert, get } = setup();
    const a = await insert();
    const b = await insert();
    const foreign = await insert({ userId: OTHER });
    await t.run(async (ctx) => {
      const tagId = await ctx.db.insert("tags", {
        userId: ME,
        name: "x",
        type: "USER",
      });
      await ctx.db.insert("bookmarkTags", { bookmarkId: a, tagId, userId: ME });
      await ctx.db.insert("bookmarkOpens", {
        bookmarkId: a,
        userId: ME,
        openedAt: 1,
      });
      const embeddingId = await ctx.db.insert("bookmarkEmbeddings", {
        bookmarkId: a,
        userId: ME,
        embedding: [0],
      });
      await ctx.db.patch(a, { embeddingId });
      await ctx.db.insert("userCounters", {
        userId: ME,
        bookmarkCount: 2,
        monthKey: "2026-10",
        monthlyRuns: 0,
        monthlyChatQueries: 0,
      });
    });

    const res = await me.mutation(api.bookmarks.mutations.bulkRemove, {
      ids: [a, b, foreign],
    });

    expect(res).toEqual({ removed: 2 });
    expect(await get(a)).toBeNull();
    expect(await get(b)).toBeNull();
    expect(await get(foreign)).not.toBeNull();
    const leftovers = await t.run(async (ctx) => ({
      joins: await ctx.db.query("bookmarkTags").collect(),
      opens: await ctx.db.query("bookmarkOpens").collect(),
      embeddings: await ctx.db.query("bookmarkEmbeddings").collect(),
      counter: await ctx.db.query("userCounters").first(),
      jobs: (
        await ctx.db.system.query("_scheduled_functions").collect()
      ).filter((job) => job.name.includes("deleteObjects")),
    }));
    expect(leftovers.joins).toHaveLength(0);
    expect(leftovers.opens).toHaveLength(0);
    expect(leftovers.embeddings).toHaveLength(0);
    expect(leftovers.counter?.bookmarkCount).toBe(0);
    expect(leftovers.jobs).toHaveLength(2);
  });
});

describe("tags.bulkAddTag", () => {
  it("upserts the tag once and links each owned bookmark once", async () => {
    const { t, me, insert } = setup();
    const a = await insert();
    const b = await insert();
    const foreign = await insert({ userId: OTHER });

    const first = await me.mutation(api.tags.mutations.bulkAddTag, {
      bookmarkIds: [a, b, foreign],
      tagName: "  reading  ",
    });
    expect(first.tagged).toBe(2);
    expect(first.tag).toMatchObject({ name: "reading", type: "USER" });

    const second = await me.mutation(api.tags.mutations.bulkAddTag, {
      bookmarkIds: [a, b],
      tagName: "reading",
    });
    expect(second).toMatchObject({ tagged: 0, tag: { id: first.tag.id } });

    const rows = await t.run(async (ctx) => ({
      tags: await ctx.db.query("tags").collect(),
      joins: await ctx.db.query("bookmarkTags").collect(),
    }));
    expect(rows.tags).toHaveLength(1);
    expect(rows.joins.map((j) => j.bookmarkId).sort()).toEqual([a, b].sort());
  });

  it("rejects empty names and foreign-only bookmarks", async () => {
    const { me, insert } = setup();
    const a = await insert();
    const foreign = await insert({ userId: OTHER });
    await expect(
      me.mutation(api.tags.mutations.bulkAddTag, {
        bookmarkIds: [a],
        tagName: "  ",
      }),
    ).rejects.toThrow();
    await expect(
      me.mutation(api.tags.mutations.bulkAddTag, {
        bookmarkIds: [foreign],
        tagName: "x",
      }),
    ).rejects.toThrow();
  });
});

describe("rediscover", () => {
  it("returns READY bookmarks older than 14 days, stable per day", async () => {
    const { me, insert } = setup();
    const old: Id<"bookmarks">[] = [];
    for (let i = 0; i < 10; i++) {
      old.push(await insert({ createdAt: TODAY_MS - (15 + i) * DAY }));
    }
    await insert({ createdAt: TODAY_MS - 3 * DAY }); // too recent
    await insert({ createdAt: TODAY_MS - 30 * DAY, status: "ERROR" });
    await insert({ createdAt: TODAY_MS - 30 * DAY, isExample: true });
    await insert({ createdAt: TODAY_MS - 30 * DAY, userId: OTHER });

    const a = await me.query(api.bookmarks.queries.rediscover, { day: TODAY });
    const b = await me.query(api.bookmarks.queries.rediscover, { day: TODAY });
    expect(a).toHaveLength(4);
    expect(a.map((x) => x._id)).toEqual(b.map((x) => x._id));
    for (const item of a) expect(old).toContain(item._id);
    expect(a[0]).toMatchObject({
      tags: [],
      openCount: 0,
      matchType: "default",
    });

    const capped = await me.query(api.bookmarks.queries.rediscover, {
      day: TODAY,
      count: 50,
    });
    expect(capped).toHaveLength(8);

    await expect(
      me.query(api.bookmarks.queries.rediscover, { day: "yesterday" }),
    ).rejects.toThrow();
  });

  it("seededPick is deterministic and seed-sensitive", () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    expect(seededPick(items, 5, "2026-10-19:u")).toEqual(
      seededPick(items, 5, "2026-10-19:u"),
    );
    expect(seededPick(items, 5, "2026-10-19:u")).not.toEqual(
      seededPick(items, 5, "2026-10-20:u"),
    );
    expect(new Set(seededPick(items, 50, "s")).size).toBe(50);
  });
});

describe("sidebarCounts", () => {
  it("counts unread and starred for the caller only", async () => {
    const { me, insert } = setup();
    await insert({ starred: true });
    await insert({ read: true });
    await insert();
    await insert({ userId: OTHER, starred: true });

    expect(await me.query(api.bookmarks.queries.sidebarCounts, {})).toEqual({
      unread: 2,
      starred: 1,
      capped: false,
    });
  });

  it("caps at 100", async () => {
    const { t, me } = setup();
    await t.run(async (ctx) => {
      for (let i = 0; i < 101; i++) {
        await ctx.db.insert("bookmarks", {
          userId: ME,
          url: `https://example.com/${i}`,
          status: "READY",
          starred: false,
          read: false,
          createdAt: i,
          updatedAt: i,
        });
      }
    });
    expect(await me.query(api.bookmarks.queries.sidebarCounts, {})).toEqual({
      unread: 100,
      starred: 0,
      capped: true,
    });
  });
});

describe("recentlyOpened", () => {
  it("dedupes by bookmark, newest open first, skips deleted", async () => {
    const { t, me, insert } = setup();
    const a = await insert();
    const b = await insert();
    const gone = await insert();
    await t.run(async (ctx) => {
      const open = (bookmarkId: Id<"bookmarks">, openedAt: number) =>
        ctx.db.insert("bookmarkOpens", { bookmarkId, userId: ME, openedAt });
      await open(a, 1);
      await open(b, 2);
      await open(a, 3);
      await open(gone, 4);
      await ctx.db.delete(gone);
      await ctx.db.insert("bookmarkOpens", {
        bookmarkId: b,
        userId: OTHER,
        openedAt: 5,
      });
    });

    const res = await me.query(api.bookmarks.queries.recentlyOpened, {});
    expect(res.map((x) => [x._id, x.lastOpenedAt])).toEqual([
      [a, 3],
      [b, 2],
    ]);
    const one = await me.query(api.bookmarks.queries.recentlyOpened, {
      limit: 1,
    });
    expect(one.map((x) => x._id)).toEqual([a]);
  });
});

describe("list order", () => {
  it("defaults to newest and supports oldest", async () => {
    const { me, insert } = setup();
    const older = await insert({ createdAt: 1 });
    const newer = await insert({ createdAt: 2 });
    const paginationOpts = { numItems: 10, cursor: null };

    const byDefault = await me.query(api.bookmarks.queries.list, {
      paginationOpts,
    });
    const oldest = await me.query(api.bookmarks.queries.list, {
      paginationOpts,
      order: "oldest",
    });
    expect(byDefault.page.map((x: any) => x._id)).toEqual([newer, older]);
    expect(oldest.page.map((x: any) => x._id)).toEqual([older, newer]);
  });
});

describe("related", () => {
  it("returns owner bookmarks sharing a tag, and [] for foreign ids", async () => {
    const { t, me, insert } = setup();
    const source = await insert();
    const sibling = await insert();
    await insert(); // untagged
    const foreign = await insert({ userId: OTHER });
    await t.run(async (ctx) => {
      const tagId = await ctx.db.insert("tags", {
        userId: ME,
        name: "ai",
        type: "IA",
      });
      for (const bookmarkId of [source, sibling]) {
        await ctx.db.insert("bookmarkTags", { bookmarkId, tagId, userId: ME });
      }
    });

    const res = await me.query(api.bookmarks.queries.related, {
      bookmarkId: source,
    });
    expect(res.map((x) => x._id)).toEqual([sibling]);
    expect(res[0]!.tags[0]!.tag.name).toBe("ai");

    expect(
      await me.query(api.bookmarks.queries.related, { bookmarkId: foreign }),
    ).toEqual([]);
  });
});
