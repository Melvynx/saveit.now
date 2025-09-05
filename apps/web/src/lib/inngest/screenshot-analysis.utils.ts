import { generateText, tool } from "ai";
import { z } from "zod";
import { GEMINI_MODELS } from "../gemini";
import { getImageUrlToBase64 } from "./bookmark.utils";

/**
 * Result of screenshot analysis
 */
export interface ScreenshotAnalysisResult {
  description: string | null;
  isInvalid: boolean;
  invalidReason: string | null;
}

/**
 * Standard prompt for image analysis
 */
const IMAGE_ANALYSIS_PROMPT = `Analyze this screenshot and provide a detailed description of what you see. Focus on:
- The main content and purpose of the page
- Key visual elements, text, and layout
- Any notable features or interactive elements
- Overall design and user interface elements

If the image appears to be completely black, blank, shows only an error page, captcha, or seems to be an invalid screenshot, use the invalid-image tool instead.`;

/**
 * Analyzes a screenshot using AI to extract meaningful description
 * @param screenshotUrl URL of the screenshot to analyze
 * @returns Analysis result with description or invalid status
 */
export async function analyzeScreenshot(
  screenshotUrl: string | null
): Promise<ScreenshotAnalysisResult> {
  if (!screenshotUrl) {
    return { description: null, isInvalid: false, invalidReason: null };
  }

  try {
    const screenshotBase64 = await getImageUrlToBase64(screenshotUrl);

    const result = await generateText({
      model: GEMINI_MODELS.cheap,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: IMAGE_ANALYSIS_PROMPT,
            },
            {
              type: "image",
              image: screenshotBase64,
            },
          ],
        },
      ],
      tools: {
        "invalid-image": tool({
          description:
            "The image is black, invalid, you see nothing on it. Or it's just a captcha or invalid website image.",
          inputSchema: z.object({
            reason: z.string(),
          }),
        }),
      },
      toolChoice: "auto",
    });

    if (result.toolCalls?.[0]?.toolName === "invalid-image") {
      const invalidReason = (result.toolCalls[0] as { input: { reason: string } }).input.reason;
      return { description: null, isInvalid: true, invalidReason };
    }

    return {
      description: result.text,
      isInvalid: false,
      invalidReason: null,
    };
  } catch (error) {
    console.error("Error analyzing screenshot:", error);
    return {
      description: null,
      isInvalid: true,
      invalidReason: "Failed to analyze screenshot due to technical error",
    };
  }
}

/**
 * Analyzes a screenshot with custom prompt
 * @param screenshotUrl URL of the screenshot to analyze
 * @param customPrompt Custom prompt for the analysis
 * @returns Analysis result with description or invalid status
 */
export async function analyzeScreenshotWithPrompt(
  screenshotUrl: string | null,
  customPrompt: string
): Promise<ScreenshotAnalysisResult> {
  if (!screenshotUrl) {
    return { description: null, isInvalid: false, invalidReason: null };
  }

  try {
    const screenshotBase64 = await getImageUrlToBase64(screenshotUrl);

    const result = await generateText({
      model: GEMINI_MODELS.cheap,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: customPrompt,
            },
            {
              type: "image",
              image: screenshotBase64,
            },
          ],
        },
      ],
      tools: {
        "invalid-image": tool({
          description:
            "The image is black, invalid, you see nothing on it. Or it's just a captcha or invalid website image.",
          inputSchema: z.object({
            reason: z.string(),
          }),
        }),
      },
      toolChoice: "auto",
    });

    if (result.toolCalls?.[0]?.toolName === "invalid-image") {
      const invalidReason = (result.toolCalls[0] as { input: { reason: string } }).input.reason;
      return { description: null, isInvalid: true, invalidReason };
    }

    return {
      description: result.text,
      isInvalid: false,
      invalidReason: null,
    };
  } catch (error) {
    console.error("Error analyzing screenshot with custom prompt:", error);
    return {
      description: null,
      isInvalid: true,
      invalidReason: "Failed to analyze screenshot due to technical error",
    };
  }
}