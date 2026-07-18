import { describe, expect, it, vi } from "vitest";
import { completeOtpSignIn } from "../src/features/auth/complete-otp-sign-in";

describe("completeOtpSignIn", () => {
  it("hard-navigates after starting a session refresh", () => {
    const refreshSession = vi.fn().mockResolvedValue(undefined);
    const hardNavigate = vi.fn();

    completeOtpSignIn({
      refreshSession,
      redirectUrl: "/app",
      hardNavigate,
    });

    expect(refreshSession).toHaveBeenCalledOnce();
    expect(hardNavigate).toHaveBeenCalledWith("/app");
  });

  it("still hard-navigates when the session refresh rejects", async () => {
    const refreshSession = vi
      .fn()
      .mockRejectedValue(new Error("Temporary network failure"));
    const hardNavigate = vi.fn();

    completeOtpSignIn({
      refreshSession,
      redirectUrl: "/app?from=signup",
      hardNavigate,
    });

    await Promise.resolve();

    expect(hardNavigate).toHaveBeenCalledWith("/app?from=signup");
  });

  it("still hard-navigates when the session refresh throws synchronously", () => {
    const refreshSession = vi.fn(() => {
      throw new Error("Session client unavailable");
    });
    const hardNavigate = vi.fn();

    completeOtpSignIn({
      refreshSession,
      redirectUrl: "/start",
      hardNavigate,
    });

    expect(hardNavigate).toHaveBeenCalledWith("/start");
  });
});
