import { describe, it, expect } from "vitest";
import { BookmarkType } from "@workspace/database";
import {
  parseAtMention,
  parseHashMention,
  parseSpecialMention,
  parseMention,
  removeAtMention,
  removeMention,
  getTypeDisplayName,
  getTypeColor,
  getSpecialFilterDisplayName,
  getSpecialFilterColor,
  type ParsedMention,
} from "../app/app/utils/type-filter-utils";

describe("type-filter-utils", () => {
  describe("parseAtMention", () => {
    it("should parse @ mention at cursor position", () => {
      const result = parseAtMention("Search @PAGE", 12);
      expect(result).toEqual({
        mention: "PAGE",
        startIndex: 7,
        endIndex: 12,
        type: "type",
        symbol: "@",
      });
    });

    it("should parse partial @ mention", () => {
      const result = parseAtMention("Search @BL", 10);
      expect(result).toEqual({
        mention: "BL",
        startIndex: 7,
        endIndex: 10,
        type: "type",
        symbol: "@",
      });
    });

    it("should return null if no @ found", () => {
      const result = parseAtMention("Search PAGE", 11);
      expect(result).toBeNull();
    });

    it("should return null if space after @", () => {
      const result = parseAtMention("Search @ PAGE", 13);
      expect(result).toBeNull();
    });

    it("should handle @ at beginning", () => {
      const result = parseAtMention("@PAGE", 5);
      expect(result).toEqual({
        mention: "PAGE",
        startIndex: 0,
        endIndex: 5,
        type: "type",
        symbol: "@",
      });
    });

    it("should handle empty mention", () => {
      const result = parseAtMention("Search @", 8);
      expect(result).toEqual({
        mention: "",
        startIndex: 7,
        endIndex: 8,
        type: "type",
        symbol: "@",
      });
    });

    it("should use last @ if multiple", () => {
      const result = parseAtMention("@PAGE @ARTICLE", 14);
      expect(result).toEqual({
        mention: "ARTICLE",
        startIndex: 6,
        endIndex: 14,
        type: "type",
        symbol: "@",
      });
    });

    it("should handle cursor in middle of word", () => {
      const result = parseAtMention("Search @PAGE more", 10);
      expect(result).toEqual({
        mention: "PA",
        startIndex: 7,
        endIndex: 10,
        type: "type",
        symbol: "@",
      });
    });

    it("should handle cursor position 0", () => {
      const result = parseAtMention("@PAGE", 0);
      expect(result).toBeNull();
    });
  });

  describe("parseHashMention", () => {
    it("should parse # mention at cursor position", () => {
      const result = parseHashMention("Search #programming", 19);
      expect(result).toEqual({
        mention: "programming",
        startIndex: 7,
        endIndex: 19,
        type: "tag",
        symbol: "#",
      });
    });

    it("should parse partial # mention", () => {
      const result = parseHashMention("Search #prog", 12);
      expect(result).toEqual({
        mention: "prog",
        startIndex: 7,
        endIndex: 12,
        type: "tag",
        symbol: "#",
      });
    });

    it("should return null if no # found", () => {
      const result = parseHashMention("Search programming", 18);
      expect(result).toBeNull();
    });

    it("should return null if space after #", () => {
      const result = parseHashMention("Search # programming", 20);
      expect(result).toBeNull();
    });

    it("should handle # at beginning", () => {
      const result = parseHashMention("#programming", 12);
      expect(result).toEqual({
        mention: "programming",
        startIndex: 0,
        endIndex: 12,
        type: "tag",
        symbol: "#",
      });
    });

    it("should handle empty mention", () => {
      const result = parseHashMention("Search #", 8);
      expect(result).toEqual({
        mention: "",
        startIndex: 7,
        endIndex: 8,
        type: "tag",
        symbol: "#",
      });
    });

    it("should use last # if multiple", () => {
      const result = parseHashMention("#javascript #react", 18);
      expect(result).toEqual({
        mention: "react",
        startIndex: 12,
        endIndex: 18,
        type: "tag",
        symbol: "#",
      });
    });
  });

  describe("parseSpecialMention", () => {
    it("should parse valid READ mention", () => {
      const result = parseSpecialMention("Search $READ", 12);
      expect(result).toEqual({
        mention: "READ",
        startIndex: 7,
        endIndex: 12,
        type: "special",
        symbol: "$",
      });
    });

    it("should parse valid UNREAD mention", () => {
      const result = parseSpecialMention("Search $UNREAD", 14);
      expect(result).toEqual({
        mention: "UNREAD",
        startIndex: 7,
        endIndex: 14,
        type: "special",
        symbol: "$",
      });
    });

    it("should parse valid STAR mention", () => {
      const result = parseSpecialMention("Search $STAR", 12);
      expect(result).toEqual({
        mention: "STAR",
        startIndex: 7,
        endIndex: 12,
        type: "special",
        symbol: "$",
      });
    });

    it("should parse partial valid mentions", () => {
      const result = parseSpecialMention("Search $RE", 10);
      expect(result).toEqual({
        mention: "RE",
        startIndex: 7,
        endIndex: 10,
        type: "special",
        symbol: "$",
      });
    });

    it("should handle case insensitivity", () => {
      const result = parseSpecialMention("Search $read", 12);
      expect(result).toEqual({
        mention: "read",
        startIndex: 7,
        endIndex: 12,
        type: "special",
        symbol: "$",
      });
    });

    it("should return null for invalid special filters", () => {
      const result = parseSpecialMention("Search $INVALID", 15);
      expect(result).toBeNull();
    });

    it("should return null if no $ found", () => {
      const result = parseSpecialMention("Search READ", 11);
      expect(result).toBeNull();
    });

    it("should return null if space after $", () => {
      const result = parseSpecialMention("Search $ READ", 13);
      expect(result).toBeNull();
    });

    it("should handle $ at beginning", () => {
      const result = parseSpecialMention("$READ", 5);
      expect(result).toEqual({
        mention: "READ",
        startIndex: 0,
        endIndex: 5,
        type: "special",
        symbol: "$",
      });
    });

    it("should handle empty mention", () => {
      const result = parseSpecialMention("Search $", 8);
      expect(result).toEqual({
        mention: "",
        startIndex: 7,
        endIndex: 8,
        type: "special",
        symbol: "$",
      });
    });

    it("should use last $ if multiple", () => {
      const result = parseSpecialMention("$READ $STAR", 11);
      expect(result).toEqual({
        mention: "STAR",
        startIndex: 6,
        endIndex: 11,
        type: "special",
        symbol: "$",
      });
    });
  });

  describe("parseMention", () => {
    it("should prioritize $ over # and @", () => {
      const result = parseMention("Search $READ #tag @type", 12);
      expect(result?.type).toBe("special");
      expect(result?.symbol).toBe("$");
    });

    it("should prioritize # over @", () => {
      const result = parseMention("Search #tag @type", 11);
      expect(result?.type).toBe("tag");
      expect(result?.symbol).toBe("#");
    });

    it("should parse @ if no # or $", () => {
      const result = parseMention("Search @type", 12);
      expect(result?.type).toBe("type");
      expect(result?.symbol).toBe("@");
    });

    it("should return null if no mentions found", () => {
      const result = parseMention("Search query", 12);
      expect(result).toBeNull();
    });

    it("should handle cursor positioning correctly", () => {
      const result = parseMention("Search @type #tag $READ", 12);
      expect(result?.type).toBe("type");
      expect(result?.mention).toBe("type");
    });
  });

  describe("removeAtMention", () => {
    it("should remove @ mention from string", () => {
      const result = removeAtMention("Search @PAGE content", 7, 12);
      expect(result).toBe("Search  content");
    });

    it("should remove @ mention at beginning", () => {
      const result = removeAtMention("@PAGE content", 0, 5);
      expect(result).toBe(" content");
    });

    it("should remove @ mention at end", () => {
      const result = removeAtMention("Search @PAGE", 7, 12);
      expect(result).toBe("Search ");
    });

    it("should handle empty mention", () => {
      const result = removeAtMention("Search @", 7, 8);
      expect(result).toBe("Search ");
    });
  });

  describe("removeMention", () => {
    it("should remove mention from string", () => {
      const result = removeMention("Search @PAGE content", 7, 12);
      expect(result).toBe("Search  content");
    });

    it("should remove mention at beginning", () => {
      const result = removeMention("@PAGE content", 0, 5);
      expect(result).toBe(" content");
    });

    it("should remove mention at end", () => {
      const result = removeMention("Search @PAGE", 7, 12);
      expect(result).toBe("Search ");
    });

    it("should handle zero-length removal", () => {
      const result = removeMention("Search content", 7, 7);
      expect(result).toBe("Search content");
    });

    it("should handle full string removal", () => {
      const result = removeMention("@PAGE", 0, 5);
      expect(result).toBe("");
    });
  });

  describe("getTypeDisplayName", () => {
    it("should return correct display names for all types", () => {
      expect(getTypeDisplayName(BookmarkType.VIDEO)).toBe("Video");
      expect(getTypeDisplayName(BookmarkType.PAGE)).toBe("Page");
      expect(getTypeDisplayName(BookmarkType.IMAGE)).toBe("Image");
      expect(getTypeDisplayName(BookmarkType.YOUTUBE)).toBe("YouTube");
      expect(getTypeDisplayName(BookmarkType.TWEET)).toBe("Tweet");
      expect(getTypeDisplayName(BookmarkType.ARTICLE)).toBe("Article");
      expect(getTypeDisplayName(BookmarkType.PDF)).toBe("PDF");
    });

    it("should fallback to original type if not found", () => {
      const unknownType = "UNKNOWN" as BookmarkType;
      expect(getTypeDisplayName(unknownType)).toBe("UNKNOWN");
    });
  });

  describe("getTypeColor", () => {
    it("should return color classes for all types", () => {
      expect(getTypeColor(BookmarkType.VIDEO)).toContain("bg-red-100");
      expect(getTypeColor(BookmarkType.PAGE)).toContain("bg-gray-100");
      expect(getTypeColor(BookmarkType.IMAGE)).toContain("bg-purple-100");
      expect(getTypeColor(BookmarkType.YOUTUBE)).toContain("bg-red-100");
      expect(getTypeColor(BookmarkType.TWEET)).toContain("bg-blue-100");
      expect(getTypeColor(BookmarkType.ARTICLE)).toContain("bg-orange-100");
      expect(getTypeColor(BookmarkType.PDF)).toContain("bg-red-100");
    });

    it("should return default color for unknown types", () => {
      const unknownType = "UNKNOWN" as BookmarkType;
      const result = getTypeColor(unknownType);
      expect(result).toContain("bg-gray-100");
    });

    it("should include dark mode classes", () => {
      const result = getTypeColor(BookmarkType.VIDEO);
      expect(result).toContain("dark:bg-red-900/20");
      expect(result).toContain("dark:text-red-400");
    });

    it("should include hover classes", () => {
      const result = getTypeColor(BookmarkType.VIDEO);
      expect(result).toContain("hover:bg-red-200");
      expect(result).toContain("dark:hover:bg-red-900/30");
    });
  });

  describe("getSpecialFilterDisplayName", () => {
    it("should return correct display names for special filters", () => {
      expect(getSpecialFilterDisplayName("READ")).toBe("Read");
      expect(getSpecialFilterDisplayName("UNREAD")).toBe("Unread");
      expect(getSpecialFilterDisplayName("STAR")).toBe("Starred");
    });

    it("should handle lowercase input", () => {
      expect(getSpecialFilterDisplayName("read")).toBe("Read");
      expect(getSpecialFilterDisplayName("unread")).toBe("Unread");
      expect(getSpecialFilterDisplayName("star")).toBe("Starred");
    });

    it("should handle mixed case input", () => {
      expect(getSpecialFilterDisplayName("Read")).toBe("Read");
      expect(getSpecialFilterDisplayName("UnRead")).toBe("Unread");
      expect(getSpecialFilterDisplayName("StAr")).toBe("Starred");
    });

    it("should fallback to original filter if not found", () => {
      expect(getSpecialFilterDisplayName("UNKNOWN")).toBe("UNKNOWN");
      expect(getSpecialFilterDisplayName("unknown")).toBe("unknown");
    });
  });

  describe("getSpecialFilterColor", () => {
    it("should return color classes for all special filters", () => {
      expect(getSpecialFilterColor("READ")).toContain("bg-green-100");
      expect(getSpecialFilterColor("UNREAD")).toContain("bg-yellow-100");
      expect(getSpecialFilterColor("STAR")).toContain("bg-purple-100");
    });

    it("should handle lowercase input", () => {
      expect(getSpecialFilterColor("read")).toContain("bg-green-100");
      expect(getSpecialFilterColor("unread")).toContain("bg-yellow-100");
      expect(getSpecialFilterColor("star")).toContain("bg-purple-100");
    });

    it("should handle mixed case input", () => {
      expect(getSpecialFilterColor("Read")).toContain("bg-green-100");
      expect(getSpecialFilterColor("UnRead")).toContain("bg-yellow-100");
      expect(getSpecialFilterColor("StAr")).toContain("bg-purple-100");
    });

    it("should return default color for unknown filters", () => {
      const result = getSpecialFilterColor("UNKNOWN");
      expect(result).toContain("bg-gray-100");
    });

    it("should include dark mode classes", () => {
      const result = getSpecialFilterColor("READ");
      expect(result).toContain("dark:bg-green-900/20");
      expect(result).toContain("dark:text-green-400");
    });

    it("should include hover classes", () => {
      const result = getSpecialFilterColor("READ");
      expect(result).toContain("hover:bg-green-200");
      expect(result).toContain("dark:hover:bg-green-900/30");
    });
  });
});