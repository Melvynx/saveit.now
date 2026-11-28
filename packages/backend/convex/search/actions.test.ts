// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { getFunctionName } from "convex/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  EMBEDDING_MODEL,
  EMBEDDING_MODEL_KEY,
} from "../processing/embedding_format";
import schema from "../schema";
import { searchForChat } from "./actions";

// No network: the query vector comes from this mock.
const embedMock = vi.hoisted(() => vi.fn());
vi.mock("ai", () => ({ embed: embedMock }));
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => ({ embeddingModel: () => "fake-model" }),
}));

// Root-relative: see subscriptions/paidPeriod.test.ts.
const modules = import.meta.glob("/convex/**/*.*s");

const USER_ID = "user_search";
const OTHER_USER_ID = "user_other";

/** Unit vector whose cosine similarity with `axis(0)` is `similarity`. */
const vectorWithSimilarity = (similarity: number) => {
  const vector = Array.from({ length: 1536 }, () => 0);
  vector[0] = similarity;
  vector[1] = Math.sqrt(1 - similarity * similarity);
  return vector;
};
const QUERY_VECTOR = vectorWithSimilarity(1);

type TestConvex = ReturnType<typeof convexTest>;

async function insertBookmark(
  t: TestConvex,
  fields: {
    title: string;
    userId?: string;
    status?: "PENDING" | "PROCESSING" | "READY" | "ERROR";
    embeddingModel?: string;
    similarity?: number;
    inlineSimilarity?: number;
  },
): Promise<Id<"bookmarks">> {
  return await t.run(async (ctx) => {
    const userId = fields.userId ?? USER_ID;
    const bookmarkId = await ctx.db.insert("bookmarks", {
      userId,
      url: `https://example.com/${encodeURIComponent(fields.title)}`,
      title: fields.title,
      status: fields.status ?? "READY",
      starred: false,
      read: false,
      createdAt: 1,
      updatedAt: 1,
      embeddingModel: fields.embeddingModel,
      ...(fields.inlineSimilarity !== undefined
        ? { searchEmbedding: vectorWithSimilarity(fields.inlineSimilarity) }
        : {}),
    });
    if (fields.similarity !== undefined) {
      const embeddingId = await ctx.db.insert("bookmarkEmbeddings", {
        bookmarkId,
        userId,
        embedding: vectorWithSimilarity(fields.similarity),
      });
      await ctx.db.patch(bookmarkId, { embeddingId });
    }
    return bookmarkId;
  });
}

const VECTOR_FIELDS: Record<string, string> = {
  bookmarkEmbeddings: "embedding",
  bookmarks: "searchEmbedding",
};

const cosineSimilarity = (a: number[], b: number[]) => {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  return dot / Math.sqrt(normA * normB);
};

/**
 * Action ctx for the registered handler: queries run for real against
 * convex-test; vectorSearch is a spy scoring the stored vectors that pass the
 * caller's `q.eq(field, value)` filter.
 */
function createActionCtx(t: TestConvex) {
  const runQuery = vi.fn((ref: any, args: any) => t.query(ref, args));
  const vectorSearch = vi.fn(
    async (
      table: string,
      _index: string,
      query: { vector: number[]; limit: number; filter: (q: any) => any },
    ) => {
      const condition = query.filter({
        eq: (field: string, value: unknown) => ({ field, value }),
      });
      const vectorField = VECTOR_FIELDS[table]!;
      const rows: any[] = await t.run((ctx) =>
        ctx.db.query(table as any).collect(),
      );
      return rows
        .filter((row) => row[condition.field] === condition.value)
        .filter((row) => Array.isArray(row[vectorField]))
        .map((row) => ({
          _id: row._id,
          _score: cosineSimilarity(query.vector, row[vectorField]),
        }))
        .sort((a, b) => b._score - a._score)
        .slice(0, query.limit);
    },
  );
  return { runQuery, vectorSearch };
}

const runSearchForChat = (ctx: unknown, query: string) =>
  (searchForChat as any)._handler(ctx, { userId: USER_ID, query });

describe("searchForChat vector search", () => {
  beforeEach(() => {
    embedMock.mockReset();
    embedMock.mockResolvedValue({ embedding: QUERY_VECTOR });
  });

  it("reads only the split embedding store, scoped to the caller", async () => {
    const t = convexTest(schema, modules);
    const current = await insertBookmark(t, {
      title: "Current model",
      embeddingModel: EMBEDDING_MODEL_KEY,
      similarity: 0.9,
    });
    const legacyKey = await insertBookmark(t, {
      title: "Legacy model key",
      embeddingModel: EMBEDDING_MODEL,
      similarity: 0.7,
    });
    await insertBookmark(t, {
      title: "Other tenant",
      userId: OTHER_USER_ID,
      embeddingModel: EMBEDDING_MODEL_KEY,
      similarity: 1,
    });
    await insertBookmark(t, {
      title: "Incompatible model",
      embeddingModel: "text-embedding-3-small",
      similarity: 0.99,
    });
    await insertBookmark(t, {
      title: "Still pending",
      status: "PENDING",
      embeddingModel: EMBEDDING_MODEL_KEY,
      similarity: 0.98,
    });
    const inlineOnly = await insertBookmark(t, {
      title: "Inline vector only",
      embeddingModel: EMBEDDING_MODEL_KEY,
      inlineSimilarity: 0.95,
    });
    const titleMatch = await insertBookmark(t, { title: "rust ownership" });

    const ctx = createActionCtx(t);
    const response = await runSearchForChat(ctx, "rust");

    expect(ctx.vectorSearch).toHaveBeenCalledTimes(1);
    const [table, index, vectorQuery] = ctx.vectorSearch.mock.calls[0]!;
    expect([table, index]).toEqual(["bookmarkEmbeddings", "by_embedding"]);
    expect(ctx.vectorSearch).not.toHaveBeenCalledWith(
      "bookmarks",
      "by_search_embedding",
      expect.anything(),
    );
    expect(vectorQuery).toMatchObject({ vector: QUERY_VECTOR, limit: 50 });
    const eq = vi.fn(() => "userId-filter");
    expect(vectorQuery.filter({ eq })).toBe("userId-filter");
    expect(eq).toHaveBeenCalledExactlyOnceWith("userId", USER_ID);

    const loadCalls = ctx.runQuery.mock.calls.filter(
      ([ref]) =>
        getFunctionName(ref) ===
        getFunctionName(internal.search.queries.loadForSearch),
    );
    expect(loadCalls).toHaveLength(1);
    const loadArgs = loadCalls[0]![1];
    expect(loadArgs.ids).toEqual([]);
    expect(loadArgs.userId).toBe(USER_ID);
    const embeddingIds = await t.run(async (ctx) =>
      (
        await ctx.db
          .query("bookmarkEmbeddings")
          .filter((q) => q.eq(q.field("userId"), USER_ID))
          .collect()
      ).map((row) => row._id),
    );
    expect([...loadArgs.embeddingIds].sort()).toEqual([...embeddingIds].sort());

    const ids = response.bookmarks.map((bookmark: any) => bookmark._id);
    // Title matches score a flat 70, above these vector scores (54 and 42).
    expect(ids).toEqual([titleMatch, current, legacyKey]);
    expect(ids).not.toContain(inlineOnly);
    expect(response.bookmarks[0]).toMatchObject({ matchType: "text" });
    expect(response.bookmarks[1].matchType).toBe("vector");
    expect(response.bookmarks[1].score).toBeCloseTo(100 * 0.9 * 0.6);
    expect(response.bookmarks[2].matchType).toBe("vector");
    expect(response.bookmarks[2].score).toBeCloseTo(100 * 0.7 * 0.6);
  });

  it("floors negative cosine scores at zero before spread and ranking", async () => {
    const t = convexTest(schema, modules);
    const positive = await insertBookmark(t, {
      title: "Positive match",
      embeddingModel: EMBEDDING_MODEL_KEY,
      similarity: 0.5,
    });
    // Unfloored, -0.4 sits outside the 0.8 spread from 0.5; floored to 0 it
    // stays inside, matching the legacy Math.max(..., 0) behavior.
    const negative = await insertBookmark(t, {
      title: "Opposite match",
      embeddingModel: EMBEDDING_MODEL_KEY,
      similarity: -0.4,
    });

    const ctx = createActionCtx(t);
    const response = await runSearchForChat(ctx, "zzz-no-title-match");

    const ids = response.bookmarks.map((bookmark: any) => bookmark._id);
    expect(ids).toEqual([positive, negative]);
    expect(response.bookmarks[0].score).toBeCloseTo(100 * 0.5 * 0.6);
    expect(response.bookmarks[1].matchType).toBe("vector");
    expect(response.bookmarks[1].score).toBe(0);
  });

  it("falls back to title matches when the query embedding fails", async () => {
    const t = convexTest(schema, modules);
    embedMock.mockRejectedValue(new Error("embedding down"));
    const titleMatch = await insertBookmark(t, { title: "rust ownership" });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const ctx = createActionCtx(t);
    const response = await runSearchForChat(ctx, "rust");

    expect(ctx.vectorSearch).not.toHaveBeenCalled();
    expect(response.bookmarks.map((bookmark: any) => bookmark._id)).toEqual([
      titleMatch,
    ]);
  });
});
