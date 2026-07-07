/**
 * Get OTP verification code from the configured Playwright environment.
 */
export async function getOTPCodeFromDatabase(email: string): Promise<string> {
  const code = process.env.PLAYWRIGHT_TEST_OTP_CODE;
  if (!code) {
    throw new Error(`PLAYWRIGHT_TEST_OTP_CODE must be set for ${email}`);
  }
  return code;
}

/**
 * Kept for older tests that still call cleanup after OTP flows.
 */
export async function cleanupVerificationRecords() {
  return undefined;
}
