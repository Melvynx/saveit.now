import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { EmbeddingModel, LanguageModel } from "ai";
import { MockEmbeddingModelV2, MockLanguageModelV2 } from "ai/test";
import { env } from "./env";

const google = createGoogleGenerativeAI({
  // custom settings
});

export const GEMINI_MODELS: {
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
            completionTokens: 20
          },
          content: [{ type: "text", text: "GEMINI CHEAP MODEL" }],
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
            completionTokens: 20
          },
          content: [{ type: "text", text: "GEMINI NORMAL MODEL" }],
          warnings: [],
        }),
      }),
      embedding: new MockEmbeddingModelV2({
        doEmbed: async (options) => ({
          embeddings: options.values.map(() => [1, 2, 3]),
        }),
      }),
    }
  : {
      cheap: google("gemini-2.0-flash"),
      normal: google("gemini-2.5-pro-preview-05-06"),
      embedding: google.textEmbeddingModel("text-embedding-004"),
    };
