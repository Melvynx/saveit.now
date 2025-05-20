import { createOpenAI } from "@ai-sdk/openai";
import { EmbeddingModel, LanguageModelV1 } from "ai";

const openai = createOpenAI({});

export const OPENAI_MODELS: {
  cheap: LanguageModelV1;
  normal: LanguageModelV1;
  embedding: EmbeddingModel<string>;
} = {
  cheap: openai("gpt-4o-mini"),
  normal: openai("gpt-4o"),
  embedding: openai.embedding("text-embedding-3-small"),
};
