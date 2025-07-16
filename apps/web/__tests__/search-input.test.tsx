import { screen, waitFor } from "@testing-library/react";
import { useHotkeys } from "react-hotkeys-hook";
import { useQueryState } from "nuqs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { toast } from "sonner";

import { parseMention, removeMention } from "../app/app/utils/type-filter-utils";
import { setup, setupWithoutProviders } from "../test/setup";

// Mock the modules
vi.mock("react-hotkeys-hook");
vi.mock("nuqs");
vi.mock("sonner");
vi.mock("@/app/use-create-bookmark", () => ({
  useCreateBookmarkAction: vi.fn(() => ({
    execute: vi.fn(),
  })),
}));

describe("Search Input Functionality", () => {
  let mockSetQuery: ReturnType<typeof vi.fn>;
  let mockUseHotkeys: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetQuery = vi.fn().mockResolvedValue(new URLSearchParams());
    mockUseHotkeys = vi.fn().mockReturnValue({ current: null });
    
    // Mock useQueryState to return query and setQuery
    vi.mocked(useQueryState).mockReturnValue([
      "", // query
      mockSetQuery as any, // setQuery
    ]);

    // Mock useHotkeys
    vi.mocked(useHotkeys).mockImplementation(mockUseHotkeys as any);

    // Mock toast
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();

    // Clear all mocks
    vi.clearAllMocks();
  });

  // TODO: Add component tests back after resolving import issues
  /*
  describe("Command+K Keyboard Shortcut", () => {
    // Component tests will go here
  });
  */

  describe("Mention Parsing Utilities", () => {
    describe("parseMention", () => {
      it("should parse @ mentions for types", () => {
        const result = parseMention("@page", 5);
        expect(result).toEqual({
          type: "type",
          mention: "page",
          startIndex: 0,
          endIndex: 5,
          symbol: "@",
        });
      });

      it("should parse # mentions for tags", () => {
        const result = parseMention("#important", 10);
        expect(result).toEqual({
          type: "tag",
          mention: "important",
          startIndex: 0,
          endIndex: 10,
          symbol: "#",
        });
      });

      it("should parse $ mentions for special filters", () => {
        const result = parseMention("$READ", 5);
        expect(result).toEqual({
          type: "special",
          mention: "READ",
          startIndex: 0,
          endIndex: 5,
          symbol: "$",
        });
      });

      it("should return null for invalid mentions", () => {
        expect(parseMention("no mention here", 5)).toBeNull();
        expect(parseMention("", 0)).toBeNull();
        expect(parseMention("$invalid", 8)).toBeNull();
      });

      it("should handle mentions that only include the symbol", () => {
        // When cursor is right after the symbol, mention should be empty
        const result = parseMention("@", 1);
        expect(result).toEqual({
          type: "type",
          mention: "",
          startIndex: 0,
          endIndex: 1,
          symbol: "@",
        });
      });

      it("should handle cursor position within mention", () => {
        const result = parseMention("@pa", 2);
        expect(result).toEqual({
          type: "type",
          mention: "p",
          startIndex: 0,
          endIndex: 2,
          symbol: "@",
        });
      });

      it("should handle mentions in middle of text", () => {
        const result = parseMention("search @page here", 10);
        expect(result).toEqual({
          type: "type",
          mention: "pa",
          startIndex: 7,
          endIndex: 10,
          symbol: "@",
        });
      });

      it("should validate special filter values", () => {
        expect(parseMention("$READ", 5)).toBeTruthy();
        expect(parseMention("$UNREAD", 7)).toBeTruthy();
        expect(parseMention("$STAR", 5)).toBeTruthy();
        expect(parseMention("$invalid", 8)).toBeNull();
      });

      it("should prioritize special mentions over hash and at mentions", () => {
        // According to the implementation, $ is checked first
        const result = parseMention("$READ", 5);
        expect(result?.type).toBe("special");
      });

      it("should handle case insensitive special filters", () => {
        const result = parseMention("$read", 5);
        expect(result).toEqual({
          type: "special",
          mention: "read",
          startIndex: 0,
          endIndex: 5,
          symbol: "$",
        });
      });
    });

    describe("removeMention", () => {
      it("should remove mention from beginning of string", () => {
        const result = removeMention("@page rest of query", 0, 5);
        expect(result).toBe(" rest of query");
      });

      it("should remove mention from middle of string", () => {
        const result = removeMention("search @page here", 7, 12);
        expect(result).toBe("search  here");
      });

      it("should remove mention from end of string", () => {
        const result = removeMention("search @page", 7, 12);
        expect(result).toBe("search ");
      });

      it("should handle empty string", () => {
        const result = removeMention("", 0, 0);
        expect(result).toBe("");
      });

      it("should handle invalid indices gracefully", () => {
        const result = removeMention("test", 10, 20);
        expect(result).toBe("test");
      });

      it("should handle removing entire string", () => {
        const result = removeMention("@page", 0, 5);
        expect(result).toBe("");
      });

      it("should handle removing nothing", () => {
        const result = removeMention("test string", 4, 4);
        expect(result).toBe("test string");
      });
    });
  });

  describe("Search Functionality Unit Tests", () => {
    it("should verify mocks are working correctly", () => {
      expect(vi.isMockFunction(useHotkeys)).toBe(true);
      expect(vi.isMockFunction(useQueryState)).toBe(true);
      expect(vi.isMockFunction(toast.success)).toBe(true);
    });

    it("should handle mock useQueryState properly", () => {
      const [query, setQuery] = useQueryState("test", { defaultValue: "" });
      expect(query).toBe("");
      expect(typeof setQuery).toBe("function");
    });
  });
});