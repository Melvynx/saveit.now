import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

export const EMAIL_OTP_COOLDOWN_MS = 60 * 1000;
export const EMAIL_OTP_WINDOW_MS = 24 * 60 * 60 * 1000;
export const EMAIL_OTP_WINDOW_MAX = 5;

type EmailOtpRateLimitState = {
  lastSentAt: number;
  windowStartedAt: number;
  windowCount: number;
};

type EmailOtpRateLimitDecision =
  | {
      allowed: false;
      retryAfterSeconds: number;
    }
  | {
      allowed: true;
      nextState: EmailOtpRateLimitState & { expiresAt: number };
    };

const retryAfterSeconds = (milliseconds: number) =>
  Math.max(1, Math.ceil(milliseconds / 1000));

export function evaluateEmailOtpRateLimit(
  current: EmailOtpRateLimitState | null,
  now: number,
): EmailOtpRateLimitDecision {
  if (!current) {
    return {
      allowed: true,
      nextState: {
        lastSentAt: now,
        windowStartedAt: now,
        windowCount: 1,
        expiresAt: now + EMAIL_OTP_WINDOW_MS,
      },
    };
  }

  const cooldownRemaining = current.lastSentAt + EMAIL_OTP_COOLDOWN_MS - now;
  if (cooldownRemaining > 0) {
    return {
      allowed: false,
      retryAfterSeconds: retryAfterSeconds(cooldownRemaining),
    };
  }

  const windowRemaining = current.windowStartedAt + EMAIL_OTP_WINDOW_MS - now;
  if (windowRemaining > 0 && current.windowCount >= EMAIL_OTP_WINDOW_MAX) {
    return {
      allowed: false,
      retryAfterSeconds: retryAfterSeconds(windowRemaining),
    };
  }

  const windowExpired = windowRemaining <= 0;
  const windowStartedAt = windowExpired ? now : current.windowStartedAt;

  return {
    allowed: true,
    nextState: {
      lastSentAt: now,
      windowStartedAt,
      windowCount: windowExpired ? 1 : current.windowCount + 1,
      expiresAt: windowStartedAt + EMAIL_OTP_WINDOW_MS,
    },
  };
}

/**
 * Atomically consumes one recipient-level OTP send allowance. Concurrent
 * requests for the same hash conflict on the same indexed row and are retried
 * by Convex, preventing burst races from overshooting the limit.
 */
export const consumeEmailOtpSend = internalMutation({
  args: { emailHash: v.string() },
  handler: async (ctx, { emailHash }) => {
    const now = Date.now();
    const current = await ctx.db
      .query("authEmailOtpRateLimits")
      .withIndex("by_email_hash", (query) => query.eq("emailHash", emailHash))
      .unique();

    const decision = evaluateEmailOtpRateLimit(current, now);
    if (!decision.allowed) return decision;

    if (current) {
      await ctx.db.patch(current._id, decision.nextState);
    } else {
      await ctx.db.insert("authEmailOtpRateLimits", {
        emailHash,
        ...decision.nextState,
      });
    }

    return { allowed: true as const, retryAfterSeconds: 0 };
  },
});

const CLEANUP_BATCH_SIZE = 500;

export const cleanupEmailOtpRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("authEmailOtpRateLimits")
      .withIndex("by_expires_at", (query) => query.lt("expiresAt", Date.now()))
      .take(CLEANUP_BATCH_SIZE);

    for (const entry of expired) {
      await ctx.db.delete(entry._id);
    }

    if (expired.length === CLEANUP_BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.auth.rateLimit.cleanupEmailOtpRateLimits,
        {},
      );
    }

    return expired.length;
  },
});
