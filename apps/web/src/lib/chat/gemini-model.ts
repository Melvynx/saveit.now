import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

const google = createGoogleGenerativeAI({});

export const CHAT_MODEL: LanguageModel = google("gemini-3-flash-preview");

export type ThinkingConfig = {
  providerOptions?: {
    google?: GoogleGenerativeAIProviderOptions;
  };
};

export const getThinkingConfig = (enableThinking: boolean): ThinkingConfig => {
  if (!enableThinking) {
    return {};
  }

  return {
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 8192,
          includeThoughts: true,
        },
      },
    },
  };
};
