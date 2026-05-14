import {
  GEMINI_DOCUMENT_EMBEDDING_PROVIDER_OPTIONS,
  GEMINI_EMBEDDING_CACHE_MODEL,
  GEMINI_EMBEDDING_DIMENSIONS,
  GEMINI_MODEL_IDS,
  GEMINI_QUERY_EMBEDDING_PROVIDER_OPTIONS,
} from "../src/lib/gemini";
import { CHAT_MODEL } from "../src/lib/chat/gemini-model";

describe("Gemini model configuration", () => {
  it("uses Gemini Flash-Lite for cheap generation and Gemini 3.1 Pro for normal generation", () => {
    expect(GEMINI_MODEL_IDS.cheap).toBe("gemini-3.1-flash-lite");
    expect(GEMINI_MODEL_IDS.normal).toBe("gemini-3.1-pro-preview");
  });

  it("uses the central normal Gemini model for chat", () => {
    expect((CHAT_MODEL as { modelId: string }).modelId).toBe(
      GEMINI_MODEL_IDS.normal,
    );
  });

  it("keeps Gemini embeddings compatible with existing 1536-dimension pgvector columns", () => {
    expect(GEMINI_MODEL_IDS.embedding).toBe("gemini-embedding-2");
    expect(GEMINI_EMBEDDING_DIMENSIONS).toBe(1536);
    expect(GEMINI_EMBEDDING_CACHE_MODEL).toBe("gemini-embedding-2:1536");
  });

  it("sets distinct Gemini task types for document and query embeddings", () => {
    expect(GEMINI_DOCUMENT_EMBEDDING_PROVIDER_OPTIONS).toEqual({
      google: {
        outputDimensionality: 1536,
        taskType: "RETRIEVAL_DOCUMENT",
      },
    });

    expect(GEMINI_QUERY_EMBEDDING_PROVIDER_OPTIONS).toEqual({
      google: {
        outputDimensionality: 1536,
        taskType: "RETRIEVAL_QUERY",
      },
    });
  });
});
