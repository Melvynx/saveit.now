import { beforeEach, describe, expect, it, vi } from "vitest";
import { safeFetch } from "../lib/safe_fetch";
import { safeToolFetch } from "./node_fetch";

vi.mock("../lib/safe_fetch", () => ({
  safeFetch: vi.fn(),
}));

const mockedSafeFetch = vi.mocked(safeFetch);
const handler = (
  safeToolFetch as typeof safeToolFetch & {
    _handler: (
      ctx: unknown,
      args: {
        url: string;
        maxBytes: number;
        readBody: boolean;
      },
    ) => Promise<unknown>;
  }
)._handler;

function chunkedResponse(contentLength?: string) {
  const chunks = ["1234", "5678", "9012", "3456"].map((chunk) =>
    new TextEncoder().encode(chunk),
  );
  let pulls = 0;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[pulls++];
      if (chunk) controller.enqueue(chunk);
      else controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });
  const headers = new Headers({ "content-type": "text/plain" });
  if (contentLength) headers.set("content-length", contentLength);

  return {
    response: new Response(body, { headers }),
    wasCancelled: () => cancelled,
    pullCount: () => pulls,
    totalChunks: chunks.length,
  };
}

describe("safeToolFetch response size limit", () => {
  beforeEach(() => {
    mockedSafeFetch.mockReset();
  });

  it.each([
    ["missing", undefined],
    ["misleading", "1"],
  ])(
    "cancels and rejects an oversized chunked response with %s Content-Length before reading the entire body",
    async (_description, contentLength) => {
      const stream = chunkedResponse(contentLength);
      mockedSafeFetch.mockResolvedValue(stream.response);

      await expect(
        handler(
          {},
          {
            url: "https://example.com/chunked",
            maxBytes: 5,
            readBody: true,
          },
        ),
      ).rejects.toThrow("Response is too large");

      expect(stream.wasCancelled()).toBe(true);
      expect(stream.response.body?.locked).toBe(false);
      expect(stream.pullCount()).toBeLessThan(stream.totalChunks);
    },
  );
});
