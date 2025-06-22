import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { pretty, render } from "@react-email/render";
import { nanoid } from "nanoid";
import { resendMailAdapter } from "./resend";

type EmailParams = {
  from: string;
  to: string | string[];
  subject: string;

  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Attachment[];
  html: string;
};

type Attachment = {
  content?: string | Buffer;
  filename?: string | false | undefined;
  path?: string;
  contentType?: string;
};

export type MailAdapter = {
  send: (params: EmailParams) => Promise<
    | {
        error: null;
        data: {
          id: string;
        };
      }
    | {
        error: Error;
        data: null;
      }
  >;
};

/**
 * sendEmail will send an email using resend.
 * To avoid repeating the same "from" email, you can leave it empty and it will use the default one.
 * Also, in development, it will add "[DEV]" to the subject.
 * @param params[0] : payload
 * @param params[1] : options
 * @returns a promise of the email sent
 */

// If you use another mail adapter, you can replace the mailAdapter with your own
const mailAdapter: MailAdapter = resendMailAdapter;

type SendEmailParams = Omit<EmailParams, "from" | "html"> & {
  from?: string;
  html?: string | React.ReactElement;
};

export const sendEmail = async (params: SendEmailParams) => {
  if (env.NODE_ENV === "development") {
    params.subject = `[DEV] ${params.subject}`;
  }

  // Avoid sending emails to playwright-test emails
  if (
    Array.isArray(params.to)
      ? params.to.some((to) => to.startsWith("playwright-test-"))
      : params.to.startsWith("playwright-test-")
  ) {
    logger.info("[sendEmail] Sending email to playwright-test", {
      subject: params.subject,
      to: params.to,
    });

    return {
      error: null,
      data: {
        id: nanoid(),
      },
    };
  }

  let html = "";

  if (typeof params.html === "string") {
    html = params.html;
  } else {
    html = await pretty(await render(params.html));
  }

  const result = await mailAdapter.send({
    ...params,
    from: params.from ?? env.RESEND_EMAIL_FROM,
    html,
  });

  if (result.error) {
    logger.error("[sendEmail] Error", { result, subject: params.subject });
  }

  return result;
};
