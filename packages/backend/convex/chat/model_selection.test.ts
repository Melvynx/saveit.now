import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actionsSource = readFileSync(
  new URL("./actions.ts", import.meta.url),
  "utf8",
);
const streamSource = readFileSync(
  new URL("./stream.ts", import.meta.url),
  "utf8",
);

describe("chat model selection", () => {
  it("routes both short title generations through the centralized cheap model", () => {
    expect(actionsSource).toContain(
      'import { GEMINI_MODEL_IDS } from "../processing/gemini";',
    );
    expect(
      actionsSource.match(/google\(GEMINI_MODEL_IDS\.cheap\)/g),
    ).toHaveLength(2);
    expect(actionsSource).not.toContain('google("gemini-3.1-pro-preview")');
  });

  it("keeps full streamed chat on Gemini Pro Preview", () => {
    expect(streamSource).toContain('google("gemini-3.1-pro-preview")');
  });
});
