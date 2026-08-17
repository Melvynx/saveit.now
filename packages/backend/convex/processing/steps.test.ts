import { beforeEach, describe, expect, it, vi } from "vitest";

const safeFetchMock = vi.hoisted(() => vi.fn());
const isProductPageMock = vi.hoisted(() => vi.fn());
const processPageBookmarkMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/safe_fetch", () => ({ safeFetch: safeFetchMock }));
vi.mock("./handlers", () => ({
  isProductPage: isProductPageMock,
  processArticleBookmark: vi.fn(),
  processImageBookmark: vi.fn(),
  processPageBookmark: processPageBookmarkMock,
  processPdfBookmark: vi.fn(),
  processProductBookmark: vi.fn(),
  processTweetBookmark: vi.fn(),
  processYouTubeBookmark: vi.fn(),
}));

import { analyzeUrl, processByRoute } from "./steps";

const analyzeUrlHandler = (
  analyzeUrl as typeof analyzeUrl & {
    _handler: (ctx: unknown, args: { url: string }) => Promise<string>;
  }
)._handler;
const processByRouteHandler = (
  processByRoute as typeof processByRoute & {
    _handler: (
      ctx: unknown,
      args: { bookmarkId: string; userId: string; route: "PAGE" },
    ) => Promise<null>;
  }
)._handler;

function responseWithDelayedCancellation(options: {
  status?: number;
  contentType?: string;
}) {
  const cancel = vi.fn();
  let finishCancel: (() => void) | undefined;
  const body = new ReadableStream<Uint8Array>({
    cancel() {
      cancel();
      return new Promise<void>((resolve) => {
        finishCancel = resolve;
      });
    },
  });
  return {
    response: new Response(body, {
      status: options.status ?? 200,
      headers: options.contentType
        ? { "content-type": options.contentType }
        : undefined,
    }),
    cancel,
    finishCancel: () => finishCancel?.(),
  };
}

function oversizedHtmlResponse(options: { contentLength?: number } = {}) {
  const cancel = vi.fn();
  let sent = false;
  const response = new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        if (!sent) {
          sent = true;
          controller.enqueue(new Uint8Array(5 * 1024 * 1024 + 1));
        }
      },
      cancel,
    }),
    {
      headers: {
        "content-type": "text/html",
        ...(options.contentLength === undefined
          ? {}
          : { "content-length": String(options.contentLength) }),
      },
    },
  );

  return { response, cancel };
}

async function expectAwaitedCancellation<T>(
  tracked: ReturnType<typeof responseWithDelayedCancellation>,
  operation: () => Promise<T>,
  expected: T,
) {
  safeFetchMock.mockResolvedValue(tracked.response);
  const settled = vi.fn();
  const promise = operation();
  void promise.then(settled, settled);

  try {
    await vi.waitFor(() => expect(tracked.cancel).toHaveBeenCalledOnce());
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
  } finally {
    tracked.finishCancel();
  }

  await expect(promise).resolves.toEqual(expected);
}

describe("processing safeFetch response cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancels a non-OK analyze response before returning FETCH_FAILED", async () => {
    const tracked = responseWithDelayedCancellation({ status: 502 });

    await expectAwaitedCancellation(
      tracked,
      () => analyzeUrlHandler({}, { url: "https://example.com/failure" }),
      "FETCH_FAILED",
    );

    expect(isProductPageMock).not.toHaveBeenCalled();
  });

  it.each([
    ["IMAGE", "image/png"],
    ["PDF", "application/pdf"],
    ["PAGE", "video/mp4"],
  ] as const)(
    "cancels an unconsumed %s classification response before returning",
    async (route, contentType) => {
      const tracked = responseWithDelayedCancellation({ contentType });

      await expectAwaitedCancellation(
        tracked,
        () => analyzeUrlHandler({}, { url: "https://example.com/resource" }),
        route,
      );

      expect(isProductPageMock).not.toHaveBeenCalled();
    },
  );

  it("cancels a non-OK HTML response before throwing and performs no downstream work", async () => {
    const tracked = responseWithDelayedCancellation({ status: 404 });
    safeFetchMock.mockResolvedValue(tracked.response);
    const ctx = {
      runQuery: vi.fn().mockResolvedValue({
        _id: "bookmark-id",
        url: "https://example.com/missing",
      }),
      runMutation: vi.fn(),
    };
    const settled = vi.fn();
    const promise = processByRouteHandler(ctx, {
      bookmarkId: "bookmark-id",
      userId: "user-id",
      route: "PAGE",
    });
    void promise.then(settled, settled);

    try {
      await vi.waitFor(() => expect(tracked.cancel).toHaveBeenCalledOnce());
      await Promise.resolve();
      expect(settled).not.toHaveBeenCalled();
    } finally {
      tracked.finishCancel();
    }

    await expect(promise).rejects.toThrow("Failed to fetch URL content (404)");
    expect(processPageBookmarkMock).not.toHaveBeenCalled();
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });

  it("classifies a chunked HTML response that streams beyond the limit as FETCH_FAILED", async () => {
    const { response, cancel } = oversizedHtmlResponse();
    safeFetchMock.mockResolvedValue(response);

    await expect(
      analyzeUrlHandler({}, { url: "https://example.com/oversized" }),
    ).resolves.toBe("FETCH_FAILED");

    expect(cancel).toHaveBeenCalledOnce();
    expect(isProductPageMock).not.toHaveBeenCalled();
  });

  it("rejects HTML that exceeds its misleading Content-Length before downstream processing", async () => {
    const { response, cancel } = oversizedHtmlResponse({ contentLength: 1 });
    safeFetchMock.mockResolvedValue(response);
    const ctx = {
      runQuery: vi.fn().mockResolvedValue({
        _id: "bookmark-id",
        url: "https://example.com/oversized",
      }),
      runMutation: vi.fn(),
    };

    await expect(
      processByRouteHandler(ctx, {
        bookmarkId: "bookmark-id",
        userId: "user-id",
        route: "PAGE",
      }),
    ).rejects.toThrow("HTML response is too large");

    expect(cancel).toHaveBeenCalledOnce();
    expect(processPageBookmarkMock).not.toHaveBeenCalled();
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });
});
