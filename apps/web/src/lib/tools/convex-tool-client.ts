/**
 * convex-tool-client.ts
 *
 * Thin wrapper for calling public Convex tool httpActions.
 * Tools live at: `${VITE_CONVEX_SITE_URL}/api/tools/<name>`
 */

import type { ZodType } from "zod";

type ToolName =
  | "extract-content"
  | "extract-metadata"
  | "extract-favicons"
  | "og-images"
  | "youtube-metadata";

const convexSiteUrl = import.meta.env?.VITE_CONVEX_SITE_URL ?? "";

/**
 * POST { url } to a public Convex tool httpAction and validate the response.
 */
export async function callConvexTool<T>(
  tool: ToolName,
  url: string,
  schema: ZodType<T>,
): Promise<T> {
  const res = await fetch(`${convexSiteUrl}/api/tools/${tool}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    let message = `Tool request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const data = await res.json();
  return schema.parse(data);
}
