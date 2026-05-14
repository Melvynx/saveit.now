import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const clientSource = readFileSync(
  join(process.cwd(), "src/lib/inngest/client.ts"),
  "utf8",
);

describe("Inngest realtime middleware", () => {
  it("loads realtimeMiddleware from the middleware entrypoint", () => {
    expect(clientSource).toContain("@inngest/realtime/middleware");
    expect(clientSource).not.toContain('require("@inngest/realtime")');

    const { realtimeMiddleware } = require("@inngest/realtime/middleware");
    expect(typeof realtimeMiddleware).toBe("function");
  });
});
