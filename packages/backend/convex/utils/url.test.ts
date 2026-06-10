import { describe, expect, test } from "vitest";
import { cleanUrl, stripTrailingPunctuation } from "./url";

describe("stripTrailingPunctuation", () => {
  test("strips a trailing colon (pasted from prose)", () => {
    expect(
      stripTrailingPunctuation(
        "https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex:",
      ),
    ).toBe(
      "https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex",
    );
  });

  test("strips trailing dots, commas and quotes", () => {
    expect(stripTrailingPunctuation("https://example.com/page.")).toBe(
      "https://example.com/page",
    );
    expect(stripTrailingPunctuation('https://example.com/page,"')).toBe(
      "https://example.com/page",
    );
  });

  test("strips an unbalanced closing paren but keeps balanced ones", () => {
    expect(stripTrailingPunctuation("https://example.com/page)")).toBe(
      "https://example.com/page",
    );
    expect(
      stripTrailingPunctuation(
        "https://en.wikipedia.org/wiki/Tree_(graph_theory)",
      ),
    ).toBe("https://en.wikipedia.org/wiki/Tree_(graph_theory)");
  });

  test("strips mixed trailing punctuation like ').'", () => {
    expect(stripTrailingPunctuation("https://example.com/page).")).toBe(
      "https://example.com/page",
    );
  });

  test("leaves clean URLs untouched", () => {
    expect(stripTrailingPunctuation("https://example.com/page?a=1")).toBe(
      "https://example.com/page?a=1",
    );
  });
});

describe("cleanUrl", () => {
  test("strips trailing punctuation before removing tracking params", () => {
    expect(cleanUrl("https://example.com/page?utm_source=x:")).toBe(
      "https://example.com/page",
    );
  });

  test("keeps regular query params", () => {
    expect(cleanUrl("https://example.com/search?q=convex")).toBe(
      "https://example.com/search?q=convex",
    );
  });
});
