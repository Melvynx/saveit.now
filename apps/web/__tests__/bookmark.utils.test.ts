import { describe, it, expect } from "vitest";
import { chunkMarkdown } from "../src/lib/inngest/bookmark.utils";

describe("bookmark.utils", () => {
  describe("chunkMarkdown", () => {
    it("should return single chunk for short text", () => {
      const text = "This is a short text.";
      const chunks = chunkMarkdown(text);
      expect(chunks).toEqual([text]);
    });

    it("should split text at default max length", () => {
      const text = "a".repeat(1500);
      const chunks = chunkMarkdown(text);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toHaveLength(1000);
      expect(chunks[1]).toHaveLength(500);
    });

    it("should split text at custom max length", () => {
      const text = "a".repeat(150);
      const chunks = chunkMarkdown(text, 100);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toHaveLength(100);
      expect(chunks[1]).toHaveLength(50);
    });

    it("should prefer splitting at newlines", () => {
      const text = "a".repeat(800) + "\n" + "b".repeat(800);
      const chunks = chunkMarkdown(text, 1000);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toBe("a".repeat(800));
      expect(chunks[1]).toBe("b".repeat(800));
    });

    it("should not split at newlines if chunk would be too small", () => {
      const text = "a".repeat(100) + "\n" + "b".repeat(900);
      const chunks = chunkMarkdown(text, 1000);
      // Should not split at newline because 100 < 200, so goes to next chunk
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toBe("a".repeat(100) + "\n" + "b".repeat(899));
      expect(chunks[1]).toBe("b".repeat(1));
    });

    it("should require minimum chunk size of 200 for newline splitting", () => {
      const text = "a".repeat(150) + "\n" + "b".repeat(850);
      const chunks = chunkMarkdown(text, 1000);
      // Should not split at newline because 150 < 200, so goes to next chunk
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toBe("a".repeat(150) + "\n" + "b".repeat(849));
      expect(chunks[1]).toBe("b".repeat(1));
    });

    it("should split exactly at 200 chars for newline", () => {
      const text = "a".repeat(200) + "\n" + "b".repeat(800);
      const chunks = chunkMarkdown(text, 1000);
      expect(chunks).toHaveLength(2);
      // The function won't split at exactly 200 chars because nl > start + 200 would be false
      expect(chunks[0]).toBe("a".repeat(200) + "\n" + "b".repeat(799));
      expect(chunks[1]).toBe("b".repeat(1));
    });

    it("should prefer splitting at sentence end", () => {
      const text = "a".repeat(1000) + "This is a sentence. More text follows.";
      const chunks = chunkMarkdown(text, 1000);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toBe("a".repeat(1000) + "This is a sentence.");
      expect(chunks[1]).toBe("More text follows.");
    });

    it("should not split at sentence end if too far", () => {
      const text = "a".repeat(1000) + "b".repeat(200) + ". More text.";
      const chunks = chunkMarkdown(text, 1000);
      // Should not split at sentence end because 200 > 120
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toBe("a".repeat(1000));
      expect(chunks[1]).toBe("b".repeat(200) + ". More text.");
    });

    it("should split at sentence end within 120 chars", () => {
      const text = "a".repeat(1000) + "b".repeat(50) + ". More text.";
      const chunks = chunkMarkdown(text, 1000);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toBe("a".repeat(1000) + "b".repeat(50) + ".");
      expect(chunks[1]).toBe("More text.");
    });

    it("should handle multiple newlines", () => {
      const text = "a".repeat(400) + "\n\n" + "b".repeat(400) + "\n" + "c".repeat(400);
      const chunks = chunkMarkdown(text, 1000);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toBe("a".repeat(400) + "\n\n" + "b".repeat(400));
      expect(chunks[1]).toBe("c".repeat(400));
    });

    it("should handle text with no newlines or periods", () => {
      const text = "a".repeat(1500);
      const chunks = chunkMarkdown(text, 1000);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toBe("a".repeat(1000));
      expect(chunks[1]).toBe("a".repeat(500));
    });

    it("should handle empty string", () => {
      const chunks = chunkMarkdown("");
      expect(chunks).toEqual([]);
    });

    it("should handle whitespace-only string", () => {
      const text = "   \n\n   ";
      const chunks = chunkMarkdown(text);
      expect(chunks).toEqual([""]);
    });

    it("should trim chunks", () => {
      const text = "  first chunk  \n  second chunk  ";
      const chunks = chunkMarkdown(text, 15);
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toBe("first chunk");
      expect(chunks[1]).toBe("second chunk");
      expect(chunks[2]).toBe("");
    });

    it("should handle complex markdown with mixed content", () => {
      const text = `# Header 1
This is a paragraph with some content.

## Header 2
- List item 1
- List item 2

Another paragraph with more content.

\`\`\`javascript
console.log("code block");
\`\`\`

Final paragraph.`;
      
      const chunks = chunkMarkdown(text, 100);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.join("")).toContain("Header 1");
      expect(chunks.join("")).toContain("Final paragraph.");
    });

    it("should handle text with only periods", () => {
      const text = ".".repeat(1500);
      const chunks = chunkMarkdown(text, 1000);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toBe(".".repeat(1001)); // 1000 + 1 for the period
      expect(chunks[1]).toBe(".".repeat(499));
    });

    it("should handle text ending with newline", () => {
      const text = "a".repeat(800) + "\n";
      const chunks = chunkMarkdown(text, 1000);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toBe("a".repeat(800));
      expect(chunks[1]).toBe("");
    });

    it("should handle text ending with period", () => {
      const text = "a".repeat(800) + ".";
      const chunks = chunkMarkdown(text, 1000);
      expect(chunks).toEqual([text]);
    });

    it("should handle very small max length", () => {
      const text = "Hello world";
      const chunks = chunkMarkdown(text, 5);
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toBe("Hello");
      expect(chunks[1]).toBe("worl");
      expect(chunks[2]).toBe("d");
    });

    it("should handle max length of 1", () => {
      const text = "abc";
      const chunks = chunkMarkdown(text, 1);
      expect(chunks).toEqual(["a", "b", "c"]);
    });

    it("should handle newline at exact chunk boundary", () => {
      const text = "a".repeat(1000) + "\n" + "b".repeat(500);
      const chunks = chunkMarkdown(text, 1000);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toBe("a".repeat(1000));
      expect(chunks[1]).toBe("b".repeat(500));
    });

    it("should handle period at exact chunk boundary", () => {
      const text = "a".repeat(1000) + "." + "b".repeat(500);
      const chunks = chunkMarkdown(text, 1000);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toBe("a".repeat(1000) + ".");
      expect(chunks[1]).toBe("b".repeat(500));
    });

    it("should handle text with consecutive periods", () => {
      const text = "a".repeat(1000) + "..." + "b".repeat(500);
      const chunks = chunkMarkdown(text, 1000);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toBe("a".repeat(1000) + ".");
      expect(chunks[1]).toBe(".." + "b".repeat(500));
    });

    it("should handle newline preference over period", () => {
      const text = "a".repeat(800) + "\n" + "b".repeat(150) + "." + "c".repeat(200);
      const chunks = chunkMarkdown(text, 1000);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toBe("a".repeat(800));
      expect(chunks[1]).toBe("b".repeat(150) + "." + "c".repeat(200));
    });
  });
});