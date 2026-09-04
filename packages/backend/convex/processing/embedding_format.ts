export const EMBEDDING_MODEL = "gemini-embedding-2";
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Version the retrieval prompt contract independently from the provider model.
 * Every stored document vector and query vector must use the same format.
 */
export const EMBEDDING_PROMPT_VERSION = "search-result-v1";
export const EMBEDDING_MODEL_KEY = `${EMBEDDING_MODEL}:${EMBEDDING_DIMENSIONS}:${EMBEDDING_PROMPT_VERSION}`;

/** Vectors written before the prompt-version suffix still live in the same space. */
export function isCompatibleSearchEmbeddingModel(
  model: string | null | undefined,
): boolean {
  if (!model) return false;
  return model === EMBEDDING_MODEL || model.startsWith(`${EMBEDDING_MODEL}:`);
}

export const EMBEDDING_PROVIDER_OPTIONS = {
  google: {
    outputDimensionality: EMBEDDING_DIMENSIONS,
  },
} as const;

/** Gemini Embeddings 2 asymmetric retrieval query format. */
export function formatSearchQuery(text: string): string {
  return `task: search result | query: ${text}`;
}

/** Gemini Embeddings 2 asymmetric retrieval document format. */
export function formatSearchDocument(text: string, title?: string): string {
  return `title: ${title?.trim() || "none"} | text: ${text}`;
}
