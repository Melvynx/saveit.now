import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { BOOKMARK_TEXT_PROCESSING_PROVIDER_OPTIONS } from "../lib/gemini_models";
import { generateStructured, generateSummary } from "./gemini";

type CapturedRequest = { url: string; body: Record<string, any> };

function geminiResponse(text: string) {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: { role: "model", parts: [{ text }] },
          finishReason: "STOP",
          index: 0,
        },
      ],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 5,
        totalTokenCount: 15,
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function stubGeminiFetch(text: string): CapturedRequest[] {
  const requests: CapturedRequest[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      requests.push({ url, body: JSON.parse(String(init?.body)) });
      return geminiResponse(text);
    }),
  );
  return requests;
}

describe("bookmark text processing thinking level", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-key");
    vi.stubEnv("APIYI_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends thinkingLevel low for generateSummary", async () => {
    const requests = stubGeminiFetch("It's a test page.");

    const text = await generateSummary("system", "page markdown");

    expect(text).toBe("It's a test page.");
    expect(requests).toHaveLength(1);
    expect(requests[0]!.url).toContain("models/gemini-3.8-flash:");
    expect(requests[0]!.body.generationConfig.thinkingConfig).toEqual({
      thinkingLevel: "low",
    });
  });

  it("sends thinkingLevel low for generateStructured", async () => {
    const requests = stubGeminiFetch(JSON.stringify({ tags: ["post", "ai"] }));

    const result = await generateStructured(
      "system",
      "page markdown",
      z.object({ tags: z.array(z.string()) }),
    );

    expect(result).toEqual({ tags: ["post", "ai"] });
    expect(requests).toHaveLength(1);
    expect(requests[0]!.url).toContain("models/gemini-3.8-flash:");
    expect(requests[0]!.body.generationConfig.thinkingConfig).toEqual({
      thinkingLevel: "low",
    });
  });
});

describe("low-thinking scope", () => {
  const read = (path: string) =>
    readFileSync(new URL(path, import.meta.url), "utf8");

  it("exposes the shared low-thinking provider options", () => {
    expect(BOOKMARK_TEXT_PROCESSING_PROVIDER_OPTIONS).toEqual({
      google: { thinkingConfig: { thinkingLevel: "low" } },
    });
  });

  // generateAndCreateTagNames is private and needs an ActionCtx, so assert
  // the TAGS_PROMPT generateObject call wires the shared constant.
  it("applies the shared options to tag generation in handlers.ts", () => {
    const source = read("./handlers.ts");
    const start = source.indexOf("async function generateAndCreateTagNames");
    const end = source.indexOf("\n}\n", start);
    const tagFunction = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(tagFunction).toContain(
      "providerOptions: BOOKMARK_TEXT_PROCESSING_PROVIDER_OPTIONS",
    );
  });

  it("does not apply low thinking to chat streaming", () => {
    expect(read("../chat/stream.ts")).not.toContain(
      "BOOKMARK_TEXT_PROCESSING_PROVIDER_OPTIONS",
    );
  });
});
