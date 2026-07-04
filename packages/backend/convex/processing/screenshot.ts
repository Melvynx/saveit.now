"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { generateObject } from "ai";
import { z } from "zod";
import { IMAGE_ANALYSIS_PROMPT } from "./gemini";
import { withGeminiFallback } from "../lib/gemini_provider";

export interface ScreenshotAnalysisResult {
  description: string | null;
  isInvalid: boolean;
  invalidReason: string | null;
}

const SCREENSHOT_ANALYSIS_SCHEMA = z.object({
  isInvalid: z
    .boolean()
    .describe(
      "true if the image is black/blank, a browser error page (e.g. \"This page couldn't load\"), a captcha, a Cloudflare/bot protection page, or otherwise not a real screenshot of the website content.",
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

async function callCloudflareScreenshot(url: string): Promise<Buffer> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error(
      "CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN env vars not set",
    );
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/screenshot`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        gotoOptions: {
          // "networkidle0" breaks on sites that keep connections open
          // (e.g. anthropic.com): the navigation never settles and the API
          // returns a screenshot of Chromium's "This page couldn't load"
          // error page with HTTP 200.
          waitUntil: "load",
          timeout: 30000,
        },
        viewport: { width: 1920, height: 1080 },
        screenshotOptions: {
          fullPage: false,
          type: "png",
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Screenshot failed (${response.status}): ${errorText || response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeoutId);
  }
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
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
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
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return false;

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) < 1000) return false;

    return true;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * captureAndUploadScreenshot — Convex internalAction.
 * Calls Cloudflare Browser Rendering API, uploads PNG to R2.
 */
export const captureAndUploadScreenshot = internalAction({
  args: {
    url: v.string(),
    userId: v.string(),
    bookmarkId: v.id("bookmarks"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { url, userId, bookmarkId }): Promise<string | null> => {
    try {
      const buffer = await callCloudflareScreenshot(url);
      // Timestamped key: re-captures must not reuse the previous key, the
      // CDN keeps serving the stale cached image for the old URL.
      const key = `users/${userId}/bookmarks/${bookmarkId}/screenshot-${Date.now()}.png`;
      const cdnUrl: string = await ctx.runAction(
        internal.files.actions.uploadBuffer,
        {
          buffer: buffer.buffer as ArrayBuffer,
          key,
          contentType: "image/png",
        },
      );
      return cdnUrl;
    } catch {
      return null;
    }
  },
});

/**
 * captureAndUploadPDFScreenshot — Convex internalAction.
 * Appends PDF hash params, captures screenshot, uploads to R2.
 */
export const captureAndUploadPDFScreenshot = internalAction({
  args: {
    url: v.string(),
    userId: v.string(),
    bookmarkId: v.id("bookmarks"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { url, userId, bookmarkId }): Promise<string | null> => {
    try {
      const pdfUrl = `${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
      const buffer = await callCloudflareScreenshot(pdfUrl);
      const key = `users/${userId}/bookmarks/${bookmarkId}/pdf-screenshot-${Date.now()}.png`;
      const cdnUrl: string = await ctx.runAction(
        internal.files.actions.uploadBuffer,
        {
          buffer: buffer.buffer as ArrayBuffer,
          key,
          contentType: "image/png",
        },
      );
      return cdnUrl;
    } catch {
      return null;
    }
  },
});
