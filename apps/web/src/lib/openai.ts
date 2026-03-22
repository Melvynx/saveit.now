import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV3GenerateResult } from "@ai-sdk/provider";
import type { EmbeddingModel, LanguageModel } from "ai";
import { MockEmbeddingModelV3, MockLanguageModelV3 } from "ai/test";
import { env } from "./env";

const openai = createOpenAI({});

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

export const OPENAI_MODELS: {
  cheap: LanguageModel;
  normal: LanguageModel;
  embedding: EmbeddingModel;
} = env.CI
  ? {
      cheap: new MockLanguageModelV3({ doGenerate: mockGenerateResult }),
      normal: new MockLanguageModelV3({ doGenerate: mockGenerateResult }),
      embedding: new MockEmbeddingModelV3({
        doEmbed: {
          embeddings: [Array.from({ length: 1536 }, (_, i) => i * 0.0001)],
          warnings: [],
        },
      }),
    }
  : {
      cheap: openai("gpt-5-mini"),
      normal: openai("gpt-5"),
      embedding: openai.embedding("text-embedding-3-small"),
    };
