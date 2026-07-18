import { describe, expect, it } from "vitest";
import { isAllowedWebOrigin, webCorsHeaders } from "./cors";

describe("web CORS policy", () => {
  it.each([
    "https://saveit.now",
    "https://app.saveit.now",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://saveit-now-preview-codelynx.vercel.app",
  ])("allows a first-party origin: %s", (origin) => {
    expect(isAllowedWebOrigin(origin)).toBe(true);
  });

  it.each([
    "https://evil.com",
    "https://saveit.now.evil.com",
    "null",
    "javascript:alert(1)",
  ])("rejects a non-first-party origin: %s", (origin) => {
    expect(isAllowedWebOrigin(origin)).toBe(false);
  });

  it("does not emit credentialed CORS headers for a rejected origin", () => {
    const headers = webCorsHeaders("https://evil.com", { credentials: true });

    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(headers["Access-Control-Allow-Credentials"]).toBeUndefined();
  });
});
