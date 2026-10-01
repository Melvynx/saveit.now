import { describe, expect, it } from "vitest";
import {
  getTweetId,
  isTweetUrl,
  isUsableRenderedHtml,
  buildRedditPostHtml,
  getRedditPost,
  resolveAssetUrl,
  toUserFacingProcessingError,
} from "./detect";

describe("reddit oEmbed fallback", () => {
  it("maps post URLs from any reddit host to a canonical oEmbed request", () => {
    for (const url of [
      "https://www.reddit.com/r/Unity3D/comments/1qn3h18/my_attempt_at_implementing/",
      "https://old.reddit.com/r/Unity3D/comments/1qn3h18/",
      "https://reddit.com/r/Unity3D/comments/1qn3h18/x/?utm_source=share",
    ]) {
      expect(getRedditPost(url)).toEqual({
        subreddit: "Unity3D",
        oembedUrl:
          "https://www.reddit.com/oembed?url=https%3A%2F%2Fwww.reddit.com%2Fr%2FUnity3D%2Fcomments%2F1qn3h18%2F",
      });
    }
  });

  it("ignores subreddits, profiles and other hosts", () => {
    expect(getRedditPost("https://www.reddit.com/r/Unity3D/")).toBeNull();
    expect(getRedditPost("https://www.reddit.com/user/JankyAnims/")).toBeNull();
    expect(getRedditPost("https://notreddit.com/r/a/comments/abc/")).toBeNull();
  });

  it("builds escaped HTML the page pipeline can read", () => {
    const html = buildRedditPostHtml({
      title: 'Tips & "tricks" <3',
      author: "JankyAnims",
      subreddit: "Unity3D",
    });
    expect(html).toContain("<title>Tips &amp; &quot;tricks&quot; &lt;3</title>");
    expect(html).toContain("Reddit post by u/JankyAnims in r/Unity3D");
  });
});

describe("resolveAssetUrl", () => {
  const page = "https://bceceboard.bihar.gov.in/news/index.php";

  it("resolves relative, root, parent and protocol-relative paths", () => {
    expect(resolveAssetUrl("images/logoTitle.jpg", page)).toBe(
      "https://bceceboard.bihar.gov.in/news/images/logoTitle.jpg",
    );
    expect(resolveAssetUrl("/images/a.png", page)).toBe(
      "https://bceceboard.bihar.gov.in/images/a.png",
    );
    expect(resolveAssetUrl("../a.png", page)).toBe(
      "https://bceceboard.bihar.gov.in/a.png",
    );
    expect(resolveAssetUrl("//cdn.example.com/a.png", page)).toBe(
      "https://cdn.example.com/a.png",
    );
    expect(resolveAssetUrl(" https://cdn.example.com/og.png ", page)).toBe(
      "https://cdn.example.com/og.png",
    );
  });

  it("drops empty and non-http values", () => {
    expect(resolveAssetUrl(undefined, page)).toBeNull();
    expect(resolveAssetUrl("  ", page)).toBeNull();
    expect(resolveAssetUrl("data:image/png;base64,AAAA", page)).toBeNull();
    expect(resolveAssetUrl("javascript:alert(1)", page)).toBeNull();
  });
});

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

  it("unwraps ConvexError JSON payloads embedded mid-message", () => {
    expect(
      toUserFacingProcessingError(
        'Limit exceeded: Uncaught ConvexError: {"code":"LIMIT_REACHED","message":"You have reached the maximum number of bookmark processing runs for this month"}\n    at assertCanRunProcessing (../../convex/billing/limits.ts:117:5)',
      ),
    ).toBe(
      "Limit exceeded: You have reached the maximum number of bookmark processing runs for this month",
    );
  });

  it("keeps typed error names that only end in Error", () => {
    expect(toUserFacingProcessingError("TypeError: fetch failed")).toBe(
      "TypeError: fetch failed",
    );
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

  it("rejects 404 and login-wall pages", () => {
    for (const title of [
      "404 Not Found",
      "Page not found · GitHub Pages",
      "404 Page not found",
      "User Profile Not Found - X | 404 Error",
      "Google Sheets: Sign-in",
      "Sign in",
      "Log in | Notion",
      "Blocked",
    ]) {
      expect(
        isUsableRenderedHtml(`<title>${title}</title><body>${body}</body>`),
      ).toBe(false);
    }
  });

  it("keeps real pages that merely mention login or 404", () => {
    for (const title of [
      "How to build a login page with Better Auth",
      "Sign in with Apple: the complete guide",
      "Brooks Ghost Max SE | Chaussures de running",
    ]) {
      expect(
        isUsableRenderedHtml(`<title>${title}</title><body>${body}</body>`),
      ).toBe(true);
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
