import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModelV3GenerateResult } from "@ai-sdk/provider";
import { embed, embedMany, type EmbeddingModel, type LanguageModel } from "ai";
import { MockEmbeddingModelV3, MockLanguageModelV3 } from "ai/test";

const google = createGoogleGenerativeAI({});

export const GEMINI_MODEL_IDS = {
  cheap: "gemini-3.1-flash-lite",
  normal: "gemini-3.1-pro-preview",
  embedding: "gemini-embedding-2",
} as const;

export const GEMINI_EMBEDDING_DIMENSIONS = 1536;
export const GEMINI_EMBEDDING_CACHE_MODEL = `${GEMINI_MODEL_IDS.embedding}:${GEMINI_EMBEDDING_DIMENSIONS}`;
export const GEMINI_EMBEDDING_METADATA_KEY = "embeddingModel";
export const GEMINI_EMBEDDING_METADATA_VALUE = GEMINI_EMBEDDING_CACHE_MODEL;

export const GEMINI_DOCUMENT_EMBEDDING_PROVIDER_OPTIONS = {
  google: {
    outputDimensionality: GEMINI_EMBEDDING_DIMENSIONS,
    taskType: "RETRIEVAL_DOCUMENT",
  },
} as const;

export const GEMINI_QUERY_EMBEDDING_PROVIDER_OPTIONS = {
  google: {
    outputDimensionality: GEMINI_EMBEDDING_DIMENSIONS,
    taskType: "RETRIEVAL_QUERY",
  },
} as const;

const isCI =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.CI === "true";

const mockGenerateResult: LanguageModelV3GenerateResult = {
  finishReason: { unified: "stop", raw: undefined },
  usage: {
    inputTokens: {
      total: 10,
      noCache: undefined,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: { total: 20, text: undefined, reasoning: undefined },
  },
  content: [{ type: "text", text: "MOCK" }],
  warnings: [],
};

const mockEmbedding = new Array<number>(GEMINI_EMBEDDING_DIMENSIONS);
for (let i = 0; i < GEMINI_EMBEDDING_DIMENSIONS; i += 1) {
  mockEmbedding[i] = i * 0.0001;
}

export const GEMINI_MODELS: {
  cheap: LanguageModel;
  normal: LanguageModel;
  embedding: EmbeddingModel;
} = isCI
  ? {
      cheap: new MockLanguageModelV3({ doGenerate: mockGenerateResult }),
      normal: new MockLanguageModelV3({ doGenerate: mockGenerateResult }),
      embedding: new MockEmbeddingModelV3({
        doEmbed: {
          embeddings: [mockEmbedding],
          warnings: [],
        },
      }),
    }
  : {
      cheap: google(GEMINI_MODEL_IDS.cheap),
      normal: google(GEMINI_MODEL_IDS.normal),
      embedding: google.embeddingModel(GEMINI_MODEL_IDS.embedding),
    };

export function embedGeminiDocuments(values: string[]) {
  return embedMany({
    model: GEMINI_MODELS.embedding,
    values,
    providerOptions: GEMINI_DOCUMENT_EMBEDDING_PROVIDER_OPTIONS,
  });
}

export function embedGeminiQuery(value: string) {
  return embed({
    model: GEMINI_MODELS.embedding,
    value,
    providerOptions: GEMINI_QUERY_EMBEDDING_PROVIDER_OPTIONS,
  });
}
