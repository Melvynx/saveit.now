import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const safeFetchMock = vi.hoisted(() => vi.fn());
const s3SendMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/safe_fetch", () => ({ safeFetch: safeFetchMock }));
vi.mock("@aws-sdk/client-s3", () => ({
  DeleteObjectCommand: class DeleteObjectCommand {},
  PutObjectCommand: class PutObjectCommand {},
  S3Client: class S3Client {
    send = s3SendMock;
  },
}));

import { uploadFromURL } from "./storage";

const originalCi = process.env.CI;

describe("uploadFromURL response cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CI;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (originalCi === undefined) delete process.env.CI;
    else process.env.CI = originalCi;
    vi.restoreAllMocks();
  });

  it("awaits cancellation of a non-OK response and does not upload it", async () => {
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
      { status: 503 },
    );
    safeFetchMock.mockResolvedValue(response);
    const settled = vi.fn();
    const promise = uploadFromURL({
      url: "https://example.com/unavailable",
      key: "bookmarks/unavailable",
    });
    void promise.then(settled);

    try {
      await vi.waitFor(() => expect(cancel).toHaveBeenCalledOnce());
      await Promise.resolve();
      expect(settled).not.toHaveBeenCalled();
    } finally {
      finishCancel?.();
    }

    await expect(promise).resolves.toBeNull();
    expect(s3SendMock).not.toHaveBeenCalled();
  });
});
