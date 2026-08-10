import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..");

function readProjectFile(relativePath: string) {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

describe("Gemini model configuration", () => {
  it("uses Gemini Flash-Lite for cheap generation and Gemini 3.1 Pro for normal generation", () => {
    const content = readProjectFile("../../packages/backend/convex/processing/gemini.ts");

    expect(content).toContain('cheap: "gemini-3.1-flash-lite"');
    expect(content).toContain('normal: "gemini-3.1-pro-preview"');
  });

  it("uses the central normal Gemini model for chat", () => {
    const content = readProjectFile("../../packages/backend/convex/chat/stream.ts");

    expect(content).toContain('google("gemini-3.1-pro-preview")');
  });

  it("keeps Gemini embeddings on the 1536-dimension Convex vector index", () => {
    const format = readProjectFile(
      "../../packages/backend/convex/processing/embedding_format.ts",
    );
    const schema = readProjectFile("../../packages/backend/convex/schema.ts");

    expect(format).toContain('EMBEDDING_MODEL = "gemini-embedding-2"');
    expect(format).toContain("EMBEDDING_DIMENSIONS = 1536");
    expect(format).toContain(
      "EMBEDDING_MODEL_KEY = `${EMBEDDING_MODEL}:${EMBEDDING_DIMENSIONS}:${EMBEDDING_PROMPT_VERSION}`",
    );
    expect(format).toContain('EMBEDDING_PROMPT_VERSION = "search-result-v1"');
    expect(schema).toContain("dimensions: 1536");
  });

  it("uses matched Gemini Embeddings 2 prompt formats without unsupported taskType options", () => {
    const embeddings = readProjectFile(
      "../../packages/backend/convex/processing/embeddings.ts",
    );
    const format = readProjectFile(
      "../../packages/backend/convex/processing/embedding_format.ts",
    );
    const search = readProjectFile(
      "../../packages/backend/convex/search/actions.ts",
    );

    expect(format).toContain("task: search result | query: ${text}");
    expect(format).toContain(
      'title: ${title?.trim() || "none"} | text: ${text}',
    );
    expect(embeddings).not.toContain("taskType");
    expect(search).not.toContain("taskType");
  });
});
