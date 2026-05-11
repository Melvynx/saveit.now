import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { GEMINI_MODEL_IDS } from "../gemini";

const google = createGoogleGenerativeAI({});

export const CHAT_MODEL = google(GEMINI_MODEL_IDS.normal);

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
