import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

const generateObjectMock = vi.hoisted(() => vi.fn());
const undiciFetchMock = vi.hoisted(() => vi.fn());
const dnsLookupMock = vi.hoisted(() => vi.fn());

vi.mock("node:dns/promises", () => ({
  lookup: dnsLookupMock,
}));

vi.mock("ai", () => ({
  generateObject: generateObjectMock,
}));

vi.mock("../lib/gemini_provider", () => ({
  withGeminiFallback: async (
    callback: (google: (model: string) => string) => Promise<unknown>,
  ) => callback((model) => model),
}));

vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()),
  fetch: undiciFetchMock,
}));

import {
  analyzeScreenshot,
  captureAndUploadPDFScreenshot,
  captureAndUploadScreenshot,
} from "./screenshot";

type ScreenshotHandler = (
  ctx: { runAction: ReturnType<typeof vi.fn> },
  args: { url: string; userId: string; bookmarkId: string },
) => Promise<string | null>;

const websiteScreenshotHandler = (
  captureAndUploadScreenshot as typeof captureAndUploadScreenshot & {
    _handler: ScreenshotHandler;
  }
)._handler;
const pdfScreenshotHandler = (
  captureAndUploadPDFScreenshot as typeof captureAndUploadPDFScreenshot & {
    _handler: ScreenshotHandler;
  }
)._handler;

const validAnalysis = {
  object: {
    description: "A legitimate public image",
    isInvalid: false,
    invalidReason: null,
  },
};

describe("analyzeScreenshot SSRF protection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    generateObjectMock.mockReset();
    generateObjectMock.mockResolvedValue(validAnalysis);
    undiciFetchMock.mockReset();
  });

  test.each([
    "http://127.0.0.1/admin.png",
    "http://169.254.169.254/latest/meta-data/iam.png",
    "http://10.0.0.8/internal.png",
  ])("rejects private image URL without fetching it: %s", async (url) => {
    undiciFetchMock.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/png" },
      }),
    );

    const result = await analyzeScreenshot(url);

    expect(result).toMatchObject({
      description: null,
      isInvalid: true,
    });
    expect(undiciFetchMock).not.toHaveBeenCalled();
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  test("rejects a public image URL that redirects to a private address", async () => {
    undiciFetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/internal.png" },
      }),
    );

    const result = await analyzeScreenshot("https://1.1.1.1/public.png");

    expect(result).toMatchObject({
      description: null,
      isInvalid: true,
    });
    expect(undiciFetchMock).toHaveBeenCalledTimes(1);
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  test("keeps analysis working for a legitimate public image", async () => {
    undiciFetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/png" },
      }),
    );

    await expect(
      analyzeScreenshot("https://1.1.1.1/public.png"),
    ).resolves.toEqual({
      description: "A legitimate public image",
      isInvalid: false,
      invalidReason: null,
    });
    expect(generateObjectMock).toHaveBeenCalledTimes(1);
  });

  test("rejects a non-image response before analysis", async () => {
    undiciFetchMock.mockResolvedValueOnce(
      new Response("not an image", {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );

    const result = await analyzeScreenshot("https://1.1.1.1/not-image");

    expect(result.isInvalid).toBe(true);
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  test("stops streaming an image after the response exceeds the size limit", async () => {
    const oversizedChunk = new Uint8Array(10 * 1024 * 1024 + 1);
    undiciFetchMock.mockResolvedValueOnce(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(oversizedChunk);
            controller.close();
          },
        }),
        { headers: { "content-type": "image/png" } },
      ),
    );

    const result = await analyzeScreenshot("https://1.1.1.1/huge.png");

    expect(result.isInvalid).toBe(true);
    expect(generateObjectMock).not.toHaveBeenCalled();
  });
});

describe.each([
  ["website", websiteScreenshotHandler],
  ["PDF", pdfScreenshotHandler],
] as const)(
  "Cloudflare %s screenshot fail-closed behavior",
  (_kind, handler) => {
    const originalAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const originalApiToken = process.env.CLOUDFLARE_API_TOKEN;

    beforeEach(() => {
      vi.restoreAllMocks();
      dnsLookupMock.mockReset();
      undiciFetchMock.mockReset();
      process.env.CLOUDFLARE_ACCOUNT_ID = "account-id";
      process.env.CLOUDFLARE_API_TOKEN = "api-token";
    });

    afterAll(() => {
      if (originalAccountId === undefined) {
        delete process.env.CLOUDFLARE_ACCOUNT_ID;
      } else {
        process.env.CLOUDFLARE_ACCOUNT_ID = originalAccountId;
      }
      if (originalApiToken === undefined) {
        delete process.env.CLOUDFLARE_API_TOKEN;
      } else {
        process.env.CLOUDFLARE_API_TOKEN = originalApiToken;
      }
    });

    function context() {
      return {
        runAction: vi.fn().mockResolvedValue("https://cdn.example/shot.png"),
      };
    }

    test.each([
      ["public", "https://public.example/article"],
      ["private", "http://169.254.169.254/latest/meta-data"],
      ["DNS rebinding", "https://rebind.example/article"],
    ])(
      "disables %s remote navigation without Browser Rendering or upload",
      async (_urlKind, url) => {
        dnsLookupMock
          .mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
          .mockResolvedValueOnce([{ address: "127.0.0.1", family: 4 }]);
        undiciFetchMock.mockResolvedValue(new Response(null, { status: 200 }));
        const providerFetch = vi
          .spyOn(globalThis, "fetch")
          .mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));
        const ctx = context();

        await expect(
          handler(ctx, {
            url,
            userId: "user-id",
            bookmarkId: "bookmark-id",
          }),
        ).resolves.toBeNull();

        expect(dnsLookupMock).not.toHaveBeenCalled();
        expect(undiciFetchMock).not.toHaveBeenCalled();
        expect(providerFetch).not.toHaveBeenCalled();
        expect(ctx.runAction).not.toHaveBeenCalled();
      },
    );
  },
);
