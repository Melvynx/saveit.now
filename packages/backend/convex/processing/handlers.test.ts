import { beforeEach, describe, expect, it, vi } from "vitest";

const safeFetchMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/safe_fetch", () => ({ safeFetch: safeFetchMock }));

import { processImageBookmark, processPdfBookmark } from "./handlers";

function oversizedStreamingResponse(options: {
  bytes: number;
  contentLength?: number;
}) {
  const cancel = vi.fn();
  let sent = false;
  const response = new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        if (!sent) {
          sent = true;
          controller.enqueue(new Uint8Array(options.bytes));
        }
      },
      cancel,
    }),
    {
      headers:
        options.contentLength === undefined
          ? undefined
          : { "content-length": String(options.contentLength) },
    },
  );

  return { response, cancel };
}

describe("handler safeFetch response cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("awaits cancellation of a non-OK PDF response and performs no downstream work", async () => {
    const cancel = vi.fn();
    let finishCancel: (() => void) | undefined;
    const response = new Response(
      new ReadableStream({
        cancel() {
          cancel();
          return new Promise<void>((resolve) => {
            finishCancel = resolve;
          });
        },
      }),
      { status: 404, statusText: "Not Found" },
    );
    safeFetchMock.mockResolvedValue(response);
    const ctx = { runAction: vi.fn(), runQuery: vi.fn() };
    const settled = vi.fn();
    const promise = processPdfBookmark(
      ctx as never,
      { _id: "bookmark-id", url: "https://example.com/missing.pdf" },
      "user-id",
    );
    void promise.then(settled, settled);

    try {
      await vi.waitFor(() => expect(cancel).toHaveBeenCalledOnce());
      await Promise.resolve();
      expect(settled).not.toHaveBeenCalled();
    } finally {
      finishCancel?.();
    }

    await expect(promise).rejects.toThrow("Failed to download PDF: Not Found");
    expect(ctx.runAction).not.toHaveBeenCalled();
    expect(ctx.runQuery).not.toHaveBeenCalled();
  });

  it("rejects a chunked image that streams beyond the image limit and performs no downstream work", async () => {
    const { response, cancel } = oversizedStreamingResponse({
      bytes: 10 * 1024 * 1024 + 1,
    });
    safeFetchMock.mockResolvedValue(response);
    const ctx = { runAction: vi.fn(), runQuery: vi.fn() };

    await expect(
      processImageBookmark(
        ctx as never,
        { _id: "bookmark-id", url: "https://example.com/image.png" },
        "user-id",
      ),
    ).rejects.toThrow("Image response is too large");

    expect(cancel).toHaveBeenCalledOnce();
    expect(ctx.runAction).not.toHaveBeenCalled();
    expect(ctx.runQuery).not.toHaveBeenCalled();
  });

  it("rejects a PDF that exceeds its misleading Content-Length and performs no downstream work", async () => {
    const { response, cancel } = oversizedStreamingResponse({
      bytes: 20 * 1024 * 1024 + 1,
      contentLength: 1,
    });
    safeFetchMock.mockResolvedValue(response);
    const ctx = { runAction: vi.fn(), runQuery: vi.fn() };

    await expect(
      processPdfBookmark(
        ctx as never,
        { _id: "bookmark-id", url: "https://example.com/file.pdf" },
        "user-id",
      ),
    ).rejects.toThrow("PDF response is too large");

    expect(cancel).toHaveBeenCalledOnce();
    expect(ctx.runAction).not.toHaveBeenCalled();
    expect(ctx.runQuery).not.toHaveBeenCalled();
  });

  it("terminates image processing when a disallowed crafted format is downloaded", async () => {
    safeFetchMock.mockResolvedValue(
      new Response(Buffer.from("icns\x00\x00\x00\x08", "binary"), {
        headers: { "content-type": "image/icns" },
      }),
    );
    const ctx = { runAction: vi.fn(), runQuery: vi.fn() };

    await expect(
      processImageBookmark(
        ctx as never,
        { _id: "bookmark-id", url: "https://example.com/image.icns" },
        "user-id",
      ),
    ).rejects.toThrow("Unsupported image format");

    expect(ctx.runAction).not.toHaveBeenCalled();
    expect(ctx.runQuery).not.toHaveBeenCalled();
  });
});
