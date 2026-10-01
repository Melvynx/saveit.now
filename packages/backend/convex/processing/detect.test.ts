import { describe, expect, it } from "vitest";
import {
  getTweetId,
  isTweetUrl,
  isUsableRenderedHtml,
  toUserFacingProcessingError,
} from "./detect";

describe("toUserFacingProcessingError", () => {
  it("strips error prefixes and stack frames from workflow failures", () => {
    expect(
      toUserFacingProcessingError(
        "Error: Uncaught Error: Invalid tweet id: home\n    at handler (../../convex/processing/steps.ts:94:31)\n\n    at run (../../../../node_modules/x.js:1:1)",
      ),
    ).toBe("Invalid tweet id: home");
    expect(
      toUserFacingProcessingError(
        "Uncaught ConvexError: Failed to fetch URL content (403)",
      ),
    ).toBe("Failed to fetch URL content (403)");
  });

  it("keeps already clean messages", () => {
    expect(
      toUserFacingProcessingError(
        "Limit exceeded: You have reached the maximum number of bookmark processing runs for this month",
      ),
    ).toBe(
      "Limit exceeded: You have reached the maximum number of bookmark processing runs for this month",
    );
    expect(toUserFacingProcessingError("Processing was canceled")).toBe(
      "Processing was canceled",
    );
  });

  it("falls back to a generic sentence when nothing readable is left", () => {
    expect(toUserFacingProcessingError(undefined)).toBe(
      "We couldn't process this link.",
    );
    expect(toUserFacingProcessingError("")).toBe(
      "We couldn't process this link.",
    );
    expect(toUserFacingProcessingError("Error: ")).toBe(
      "We couldn't process this link.",
    );
  });
});

describe("tweet URL detection", () => {
  it("extracts the status id from post URLs", () => {
    expect(getTweetId("https://x.com/naval/status/1002103360646823936")).toBe(
      "1002103360646823936",
    );
    expect(
      getTweetId("https://twitter.com/naval/status/1002103360646823936?s=20"),
    ).toBe("1002103360646823936");
    expect(
      getTweetId("https://mobile.twitter.com/naval/statuses/1002103360646823936"),
    ).toBe("1002103360646823936");
    expect(getTweetId("https://x.com/i/status/2104639390266036251")).toBe(
      "2104639390266036251",
    );
  });

  it("ignores media and analytics suffixes after the status id", () => {
    expect(
      getTweetId("https://x.com/hridoyreh/status/2080971646853361925/photo/1"),
    ).toBe("2080971646853361925");
    expect(
      getTweetId("https://x.com/hridoyreh/status/2080971646853361925/video/1"),
    ).toBe("2080971646853361925");
  });

  it("parses statuses saved without a resolvable handle", () => {
    expect(getTweetId("https://x.com/undefined/status/2057750612943491187")).toBe(
      "2057750612943491187",
    );
  });

  it("treats profiles, home and other X pages as regular pages", () => {
    for (const url of [
      "https://x.com/home",
      "https://x.com/supermemory",
      "https://x.com/0xjaniak",
      "https://twitter.com/search?q=convex",
      "https://x.com/naval/status/",
      "https://notx.com/naval/status/1002103360646823936",
      "https://example.com/?u=https://x.com/a/status/1002103360646823936",
      "not a url",
    ]) {
      expect(isTweetUrl(url)).toBe(false);
    }
  });
});

describe("isUsableRenderedHtml", () => {
  const body = `<p>${"Real article content. ".repeat(20)}</p>`;

  it("accepts rendered pages with real text", () => {
    expect(
      isUsableRenderedHtml(`<html><head><title>Medium</title></head><body>${body}</body></html>`),
    ).toBe(true);
  });

  it("rejects bot-protection interstitials even when they contain text", () => {
    for (const title of [
      "Just a moment...",
      "Making sure you're not a bot!",
      "Attention Required! | Cloudflare",
      "Access Denied",
    ]) {
      expect(
        isUsableRenderedHtml(`<title>${title}</title><body>${body}</body>`),
      ).toBe(false);
    }
  });

  it("rejects empty shells whose only content is scripts", () => {
    expect(
      isUsableRenderedHtml(
        `<title>App</title><body><div id="root"></div><script>${"x".repeat(5000)}</script></body>`,
      ),
    ).toBe(false);
  });
});
