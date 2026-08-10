"use node";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed, embedMany } from "ai";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import {
  EMBEDDING_MODEL,
  EMBEDDING_MODEL_KEY,
  EMBEDDING_PROVIDER_OPTIONS,
  formatSearchDocument,
  formatSearchQuery,
} from "./embedding_format";

const google = createGoogleGenerativeAI({});

export {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  EMBEDDING_MODEL_KEY,
} from "./embedding_format";

function getEmbeddingModel() {
  return google.embeddingModel(EMBEDDING_MODEL);
}

/**
 * Embed a document text for indexing (combined title + vectorSummary).
 * If vectorSummary is empty, embeds title alone.
 */
export async function embedDocument(text: string): Promise<number[]> {
  const model = getEmbeddingModel();
  const result = await embed({
    model,
    value: formatSearchDocument(text),
    providerOptions: EMBEDDING_PROVIDER_OPTIONS,
  });
  return result.embedding;
}

/**
 * Embed a query text for semantic search.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const model = getEmbeddingModel();
  const result = await embed({
    model,
    value: formatSearchQuery(text),
    providerOptions: EMBEDDING_PROVIDER_OPTIONS,
  });
  return result.embedding;
}

/**
 * embedMany helper — used by pipeline to embed a single combined text.
 */
export async function embedGeminiDocuments(
  values: string[],
): Promise<{ embeddings: number[][] }> {
  const model = getEmbeddingModel();
  const result = await embedMany({
    model,
    values: values.map((value) => formatSearchDocument(value)),
    providerOptions: EMBEDDING_PROVIDER_OPTIONS,
  });
  return { embeddings: result.embeddings };
}

/**
 * Convex internalAction: embed a combined (title + vectorSummary) document.
 * Returns the embedding vector.
 */
export const embed_internal = internalAction({
  args: {
    title: v.string(),
    vectorSummary: v.optional(v.string()),
  },
  returns: v.array(v.float64()),
  handler: async (_ctx, { title, vectorSummary }) => {
    const text =
      vectorSummary && vectorSummary.trim()
        ? title + "\n" + vectorSummary
        : title;
    return embedDocument(text);
  },
});

/**
 * Rebuild a bookmark's semantic-search embedding after a user edits its title.
 * The mutation applies the result only when the indexed source fields still
 * match this action's snapshot.
 */
export const refreshBookmarkSearchEmbedding = internalAction({
  args: {
    bookmarkId: v.id("bookmarks"),
  },
  returns: v.boolean(),
  handler: async (ctx, { bookmarkId }): Promise<boolean> => {
    const snapshot: {
      title: string | null;
      vectorSummary: string | null;
    } | null = await ctx.runQuery(
      internal.processing.runs.getForEmbeddingRefresh,
      { bookmarkId },
    );
    if (!snapshot) return false;

    const text = [snapshot.title?.trim(), snapshot.vectorSummary?.trim()]
      .filter(Boolean)
      .join("\n");
    if (!text) return false;

    const searchEmbedding = await embedDocument(text);
    return await ctx.runMutation(
      internal.processing.runs.applyRefreshedEmbedding,
      {
        bookmarkId,
        expectedTitle: snapshot.title,
        expectedVectorSummary: snapshot.vectorSummary,
        searchEmbedding,
        embeddingModel: EMBEDDING_MODEL_KEY,
      },
    );
  },
});
