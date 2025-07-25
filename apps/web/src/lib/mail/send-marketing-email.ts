import { getServerUrl } from "@/lib/server-url";
import { prisma } from "@workspace/database";
import MarkdownEmail from "emails/markdown.emails";
import { sendEmail } from "./send-email";

type SendMarketingEmailParams = {
  userId: string;
  to: string;
  subject: string;
  preview: string;
  text: string;
};

export class UserUnsubscribedError extends Error {
  constructor(userId: string, email: string) {
    super(`User ${userId} (${email}) has unsubscribed from marketing emails`);
    this.name = "UserUnsubscribedError";
  }
}

/**
 * Adds unsubscribe link to email content
 */
const addUnsubscribeLink = (content: string, userId: string): string => {
  const unsubscribeUrl = `${getServerUrl()}/unsubscribe/${userId}`;
  const unsubscribeText = `\n\n---\n\n[Unsubscribe from marketing emails](${unsubscribeUrl})`;

  return content + unsubscribeText;
};

/**
 * Send a marketing email to a user, but only if they haven't unsubscribed.
 * Automatically adds unsubscribe link to email content.
 * Throws UserUnsubscribedError if the user has unsubscribed.
 */
export const sendMarketingEmail = async (params: SendMarketingEmailParams) => {
  const { userId } = params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, unsubscribed: true },
  });

  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }

  if (user.unsubscribed) {
    throw new UserUnsubscribedError(userId, user.email);
  }

  return await sendEmail({
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: MarkdownEmail({
      markdown: addUnsubscribeLink(params.text, userId),
      preview: params.preview,
    }),
  });
};
