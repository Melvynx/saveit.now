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
    const embeddings = readProjectFile("../../packages/backend/convex/processing/embeddings.ts");
    const schema = readProjectFile("../../packages/backend/convex/schema.ts");

    expect(embeddings).toContain('EMBEDDING_MODEL = "gemini-embedding-2"');
    expect(embeddings).toContain("EMBEDDING_DIMENSIONS = 1536");
    expect(embeddings).toContain('EMBEDDING_MODEL_KEY = "gemini-embedding-2:1536"');
    expect(schema).toContain("dimensions: 1536");
  });

  it("sets distinct Gemini task types for document and query embeddings", () => {
    const content = readProjectFile("../../packages/backend/convex/processing/embeddings.ts");

    expect(content).toContain('taskType: "RETRIEVAL_DOCUMENT"');
    expect(content).toContain('taskType: "RETRIEVAL_QUERY"');
  });
});
