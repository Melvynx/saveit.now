import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const safeFetchMock = vi.hoisted(() => vi.fn());
const assertSafeRemoteUrlMock = vi.hoisted(() =>
  vi.fn(async (url: string) => url),
);
const s3SendMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/safe_fetch", () => ({
  assertSafeRemoteUrl: assertSafeRemoteUrlMock,
  safeFetch: safeFetchMock,
}));

vi.mock("@aws-sdk/client-s3", () => ({
  DeleteObjectCommand: class DeleteObjectCommand {},
  PutObjectCommand: class PutObjectCommand {
    constructor(public readonly input: unknown) {}
  },
  S3Client: class S3Client {
    send = s3SendMock;
  },
}));

import { uploadFileFromURL } from "./actions";

const handler = (
  uploadFileFromURL as typeof uploadFileFromURL & {
    _handler: (
      ctx: unknown,
      args: { url: string; key: string; contentType?: string },
    ) => Promise<string | null>;
  }
)._handler;

const originalCi = process.env.CI;

function imageResponse(): Response {
  return new Response(new Uint8Array([1, 2, 3]), {
    status: 200,
    headers: { "content-type": "image/png" },
  });
}

function cancellableResponse(options: {
  status?: number;
  contentType?: string;
  contentLength?: number;
  chunk?: Uint8Array;
}) {
  const cancel = vi.fn();
  let finishCancel: (() => void) | undefined;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      if (options.chunk) controller.enqueue(options.chunk);
    },
    cancel() {
      cancel();
      return new Promise<void>((resolve) => {
        finishCancel = resolve;
      });
    },
  });
  const headers = new Headers();
  if (options.contentType) headers.set("content-type", options.contentType);
  if (options.contentLength !== undefined) {
    headers.set("content-length", String(options.contentLength));
  }

  return {
    cancel,
    finishCancel: () => finishCancel?.(),
    response: new Response(body, { status: options.status ?? 200, headers }),
  };
}

async function expectCancellationBeforeRejection(
  tracked: ReturnType<typeof cancellableResponse>,
) {
  safeFetchMock.mockResolvedValue(tracked.response);
  const settled = vi.fn();
  const resultPromise = handler(
    {},
    { url: "https://images.example.com/rejected", key: "bookmarks/rejected" },
  );
  void resultPromise.then(settled);

  try {
    await vi.waitFor(() => expect(tracked.cancel).toHaveBeenCalledOnce());
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
  } finally {
    tracked.finishCancel();
  }

  await expect(resultPromise).resolves.toBeNull();
  expect(tracked.cancel).toHaveBeenCalledOnce();
  expect(s3SendMock).not.toHaveBeenCalled();
}

describe("uploadFileFromURL SSRF protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CI;
    process.env.AWS_ENDPOINT = "https://r2.example.com";
    process.env.AWS_ACCESS_KEY_ID = "test-key";
    process.env.AWS_SECRET_ACCESS_KEY = "test-secret";
    process.env.AWS_S3_BUCKET_NAME = "test-bucket";
    process.env.R2_URL = "https://cdn.example.com";
    s3SendMock.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (originalCi === undefined) delete process.env.CI;
    else process.env.CI = originalCi;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("delegates the complete redirect chain to DNS-pinned safeFetch", async () => {
    safeFetchMock.mockResolvedValue(imageResponse());
    const nativeFetch = vi.fn();
    vi.stubGlobal("fetch", nativeFetch);

    await expect(
      handler(
        {},
        {
          url: "https://images.example.com/og.png",
          key: "bookmarks/og",
        },
      ),
    ).resolves.toBe("https://cdn.example.com/bookmarks/og.png");

    expect(safeFetchMock).toHaveBeenCalledOnce();
    expect(safeFetchMock).toHaveBeenCalledWith(
      "https://images.example.com/og.png",
      { maxRedirects: 5 },
    );
    expect(assertSafeRemoteUrlMock).not.toHaveBeenCalled();
    expect(nativeFetch).not.toHaveBeenCalled();
    expect(s3SendMock).toHaveBeenCalledOnce();
  });

  it("awaits body cancellation for a non-OK response before rejecting it", async () => {
    await expectCancellationBeforeRejection(
      cancellableResponse({ status: 404, contentType: "image/png" }),
    );
  });

  it("awaits body cancellation for an unsupported content type before rejecting it", async () => {
    await expectCancellationBeforeRejection(
      cancellableResponse({ contentType: "text/html" }),
    );
  });

  it("awaits body cancellation for an oversized declared Content-Length before rejecting it", async () => {
    await expectCancellationBeforeRejection(
      cancellableResponse({
        contentType: "image/png",
        contentLength: 2 * 1024 * 1024 + 1,
      }),
    );
  });

  it("awaits reader cancellation when a streamed response exceeds 2 MiB", async () => {
    await expectCancellationBeforeRejection(
      cancellableResponse({
        contentType: "image/png",
        chunk: new Uint8Array(2 * 1024 * 1024 + 1),
      }),
    );
  });

  it.each([
    "This URL resolves to a private address",
    "Connection address changed after DNS validation",
  ])("blocks safeFetch rejection: %s", async (message) => {
    safeFetchMock.mockRejectedValue(new Error(message));
    const nativeFetch = vi.fn();
    vi.stubGlobal("fetch", nativeFetch);

    await expect(
      handler(
        {},
        {
          url: "https://attacker.example/image.png",
          key: "bookmarks/blocked",
        },
      ),
    ).resolves.toBeNull();

    expect(safeFetchMock).toHaveBeenCalledOnce();
    expect(assertSafeRemoteUrlMock).not.toHaveBeenCalled();
    expect(nativeFetch).not.toHaveBeenCalled();
    expect(s3SendMock).not.toHaveBeenCalled();
  });
});
