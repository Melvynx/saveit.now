import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const IMAGE_URL = "https://cdn.example.com/og.png";
const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

type GeminiReply = () => Response;

const invalidJsonReply: GeminiReply = () =>
  new Response("<html>oops", {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const serverErrorReply: GeminiReply = () =>
  new Response(
    JSON.stringify({
      error: { code: 500, message: "Internal error", status: "INTERNAL" },
    }),
    { status: 500, headers: { "content-type": "application/json" } },
  );

const validReply: GeminiReply = () =>
  new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            role: "model",
            parts: [
              {
                text: JSON.stringify({
                  isInvalid: false,
                  invalidReason: null,
                  description: "A landing page",
                }),
              },
            ],
          },
          finishReason: "STOP",
        },
      ],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10 },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

let geminiCalls = 0;

function stubFetch(geminiReply: GeminiReply) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (
        url.includes("generativelanguage.googleapis.com") &&
        url.includes(":generateContent")
      ) {
        geminiCalls++;
        return geminiReply();
      }
      if (url === IMAGE_URL) {
        return new Response(PNG_BYTES, {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

async function loadScreenshot() {
  return import("./screenshot");
}

// The AI SDK retries 5xx responses with exponential backoff; run those
// delays instantly so the retry path is still exercised.
async function settle<T>(promise: Promise<T>, expected: unknown) {
  const assertion = expect(promise).resolves.toEqual(expected);
  await vi.runAllTimersAsync();
  await assertion;
}

const URL_FALLBACK = {
  description: null,
  isInvalid: true,
  invalidReason: "Failed to analyze screenshot due to technical error",
};

const BUFFER_FALLBACK = {
  description: null,
  isInvalid: true,
  invalidReason: "Failed to analyze screenshot buffer",
};

describe("screenshot analysis is best-effort", () => {
  beforeEach(() => {
    geminiCalls = 0;
    vi.resetModules();
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-key");
    vi.stubEnv("APIYI_API_KEY", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns the Gemini description on success", async () => {
    stubFetch(validReply);
    const { analyzeScreenshot } = await loadScreenshot();

    await settle(analyzeScreenshot(IMAGE_URL), {
      description: "A landing page",
      isInvalid: false,
      invalidReason: null,
    });
    expect(geminiCalls).toBe(1);
  });

  describe.each([
    ["invalid JSON response", invalidJsonReply],
    ["HTTP 500", serverErrorReply],
  ])("when Gemini fails with %s", (_label, reply) => {
    it("analyzeScreenshot resolves to the fallback", async () => {
      stubFetch(reply);
      const { analyzeScreenshot } = await loadScreenshot();

      await settle(analyzeScreenshot(IMAGE_URL), URL_FALLBACK);
      expect(geminiCalls).toBeGreaterThan(0);
    });

    it("analyzeScreenshotWithPrompt resolves to the fallback", async () => {
      stubFetch(reply);
      const { analyzeScreenshotWithPrompt } = await loadScreenshot();

      await settle(
        analyzeScreenshotWithPrompt(IMAGE_URL, "Describe this product"),
        URL_FALLBACK,
      );
      expect(geminiCalls).toBeGreaterThan(0);
    });

    it("analyzeScreenshotBuffer resolves to the fallback", async () => {
      stubFetch(reply);
      const { analyzeScreenshotBuffer } = await loadScreenshot();

      await settle(
        analyzeScreenshotBuffer(Buffer.from(PNG_BYTES)),
        BUFFER_FALLBACK,
      );
      expect(geminiCalls).toBeGreaterThan(0);
    });
  });
});
