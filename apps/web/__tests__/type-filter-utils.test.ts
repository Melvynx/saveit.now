import { describe, expect, it } from "vitest";
import { BookmarkType } from "@/lib/bookmark-types";
import {
  extractSyntaxTokens,
  getSpecialFilterDisplayName,
  getTagTokenAtCaret,
  getTypeDisplayName,
  getTypePluralName,
  parseSyntaxToken,
} from "../src/features/app/utils/type-filter-utils";

describe("parseSyntaxToken", () => {
  it.each([
    ["#react", { kind: "tag", value: "react", raw: "#react" }],
    ["#react,", { kind: "tag", value: "react", raw: "#react," }],
    ["#my-tag_2", { kind: "tag", value: "my-tag_2", raw: "#my-tag_2" }],
    ["type:video", { kind: "type", value: BookmarkType.YOUTUBE, raw: "type:video" }],
    ["TYPE:Tweets", { kind: "type", value: BookmarkType.TWEET, raw: "TYPE:Tweets" }],
    ["type:x", { kind: "type", value: BookmarkType.TWEET, raw: "type:x" }],
    ["type:pdf", { kind: "type", value: BookmarkType.PDF, raw: "type:pdf" }],
    ["is:STARRED", { kind: "special", value: "STAR", raw: "is:STARRED" }],
    ["is:unread", { kind: "special", value: "UNREAD", raw: "is:unread" }],
    ["is:read", { kind: "special", value: "READ", raw: "is:read" }],
  ])("parses %s", (word, expected) => {
    expect(parseSyntaxToken(word)).toEqual(expected);
  });

  it.each(["#", "#,,", "type:foo", "is:archived", "type:", "is:", "react", "foo:bar", "a#tag"])(
    "returns null for %j",
    (word) => {
      expect(parseSyntaxToken(word)).toBeNull();
    },
  );
});

describe("extractSyntaxTokens", () => {
  it("leaves a half-typed trailing token alone while typing", () => {
    const result = extractSyntaxTokens("hooks #rea");
    expect(result.text).toBe("hooks #rea");
    expect(result.tokens).toEqual([]);
  });

  it("consumes the trailing token when includeTrailing is set (Enter)", () => {
    const result = extractSyntaxTokens("hooks #rea", { includeTrailing: true });
    expect(result.text).toBe("hooks ");
    expect(result.tags).toEqual(["rea"]);
  });

  it("consumes a token once it is followed by whitespace", () => {
    const result = extractSyntaxTokens("#react ");
    expect(result.tags).toEqual(["react"]);
    expect(result.text).toBe("");
  });

  it("splits every finished token by kind and collapses leftover whitespace", () => {
    const result = extractSyntaxTokens("  best type:video   hooks #react, is:starred ");
    expect(result.tags).toEqual(["react"]);
    expect(result.types).toEqual([BookmarkType.YOUTUBE]);
    expect(result.special).toEqual(["STAR"]);
    expect(result.tokens.map((token) => token.kind)).toEqual(["type", "tag", "special"]);
    expect(result.text).toBe("best hooks ");
  });

  it("keeps unknown aliases as plain text", () => {
    const result = extractSyntaxTokens("type:foo is:archived react", { includeTrailing: true });
    expect(result.tokens).toEqual([]);
    expect(result.text).toBe("type:foo is:archived react");
  });

  it("returns the input untouched when there is no token", () => {
    expect(extractSyntaxTokens("  plain   search ", { includeTrailing: true })).toEqual({
      text: "  plain   search ",
      tags: [],
      types: [],
      special: [],
      tokens: [],
    });
  });
});

describe("getTagTokenAtCaret", () => {
  it.each([
    ["#rea", 4, { prefix: "rea", start: 0, end: 4 }],
    ["hooks #", 7, { prefix: "", start: 6, end: 7 }],
    ["hooks #react more", 9, { prefix: "re", start: 6, end: 12 }],
    ["a #b #c", 7, { prefix: "c", start: 5, end: 7 }],
  ])("finds the tag token in %j at caret %i", (input, caret, expected) => {
    expect(getTagTokenAtCaret(input, caret)).toEqual(expected);
  });

  it.each([
    ["#react ", 7],
    ["plain text", 10],
    ["a#tag", 5],
    ["#react", 0],
  ])("returns null for %j at caret %i", (input, caret) => {
    expect(getTagTokenAtCaret(input, caret)).toBeNull();
  });
});

describe("display helpers", () => {
  it.each([
    [BookmarkType.YOUTUBE, "Video", "Videos"],
    [BookmarkType.PDF, "PDF", "PDFs"],
    [BookmarkType.TWEET, "Tweet", "Tweets"],
    [BookmarkType.PAGE, "Page", "Pages"],
  ])("names %s", (type, singular, plural) => {
    expect(getTypeDisplayName(type)).toBe(singular);
    expect(getTypePluralName(type)).toBe(plural);
  });

  it.each([
    ["STAR", "Starred"],
    ["unread", "Unread"],
    ["READ", "Read"],
    ["CUSTOM", "CUSTOM"],
  ])("names special filter %s", (filter, expected) => {
    expect(getSpecialFilterDisplayName(filter)).toBe(expected);
  });
});
