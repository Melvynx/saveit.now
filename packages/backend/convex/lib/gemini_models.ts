import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";

export const GEMINI_GENERATION_MODELS = {
  cheap: "gemini-3.8-flash",
  normal: "gemini-3.8-flash",
} as const;

// Routine text-only bookmark processing (summaries, tags) is classification-like,
// so it uses low thinking instead of the default (medium). Google recommends
// minimal/low thinking for fact retrieval or classification:
// https://ai.google.dev/gemini-api/docs/thinking ("Controlling thinking").
// Eval on gemini-3.8-flash (article, SaaS landing, recipe), default vs low:
// reasoning tokens 1441/1259/1615 -> 117/71/0, latency 13.0s/11.8s/15.1s ->
// 4.9s/5.4s/4.9s, with equivalent summaries and tags.
export const BOOKMARK_TEXT_PROCESSING_PROVIDER_OPTIONS = {
  google: {
    thinkingConfig: { thinkingLevel: "low" },
  } satisfies GoogleGenerativeAIProviderOptions,
} as const;
