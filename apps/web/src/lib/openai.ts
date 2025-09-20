import { createOpenAI } from "@ai-sdk/openai";
import { EmbeddingModel, LanguageModel } from "ai";
import { MockEmbeddingModelV2, MockLanguageModelV2 } from "ai/test";
import { env } from "./env";

const openai = createOpenAI({});

export const OPENAI_MODELS: {
  cheap: LanguageModel;
  normal: LanguageModel;
  embedding: EmbeddingModel<string>;
} = env.CI
  ? {
      cheap: new MockLanguageModelV2({
        doGenerate: async () => ({
          rawCall: { rawPrompt: null, rawSettings: {} },
          finishReason: "stop",
          usage: {
            inputTokens: 10,
            outputTokens: 20,
            totalTokens: 30,
            promptTokens: 10,
            completionTokens: 20,
          },
          content: [{ type: "text", text: "OPENAI CHEAP MODEL" }],
          warnings: [],
        }),
      }),
      normal: new MockLanguageModelV2({
        doGenerate: async () => ({
          rawCall: { rawPrompt: null, rawSettings: {} },
          finishReason: "stop",
          usage: {
            inputTokens: 10,
            outputTokens: 20,
            totalTokens: 30,
            promptTokens: 10,
            completionTokens: 20,
          },
          content: [{ type: "text", text: "OPENAI NORMAL MODEL" }],
          warnings: [],
        }),
      }),
      embedding: new MockEmbeddingModelV2({
        doEmbed: async (options) => ({
          embeddings: options.values.map(() =>
            Array.from(
              { length: 1536 },
              (_, i) => Math.random() * 0.01 + i * 0.0001,
            ),
          ),
        }),
      }),
    }
  : {
      cheap: openai("gpt-5-mini"),
      normal: openai("gpt-5"),
      embedding: openai.embedding("text-embedding-3-small"),
    };
