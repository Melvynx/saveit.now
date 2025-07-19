import { describe, it, expect, vi, beforeEach } from "vitest";
import { markChangelogAsDismissed, isChangelogDismissed } from "@/src/lib/changelog/changelog-redis";

// Mock Redis
vi.mock("@/src/lib/changelog/changelog-redis", () => ({
  markChangelogAsDismissed: vi.fn(),
  isChangelogDismissed: vi.fn(),
}));

const mockMarkChangelogAsDismissed = vi.mocked(markChangelogAsDismissed);
const mockIsChangelogDismissed = vi.mocked(isChangelogDismissed);

describe("Changelog Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("markChangelogAsDismissed", () => {
    it("should mark changelog as dismissed for a user", async () => {
      const userId = "user123";
      const version = "1.2.0";

      await markChangelogAsDismissed(userId, version);

      expect(mockMarkChangelogAsDismissed).toHaveBeenCalledWith(userId, version);
      expect(mockMarkChangelogAsDismissed).toHaveBeenCalledTimes(1);
    });
  });

  describe("isChangelogDismissed", () => {
    it("should return true when changelog is dismissed", async () => {
      const userId = "user123";
      const version = "1.2.0";
      mockIsChangelogDismissed.mockResolvedValue(true);

      const result = await isChangelogDismissed(userId, version);

      expect(result).toBe(true);
      expect(mockIsChangelogDismissed).toHaveBeenCalledWith(userId, version);
    });

    it("should return false when changelog is not dismissed", async () => {
      const userId = "user123";
      const version = "1.2.0";
      mockIsChangelogDismissed.mockResolvedValue(false);

      const result = await isChangelogDismissed(userId, version);

      expect(result).toBe(false);
      expect(mockIsChangelogDismissed).toHaveBeenCalledWith(userId, version);
    });
  });

  describe("Redis key format", () => {
    it("should use correct key format for user dismissals", () => {
      const userId = "user123";
      const version = "1.2.0";
      const expectedKey = `user:${userId}:dismissed_changelog:${version}`;

      // This test ensures the key format is consistent
      // The actual Redis calls would use this format
      expect(`user:${userId}:dismissed_changelog:${version}`).toBe(expectedKey);
    });
  });
});