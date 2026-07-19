"use node";

import { render } from "@react-email/render";
import { v } from "convex/values";
import * as React from "react";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { MarkdownEmail } from "./templates";

// ---------------------------------------------------------------------------
// Auth transactional email (OTP, magic link, verification).
// Replaces the stub from Phase 01 bootstrap.
// ---------------------------------------------------------------------------
export const sendAuthEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    title: v.string(),
    description: v.string(),
    actionLabel: v.optional(v.string()),
    actionUrl: v.optional(v.string()),
    preview: v.optional(v.string()),
    otp: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Build markdown content from the structured auth email fields.
    const lines: string[] = [];

    lines.push(`## ${args.title}`);
    lines.push("");
    lines.push(args.description);

    if (args.otp) {
      lines.push("");
      lines.push(`Your one-time code: **${args.otp}**`);
    }

    if (args.actionUrl && args.actionLabel) {
      lines.push("");
      lines.push(`[${args.actionLabel}](${args.actionUrl})`);
    }

    const markdown = lines.join("\n");

    const subject =
      process.env.NODE_ENV === "development"
        ? `[DEV] ${args.subject}`
        : args.subject;
    const preview =
      args.preview?.trim() ||
      (args.otp ? `Your sign-in code is ${args.otp}.` : args.description);

    const html = await render(
      React.createElement(MarkdownEmail, {
        markdown,
        preview,
        disabledSignature: false,
      }),
    );

    await ctx.runMutation(internal.email.mutations.sendEmail, {
      to: args.to,
      subject,
      html,
    });

    return null;
  },
});
