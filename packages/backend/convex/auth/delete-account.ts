const APP_NAME = "SaveIt";

export type DeleteAccountEmailContent = {
  subject: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
  preview: string;
};

export function buildDeleteAccountVerificationEmail(
  url: string,
): DeleteAccountEmailContent {
  return {
    subject: `Confirm your ${APP_NAME} account deletion`,
    title: "Confirm account deletion",
    description:
      "You requested to delete your SaveIt.now account. Use the secure link below to confirm. If you did not request this, you can ignore this email.",
    actionLabel: "Delete my account",
    actionUrl: url,
    preview: `Confirm your ${APP_NAME} account deletion`,
  };
}

export function buildAccountDeletedEmail(): DeleteAccountEmailContent {
  return {
    subject: `Your ${APP_NAME} account has been deleted`,
    title: "Account deleted",
    description:
      "It's Melvyn, the founder of SaveIt.now. Your account has been permanently deleted. If you have any questions, reach out at help@saveit.now.",
    preview: `Your ${APP_NAME} account has been deleted`,
  };
}
