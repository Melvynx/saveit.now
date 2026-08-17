"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { generateObject } from "ai";
import { z } from "zod";
import { IMAGE_ANALYSIS_PROMPT } from "./gemini";
import { withGeminiFallback } from "../lib/gemini_provider";
import { safeFetch } from "../lib/safe_fetch";

const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
const SCREENSHOT_FETCH_TIMEOUT_MS = 10_000;

export interface ScreenshotAnalysisResult {
  description: string | null;
  isInvalid: boolean;
  invalidReason: string | null;
}

const SCREENSHOT_ANALYSIS_SCHEMA = z.object({
  isInvalid: z
    .boolean()
    .describe(
      'true if the image is black/blank, a browser error page (e.g. "This page couldn\'t load"), a captcha, a Cloudflare/bot protection page, or otherwise not a real screenshot of the website content.',
    ),
  invalidReason: z
    .string()
    .nullable()
    .describe("If isInvalid is true, a short reason. Otherwise null."),
  description: z
    .string()
    .nullable()
    .describe(
      "If isInvalid is false, the detailed description of the screenshot. Otherwise null.",
    ),
});

function isImageContentType(contentType: string | null): boolean {
  return (
    contentType?.split(";", 1)[0]?.trim().toLowerCase().startsWith("image/") ??
    false
  );
}

export async function fetchScreenshotImage(url: string): Promise<Buffer> {
  const response = await safeFetch(url, {
    signal: AbortSignal.timeout(SCREENSHOT_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Image fetch failed (${response.status})`);
  }

  if (!isImageContentType(response.headers.get("content-type"))) {
    await response.body?.cancel();
    throw new Error("Remote resource is not an image");
  }

  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_SCREENSHOT_BYTES) {
    await response.body?.cancel();
    throw new Error("Remote image is too large");
  }

  if (!response.body) {
    throw new Error("Remote image has no body");
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_SCREENSHOT_BYTES) {
        await reader.cancel();
        throw new Error("Remote image is too large");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks);
}

/**
 * analyzeScreenshot — analyze an image URL via Gemini vision with structured
 * output (description + isInvalid flag).
 */
export async function analyzeScreenshot(
  url: string | null,
): Promise<ScreenshotAnalysisResult> {
  if (!url) {
    return { description: null, isInvalid: false, invalidReason: null };
  }

  try {
    const base64 = (await fetchScreenshotImage(url)).toString("base64");
    return analyzeImageBase64(base64, IMAGE_ANALYSIS_PROMPT);
  } catch {
    return {
      description: null,
      isInvalid: true,
      invalidReason: "Failed to analyze screenshot due to technical error",
    };
  }
}

export async function analyzeScreenshotWithPrompt(
  url: string | null,
  customPrompt: string,
): Promise<ScreenshotAnalysisResult> {
  if (!url) {
    return { description: null, isInvalid: false, invalidReason: null };
  }

  try {
    const base64 = (await fetchScreenshotImage(url)).toString("base64");
    return analyzeImageBase64(base64, customPrompt);
  } catch {
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
    return analyzeImageBase64(base64, IMAGE_ANALYSIS_PROMPT);
  } catch {
    return {
      description: null,
      isInvalid: true,
      invalidReason: "Failed to analyze screenshot buffer",
    };
  }
}

async function analyzeImageBase64(
  base64: string,
  prompt: string,
): Promise<ScreenshotAnalysisResult> {
  const result = await withGeminiFallback((google) =>
    generateObject({
      model: google(process.env.GEMINI_CHEAP_MODEL ?? "gemini-3.1-flash-lite"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image", image: base64 },
          ],
        },
      ],
      schema: SCREENSHOT_ANALYSIS_SCHEMA,
    }),
  );

  const analysis = result.object;
  if (analysis.isInvalid) {
    return {
      description: null,
      isInvalid: true,
      invalidReason: analysis.invalidReason ?? "Invalid screenshot",
    };
  }

  return {
    description: analysis.description,
    isInvalid: false,
    invalidReason: null,
  };
}

/**
 * isScreenshotUrlValid — HEAD request to verify image URL is accessible and ≥ 1000 bytes.
 */
export async function isScreenshotUrlValid(url: string): Promise<boolean> {
  try {
    const response = await safeFetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return false;
    if (!isImageContentType(response.headers.get("content-type"))) return false;

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) < 1000) return false;
    if (contentLength && parseInt(contentLength, 10) > MAX_SCREENSHOT_BYTES) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * captureAndUploadScreenshot — Convex internalAction.
 * Remote navigation is disabled because Cloudflare Browser Rendering resolves
 * URLs independently, so this service cannot pin validated addresses or
 * enforce redirect destinations. Fail closed until the provider offers an
 * enforceable SSRF boundary.
 */
export const captureAndUploadScreenshot = internalAction({
  args: {
    url: v.string(),
    userId: v.string(),
    bookmarkId: v.id("bookmarks"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (): Promise<null> => null,
});

/**
 * captureAndUploadPDFScreenshot — Convex internalAction.
 * Remote PDF navigation is disabled for the same unpinnable SSRF boundary.
 */
export const captureAndUploadPDFScreenshot = internalAction({
  args: {
    url: v.string(),
    userId: v.string(),
    bookmarkId: v.id("bookmarks"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (): Promise<null> => null,
});
