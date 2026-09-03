import { describe, expect, it } from "vitest";
import {
  buildAccountDeletedEmail,
  buildDeleteAccountVerificationEmail,
} from "./delete-account";

describe("delete account emails", () => {
  it("puts the Better Auth confirmation URL in the verification email", () => {
    const url =
      "https://saveit.now/api/auth/delete-user/callback?token=abc&callbackURL=%2Fgoodbye";
    const email = buildDeleteAccountVerificationEmail(url);

    expect(email.actionUrl).toBe(url);
    expect(email.actionLabel).toBe("Delete my account");
    expect(email.subject.toLowerCase()).toContain("deletion");
  });

  it("sends a confirmation after the account is gone", () => {
    const email = buildAccountDeletedEmail();

    expect(email.actionUrl).toBeUndefined();
    expect(email.subject.toLowerCase()).toContain("deleted");
    expect(email.description).toContain("help@saveit.now");
  });
});
