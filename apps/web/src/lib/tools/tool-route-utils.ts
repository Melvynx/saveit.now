import { ANALYTICS } from "@/lib/analytics";
import { getPostHogClient } from "@/lib/posthog";
import { getPosthogId } from "@/lib/posthog-id";
import { z } from "zod";
import { readResponseTextWithLimit, safeToolFetch } from "./safe-fetch";

export { safeToolFetch, validatePublicToolUrl } from "./safe-fetch";

export const TOOL_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

export function resolveUrl(baseUrl: URL, value: string | undefined) {
  if (!value) return undefined;

  try {
    if (value.startsWith("http")) return value;
    if (value.startsWith("//")) return `${baseUrl.protocol}${value}`;
    return new URL(value, baseUrl.origin).href;
  } catch {
    return undefined;
  }
}

export async function fetchHtml(url: string) {
  const response = await safeToolFetch(url, {
    headers: {
      "User-Agent": TOOL_USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch the webpage");
  }

  return readResponseTextWithLimit(response);
}

export async function captureToolUsage(request: Request, toolName: string) {
  try {
    const posthog = getPostHogClient();
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const userAgent = request.headers.get("user-agent") ?? "unknown";

    posthog.capture({
      distinctId: getPosthogId(ip, userAgent),
      event: ANALYTICS.TOOL_USED,
      properties: {
        tool_name: toolName,
      },
    });

    await posthog.shutdown();
  } catch (error) {
    console.warn("Failed to capture tool usage", error);
  }
}

export function toolErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return Response.json(
      {
        error: "VALIDATION_ERROR",
        issues: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  return Response.json(
    { error: error instanceof Error ? error.message : "Tool request failed" },
    { status: 400 },
  );
}
