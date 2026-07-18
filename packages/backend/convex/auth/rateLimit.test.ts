import { describe, expect, it } from "vitest";
import {
  EMAIL_OTP_COOLDOWN_MS,
  EMAIL_OTP_WINDOW_MAX,
  EMAIL_OTP_WINDOW_MS,
  evaluateEmailOtpRateLimit,
} from "./rateLimit";

describe("evaluateEmailOtpRateLimit", () => {
  it("allows the first send and starts a 24-hour window", () => {
    const decision = evaluateEmailOtpRateLimit(null, 1_000);

    expect(decision).toEqual({
      allowed: true,
      nextState: {
        lastSentAt: 1_000,
        windowStartedAt: 1_000,
        windowCount: 1,
        expiresAt: 1_000 + EMAIL_OTP_WINDOW_MS,
      },
    });
  });

  it("blocks repeat sends during the one-minute cooldown", () => {
    const decision = evaluateEmailOtpRateLimit(
      { lastSentAt: 1_000, windowStartedAt: 1_000, windowCount: 1 },
      1_000 + EMAIL_OTP_COOLDOWN_MS - 1,
    );

    expect(decision).toEqual({ allowed: false, retryAfterSeconds: 1 });
  });

  it("blocks the sixth send until the daily window expires", () => {
    const decision = evaluateEmailOtpRateLimit(
      {
        lastSentAt: 1_000,
        windowStartedAt: 1_000,
        windowCount: EMAIL_OTP_WINDOW_MAX,
      },
      1_000 + EMAIL_OTP_COOLDOWN_MS,
    );

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.retryAfterSeconds).toBe(
        (EMAIL_OTP_WINDOW_MS - EMAIL_OTP_COOLDOWN_MS) / 1000,
      );
    }
  });

  it("starts a fresh window after 24 hours", () => {
    const now = 1_000 + EMAIL_OTP_WINDOW_MS;
    const decision = evaluateEmailOtpRateLimit(
      {
        lastSentAt: 1_000,
        windowStartedAt: 1_000,
        windowCount: EMAIL_OTP_WINDOW_MAX,
      },
      now,
    );

    expect(decision).toEqual({
      allowed: true,
      nextState: {
        lastSentAt: now,
        windowStartedAt: now,
        windowCount: 1,
        expiresAt: now + EMAIL_OTP_WINDOW_MS,
      },
    });
  });
});
