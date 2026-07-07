import { Resend } from "@convex-dev/resend";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalMutation } from "../_generated/server";

// Instantiate once at module level — shared across all calls.
const resend = new Resend(components.resend, { testMode: false });

const DEFAULT_FROM =
  process.env.RESEND_EMAIL_FROM ??
  "Melvyn from SaveIt.now <help@re.saveit.now>";
const HELP_EMAIL = process.env.HELP_EMAIL ?? "help@saveit.now";

/**
 * Leaf-level email send via @convex-dev/resend component.
 * Playwright test guard: skip real send when `to` starts with "playwright-test-".
 */
export const sendEmail = internalMutation({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    from: v.optional(v.string()),
    replyTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Playwright test guard — do not send real emails to test recipients.
    if (args.to.startsWith("playwright-test-")) {
      console.log("[email.sendEmail] playwright-test recipient — skipped", {
        to: args.to,
        subject: args.subject,
      });
      return null;
    }

    const from = args.from ?? DEFAULT_FROM;
    const replyTo = args.replyTo ?? HELP_EMAIL;

    await resend.sendEmail(ctx, {
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo: [replyTo],
    });

    return null;
  },
});
