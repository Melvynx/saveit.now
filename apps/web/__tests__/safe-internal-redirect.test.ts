import { describe, expect, it } from "vitest";
import { getSafeInternalRedirectUrl } from "../src/features/auth/safe-internal-redirect";

describe("getSafeInternalRedirectUrl", () => {
  it.each(["/start?intent=signup#offer", "/start?discount=100%25#offer"])(
    "preserves a safe internal path, query, and hash: %s",
    (redirectUrl) => {
      expect(getSafeInternalRedirectUrl(redirectUrl)).toBe(redirectUrl);
    },
  );

  it.each([
    undefined,
    "https://evil.example/",
    "//evil.example/",
    "/\\evil.example/",
    "/%5Cevil.example/",
    "/%2Fevil.example/",
    "/start\nnext",
  ])("falls back for an unsafe redirect: %s", (redirectUrl) => {
    expect(getSafeInternalRedirectUrl(redirectUrl)).toBe("/app");
  });
});
