import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { EmbeddingModel, LanguageModelV1 } from "ai";

const google = createGoogleGenerativeAI({
  // custom settings
});

export const GEMINI_MODELS: {
  cheap: LanguageModelV1;
  normal: LanguageModelV1;
  embedding: EmbeddingModel<string>;
} = {
  cheap: google("gemini-2.0-flash"),
  normal: google("gemini-2.5-pro-preview-05-06"),
  embedding: google.textEmbeddingModel("text-embedding-004"),
};
