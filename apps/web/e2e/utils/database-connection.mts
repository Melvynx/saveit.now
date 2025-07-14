import * as database from "@workspace/database";
const { prisma } = database;

export async function getOTPFromDatabase(
  email: string,
): Promise<string | null> {
  try {
    const verification = await prisma.verification.findFirst({
      where: {
        identifier: email,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("Verification:", verification);

    if (verification) {
      // The value format is "123456:0" - we need the first part (the OTP code)
      const otpCode = verification.value.split(":")[0];

      if (otpCode && otpCode.length === 6) {
        return otpCode;
      }
    }

    return null;
  } catch (error) {
    console.log(`Database query error: ${error}`);
    return null;
  }
}

export async function cleanupTestVerifications() {
  try {
    await prisma.verification.deleteMany({
      where: {
        identifier: {
          contains: "@playwright.dev",
        },
      },
    });

    console.log("Cleaned up test verification records");
  } catch (error) {
    console.log(`Database cleanup error: ${error}`);
  }
}
