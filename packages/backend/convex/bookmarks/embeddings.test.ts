// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { EMBEDDING_MODEL_KEY } from "../processing/embedding_format";
import schema from "../schema";

// Root-relative: see subscriptions/paidPeriod.test.ts.
const modules = import.meta.glob("/convex/**/*.*s");

const USER_ID = "user_embeddings";
const vector = (value: number) => Array.from({ length: 1536 }, () => value);

async function insertBookmark(
  t: ReturnType<typeof convexTest>,
  extra: Record<string, unknown> = {},
): Promise<Id<"bookmarks">> {
  return await t.run((ctx) =>
    ctx.db.insert("bookmarks", {
      userId: USER_ID,
      url: "https://example.com",
      title: "Example",
      status: "READY",
      starred: false,
      read: false,
      createdAt: 1,
      updatedAt: 1,
      ...extra,
    }),
  );
}

const embeddingRows = (t: ReturnType<typeof convexTest>) =>
  t.run((ctx) => ctx.db.query("bookmarkEmbeddings").collect());

describe("bookmark embeddings table", () => {
  it("moves legacy inline vectors out of bookmarks", async () => {
    const t = convexTest(schema, modules);
    const legacyId = await insertBookmark(t, {
      searchEmbedding: vector(0.5),
      embeddingModel: EMBEDDING_MODEL_KEY,
    });
    const bareId = await insertBookmark(t);

    await t.mutation(internal.migration.split_embeddings.run, {});

    const legacy = await t.run((ctx) => ctx.db.get(legacyId));
    expect(legacy?.searchEmbedding).toBeUndefined();
    expect(legacy?.embeddingModel).toBe(EMBEDDING_MODEL_KEY);
    const rows = await embeddingRows(t);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ bookmarkId: legacyId, userId: USER_ID });
    expect(rows[0]!._id).toBe(legacy?.embeddingId);
    expect(rows[0]!.embedding).toEqual(vector(0.5));

    const bare = await t.run((ctx) => ctx.db.get(bareId));
    expect(bare?.embeddingId).toBeUndefined();
  });

  it("reuses one row across re-embeds and resolves search hits by it", async () => {
    const t = convexTest(schema, modules);
    const bookmarkId = await insertBookmark(t);

    for (const value of [0.1, 0.2]) {
      await t.mutation(internal.processing.runs.applyResult, {
        bookmarkId,
        fields: {
          title: "Example",
          searchEmbedding: vector(value),
          embeddingModel: EMBEDDING_MODEL_KEY,
        },
      });
    }

    const rows = await embeddingRows(t);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.embedding).toEqual(vector(0.2));

    const hits = await t.query(internal.search.queries.loadForSearch, {
      ids: [],
      embeddingIds: [rows[0]!._id],
      userId: USER_ID,
    });
    expect(hits.map((hit) => hit._id)).toEqual([bookmarkId]);
    expect(hits[0]!.embeddingId).toBe(rows[0]!._id);

    const otherUserHits = await t.query(internal.search.queries.loadForSearch, {
      ids: [],
      embeddingIds: [rows[0]!._id],
      userId: "someone_else",
    });
    expect(otherUserHits).toEqual([]);
  });

  it("copies the vector to a duplicate without sharing the row", async () => {
    const t = convexTest(schema, modules);
    const sourceId = await insertBookmark(t);
    await t.mutation(internal.processing.runs.applyResult, {
      bookmarkId: sourceId,
      fields: {
        searchEmbedding: vector(0.3),
        embeddingModel: EMBEDDING_MODEL_KEY,
      },
    });
    const targetId = await insertBookmark(t, { status: "PROCESSING" });

    await t.mutation(internal.processing.runs.copyFromDuplicate, {
      sourceId,
      targetId,
    });

    const [source, target] = await t.run((ctx) =>
      Promise.all([ctx.db.get(sourceId), ctx.db.get(targetId)]),
    );
    expect(target?.embeddingModel).toBe(EMBEDDING_MODEL_KEY);
    expect(target?.embeddingId).toBeDefined();
    expect(target?.embeddingId).not.toBe(source?.embeddingId);
    const copy = await t.run((ctx) => ctx.db.get(target!.embeddingId!));
    expect(copy).toMatchObject({
      bookmarkId: targetId,
      embedding: vector(0.3),
    });
  });
});
