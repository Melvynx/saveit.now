import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { EmbeddingModel, LanguageModelV1 } from "ai";
import { MockEmbeddingModelV1, MockLanguageModelV1 } from "ai/test";
import { env } from "./env";

const google = createGoogleGenerativeAI({
  // custom settings
});

export const GEMINI_MODELS: {
  cheap: LanguageModelV1;
  normal: LanguageModelV1;
  embedding: EmbeddingModel<string>;
} =
  env.NODE_ENV === "test"
    ? {
        cheap: new MockLanguageModelV1({
          doGenerate: async () => ({
            rawCall: { rawPrompt: null, rawSettings: {} },
            finishReason: "stop",
            usage: { promptTokens: 10, completionTokens: 20 },
            text: `GEMINI CHEAP MODEL`,
          }),
        }),
        normal: new MockLanguageModelV1({
          doGenerate: async () => ({
            rawCall: { rawPrompt: null, rawSettings: {} },
            finishReason: "stop",
            usage: { promptTokens: 10, completionTokens: 20 },
            text: `GEMINI NORMAL MODEL`,
          }),
        }),
        embedding: new MockEmbeddingModelV1({
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
