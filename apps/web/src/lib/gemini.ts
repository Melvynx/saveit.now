import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModelV3GenerateResult } from "@ai-sdk/provider";
import type { EmbeddingModel, LanguageModel } from "ai";
import { MockEmbeddingModelV3, MockLanguageModelV3 } from "ai/test";
import { env } from "./env";

const google = createGoogleGenerativeAI({});

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

export const GEMINI_MODELS: {
  cheap: LanguageModel;
  normal: LanguageModel;
  embedding: EmbeddingModel;
} = env.CI
  ? {
      cheap: new MockLanguageModelV3({ doGenerate: mockGenerateResult }),
      normal: new MockLanguageModelV3({ doGenerate: mockGenerateResult }),
      embedding: new MockEmbeddingModelV3({
        doEmbed: { embeddings: [[1, 2, 3]], warnings: [] },
      }),
    }
  : {
      cheap: google("gemini-2.0-flash"),
      normal: google("gemini-2.5-pro-preview-05-06"),
      embedding: google.embeddingModel("text-embedding-004"),
    };
