// Import from the ES module loader for Playwright compatibility
import { getOTPCodeFromDatabase as getOTP, cleanupVerificationRecords as cleanupRecords } from './database-loader.mjs';

/**
 * Get OTP verification code from database for given email
 */
export async function getOTPCodeFromDatabase(email: string): Promise<string> {
  return getOTP(email);
}

/**
 * Clean up verification records for test emails
 */
export async function cleanupVerificationRecords() {
  return cleanupRecords();
}
