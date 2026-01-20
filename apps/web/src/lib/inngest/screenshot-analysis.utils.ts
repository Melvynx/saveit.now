import { generateText, tool } from "ai";
import { z } from "zod";
import { GEMINI_MODELS } from "../gemini";
import { getImageUrlToBase64 } from "./bookmark.utils";

const INVALID_IMAGE_TOOL = tool({
  description:
    "The image is black, invalid, you see nothing on it. Or it's just a captcha, Cloudflare protection, or invalid website image.",
  inputSchema: z.object({
    reason: z.string(),
  }),
});

export interface ScreenshotAnalysisResult {
  description: string | null;
  isInvalid: boolean;
  invalidReason: string | null;
}

const IMAGE_ANALYSIS_PROMPT = `Analyze this screenshot and provide a detailed description of what you see. Focus on:
- The main content and purpose of the page
- Key visual elements, text, and layout
- Any notable features or interactive elements
- Overall design and user interface elements

If the image appears to be completely black, blank, shows only an error page, captcha, Cloudflare protection, or seems to be an invalid screenshot, use the invalid-image tool instead.`;

async function analyzeImageBase64(
  base64: string,
  prompt: string,
): Promise<ScreenshotAnalysisResult> {
  const result = await generateText({
    model: GEMINI_MODELS.cheap,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image", image: base64 },
        ],
      },
    ],
    tools: { "invalid-image": INVALID_IMAGE_TOOL },
    toolChoice: "auto",
  });

  if (result.toolCalls?.[0]?.toolName === "invalid-image") {
    const invalidReason = (result.toolCalls[0] as { input: { reason: string } })
      .input.reason;
    return { description: null, isInvalid: true, invalidReason };
  }

  return { description: result.text, isInvalid: false, invalidReason: null };
}

export async function analyzeScreenshot(
  screenshotUrl: string | null,
): Promise<ScreenshotAnalysisResult> {
  if (!screenshotUrl) {
    return { description: null, isInvalid: false, invalidReason: null };
  }

  try {
    const base64 = await getImageUrlToBase64(screenshotUrl);
    return await analyzeImageBase64(base64, IMAGE_ANALYSIS_PROMPT);
  } catch (error) {
    console.error("Error analyzing screenshot:", error);
    return {
      description: null,
      isInvalid: true,
      invalidReason: "Failed to analyze screenshot due to technical error",
    };
  }
}

export async function analyzeScreenshotWithPrompt(
  screenshotUrl: string | null,
  customPrompt: string,
): Promise<ScreenshotAnalysisResult> {
  if (!screenshotUrl) {
    return { description: null, isInvalid: false, invalidReason: null };
  }

  try {
    const base64 = await getImageUrlToBase64(screenshotUrl);
    return await analyzeImageBase64(base64, customPrompt);
  } catch (error) {
    console.error("Error analyzing screenshot with custom prompt:", error);
    return {
      description: null,
      isInvalid: true,
      invalidReason: "Failed to analyze screenshot due to technical error",
    };
  }
}

export async function analyzeScreenshotBuffer(
  buffer: Buffer,
): Promise<ScreenshotAnalysisResult> {
  try {
    const base64 = buffer.toString("base64");
    return await analyzeImageBase64(base64, IMAGE_ANALYSIS_PROMPT);
  } catch (error) {
    console.error("Error analyzing screenshot buffer:", error);
    return {
      description: null,
      isInvalid: true,
      invalidReason: "Failed to analyze screenshot buffer",
    };
  }
}
