import { describe, expect, it } from "vitest";
import { getQuickSaveTargetUrl } from "../src/lib/quick-save-url";

describe("getQuickSaveTargetUrl", () => {
  it("reconstructs a complete target URL from the splat route", () => {
    expect(
      getQuickSaveTargetUrl({
        splat: "https://x.com/saveit/status/123",
        searchStr: "?lang=en",
        hash: "#details",
      }),
    ).toBe("https://x.com/saveit/status/123?lang=en#details");
  });

  it("normalizes a single slash after the protocol", () => {
    expect(
      getQuickSaveTargetUrl({ splat: "https:/example.com/article" }),
    ).toBe("https://example.com/article");
  });

  it("accepts HTTP URLs", () => {
    expect(getQuickSaveTargetUrl({ splat: "http://example.com" })).toBe(
      "http://example.com/",
    );
  });

  it.each(["missing-page", "javascript:alert(1)", "ftp://example.com/file"])(
    "rejects non-HTTP quick-save targets: %s",
    (splat) => {
      expect(getQuickSaveTargetUrl({ splat })).toBeNull();
    },
  );
});
