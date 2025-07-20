import { prisma } from "@workspace/database";
import { sendEmail } from "./send-email";
import { getServerUrl } from "@/lib/server-url";

type SendMarketingEmailParams = Parameters<typeof sendEmail>[0] & {
  userId: string;
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
  const { userId, ...emailParams } = params;

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

  // Add unsubscribe link to text content
  const modifiedParams = {
    ...emailParams,
    text: emailParams.text ? addUnsubscribeLink(emailParams.text, userId) : undefined,
  };

  // If HTML is provided and is a React component, we'll need to modify the markdown
  if (typeof emailParams.html === "object" && emailParams.html && emailParams.html !== null && "props" in emailParams.html) {
    const htmlElement = emailParams.html as any;
    if (htmlElement.props && "markdown" in htmlElement.props && typeof htmlElement.props.markdown === "string") {
      modifiedParams.html = {
        ...htmlElement,
        props: {
          ...htmlElement.props,
          markdown: addUnsubscribeLink(htmlElement.props.markdown, userId),
        },
      };
    }
  }

  return await sendEmail(modifiedParams);
};