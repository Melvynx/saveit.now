"use node";

import { render } from "@react-email/render";
import { v } from "convex/values";
import * as React from "react";
import { components, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { MarkdownEmail } from "./templates";
import crypto from "node:crypto";

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

    const html = await render(
      React.createElement(MarkdownEmail, {
        markdown,
        preview: args.preview,
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

// ---------------------------------------------------------------------------
// Generic markdown email (used by all marketing drips).
// ---------------------------------------------------------------------------
export const sendMarkdownEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    markdown: v.string(),
    preview: v.optional(v.string()),
    from: v.optional(v.string()),
    disabledSignature: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const subject =
      process.env.NODE_ENV === "development"
        ? `[DEV] ${args.subject}`
        : args.subject;

    const html = await render(
      React.createElement(MarkdownEmail, {
        markdown: args.markdown,
        preview: args.preview,
        disabledSignature: args.disabledSignature ?? false,
      }),
    );

    await ctx.runMutation(internal.email.mutations.sendEmail, {
      to: args.to,
      subject,
      html,
      from: args.from,
    });

    return null;
  },
});

// ---------------------------------------------------------------------------
// Marketing email (guarded by unsubscribe flag, appends signed unsubscribe
// link — Phase 17 B13 security fix).
// ---------------------------------------------------------------------------
export const sendMarketingEmail = internalAction({
  args: {
    userId: v.string(),
    to: v.string(),
    subject: v.string(),
    text: v.string(),
    preview: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Fetch user to check unsubscribed flag.
    const user = await ctx.runQuery(
      components.betterAuth.data.getUserById,
      { userId: args.userId },
    );

    // If user was deleted during a long drip chain, log and return gracefully.
    if (!user) {
      console.log("[email.sendMarketingEmail] user not found — skipping", {
        userId: args.userId,
      });
      return null;
    }

    // Unsubscribe guard — return early (no throw) so the scheduler chain
    // continues gracefully on subsequent steps.
    if (user.unsubscribed === true) {
      console.log("[email.sendMarketingEmail] user is unsubscribed — skipping", {
        userId: args.userId,
        to: args.to,
      });
      return null;
    }

    // Append HMAC-signed unsubscribe link (Phase 17 B13).
    const siteUrl = process.env.SITE_URL ?? "https://saveit.now";
    const secret = process.env.BETTER_AUTH_SECRET ?? "";
    const timestamp = Date.now().toString();
    const token = crypto
      .createHmac("sha256", secret)
      .update(`${args.userId}:${timestamp}`)
      .digest("hex");

    const unsubscribeUrl = `${siteUrl}/unsubscribe/${args.userId}?token=${token}&ts=${timestamp}`;
    const contentWithLink =
      args.text +
      `\n\n---\n\n[Unsubscribe from marketing emails](${unsubscribeUrl})`;

    await ctx.runAction(internal.email.actions.sendMarkdownEmail, {
      to: args.to,
      subject: args.subject,
      markdown: contentWithLink,
      preview: args.preview,
    });

    return null;
  },
});
