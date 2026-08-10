import { describe, expect, it } from "vitest";
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  EMBEDDING_MODEL_KEY,
  EMBEDDING_PROVIDER_OPTIONS,
  formatSearchDocument,
  formatSearchQuery,
} from "./embedding_format";

describe("Gemini Embeddings 2 retrieval formatting", () => {
  it("formats search queries with Google's asymmetric retrieval prefix", () => {
    expect(formatSearchQuery("typescript bookmarks")).toBe(
      "task: search result | query: typescript bookmarks",
    );
  });

  it("formats documents with Google's asymmetric retrieval structure", () => {
    expect(formatSearchDocument("A guide to TypeScript")).toBe(
      "title: none | text: A guide to TypeScript",
    );
    expect(
      formatSearchDocument("A guide to TypeScript", "TypeScript handbook"),
    ).toBe("title: TypeScript handbook | text: A guide to TypeScript");
  });

  it("versions the prompt format separately while preserving the model and dimensions", () => {
    expect(EMBEDDING_MODEL).toBe("gemini-embedding-2");
    expect(EMBEDDING_DIMENSIONS).toBe(1536);
    expect(EMBEDDING_PROVIDER_OPTIONS).toEqual({
      google: { outputDimensionality: 1536 },
    });
    expect(EMBEDDING_MODEL_KEY).toBe(
      "gemini-embedding-2:1536:search-result-v1",
    );
  });
});
