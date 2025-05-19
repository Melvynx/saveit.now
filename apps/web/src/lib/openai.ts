import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({});

export const MODELS = {
  cheap: openai("gpt-4o-mini"),
  normal: openai("gpt-4o"),
  embedding: openai.embedding("text-embedding-3-small"),
};
