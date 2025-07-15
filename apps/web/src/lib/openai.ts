import { createOpenAI } from "@ai-sdk/openai";
import { EmbeddingModel, LanguageModelV1 } from "ai";
import { MockEmbeddingModelV1, MockLanguageModelV1 } from "ai/test";
import { env } from "./env";

const openai = createOpenAI({});

export const OPENAI_MODELS: {
  cheap: LanguageModelV1;
  normal: LanguageModelV1;
  embedding: EmbeddingModel<string>;
} = env.CI
  ? {
      cheap: new MockLanguageModelV1({
        doGenerate: async () => ({
          rawCall: { rawPrompt: null, rawSettings: {} },
          finishReason: "stop",
          usage: { promptTokens: 10, completionTokens: 20 },
          text: `OPENAI CHEAP MODEL`,
        }),
      }),
      normal: new MockLanguageModelV1({
        doGenerate: async () => ({
          rawCall: { rawPrompt: null, rawSettings: {} },
          finishReason: "stop",
          usage: { promptTokens: 10, completionTokens: 20 },
          text: `OPENAI NORMAL MODEL`,
        }),
      }),
      embedding: new MockEmbeddingModelV1({
        doEmbed: async (options) => ({
          embeddings: options.values.map(() => [1, 2, 3]),
        }),
      }),
    }
  : {
      cheap: openai("gpt-4o-mini"),
      normal: openai("gpt-4o"),
      embedding: openai.embedding("text-embedding-3-small"),
    };
