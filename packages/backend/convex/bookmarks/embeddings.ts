/**
 * bookmarks/embeddings.ts — the only writers of `bookmarkEmbeddings`.
 *
 * The search vector is ~15 KB, several times the rest of a bookmark, so it
 * lives in its own table. Every list, search, and reactive re-run of
 * `bookmarks` would otherwise read it. Callers merge the returned patch into
 * their own bookmark patch so each mutation still writes the bookmark once.
 */

import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

type EmbeddedBookmark = Pick<
  Doc<"bookmarks">,
  "_id" | "userId" | "embeddingId"
>;

export type BookmarkEmbeddingPatch = Pick<
  Doc<"bookmarks">,
  "embeddingId" | "embeddingModel" | "searchEmbedding"
>;

/** Stores `embedding` for the bookmark and returns the bookmark patch. */
export async function writeBookmarkEmbedding(
  ctx: MutationCtx,
  bookmark: EmbeddedBookmark,
  embedding: number[],
  embeddingModel: string,
): Promise<BookmarkEmbeddingPatch> {
  const row = {
    bookmarkId: bookmark._id,
    userId: bookmark.userId,
    embedding,
  };

  let embeddingId = bookmark.embeddingId;
  if (embeddingId) {
    await ctx.db.replace(embeddingId, row);
  } else {
    embeddingId = await ctx.db.insert("bookmarkEmbeddings", row);
  }

  return { embeddingId, embeddingModel, searchEmbedding: undefined };
}

/** Deletes the bookmark's embedding and returns the bookmark patch. */
export async function removeBookmarkEmbedding(
  ctx: MutationCtx,
  bookmark: EmbeddedBookmark,
): Promise<BookmarkEmbeddingPatch> {
  if (bookmark.embeddingId) {
    await ctx.db.delete(bookmark.embeddingId);
  }
  return {
    embeddingId: undefined,
    embeddingModel: undefined,
    searchEmbedding: undefined,
  };
}
