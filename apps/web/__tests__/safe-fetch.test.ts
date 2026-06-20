import { lookup } from "node:dns/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isBlockedIpAddress,
  safeToolFetch,
  validatePublicToolUrl,
} from "../src/lib/tools/safe-fetch";

vi.mock("node:dns/promises", () => {
  const lookup = vi.fn();
  return {
    default: { lookup },
    lookup,
  };
});

const lookupMock = vi.mocked(lookup);

describe("safe tool fetch SSRF guard", () => {
  beforeEach(() => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("ok", { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("rejects loopback canary URLs before fetch", async () => {
    await expect(
      safeToolFetch("http://127.0.0.1:59079/metadata"),
    ).rejects.toThrow(/private|local/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects localhost even with a trailing dot", async () => {
    await expect(validatePublicToolUrl("http://localhost./metadata")).rejects.toThrow(
      /local/i,
    );
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("rejects decimal, octal, and hex loopback address forms", async () => {
    await expect(validatePublicToolUrl("http://2130706433/")).rejects.toThrow(
      /private|local/i,
    );
    await expect(validatePublicToolUrl("http://0177.0.0.1/")).rejects.toThrow(
      /private|local/i,
    );
    await expect(validatePublicToolUrl("http://0x7f.0.0.1/")).rejects.toThrow(
      /private|local/i,
    );
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("rejects IPv6 local, private, link-local, and IPv4-mapped private ranges", () => {
    expect(isBlockedIpAddress("::1")).toBe(true);
    expect(isBlockedIpAddress("fc00::1")).toBe(true);
    expect(isBlockedIpAddress("fe80::1")).toBe(true);
    expect(isBlockedIpAddress("::ffff:127.0.0.1")).toBe(true);
  });

  it("rejects hostnames that resolve to private addresses", async () => {
    lookupMock.mockResolvedValueOnce([{ address: "169.254.169.254", family: 4 }]);

    await expect(validatePublicToolUrl("https://metadata.example/")).rejects.toThrow(
      /private|local/i,
    );
  });

  it("allows normal public URLs with mocked DNS and fetch", async () => {
    const response = await safeToolFetch("https://example.com/page");

    expect(response.status).toBe(200);
    expect(lookupMock).toHaveBeenCalledWith("example.com", {
      all: true,
      verbatim: true,
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://example.com/page",
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it("revalidates and blocks unsafe redirect targets", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1:59079/metadata" },
        }),
      ),
    );

    await expect(safeToolFetch("https://example.com/redirect")).rejects.toThrow(
      /private|local/i,
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
